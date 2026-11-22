const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../build');
const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const files = fs.readdirSync(path.join(root, 'dist')).filter(name=>!/\.(br|gz)$/.test(name)).sort();
const find = base => files.find(name => new RegExp('^' + base + '\\.[a-f0-9]{12}\\.').test(name));
assert.equal(files.length,5);
for (const base of ['app','theme','style','favicon']) assert(find(base));
assert.deepEqual([...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]), [find('theme'), find('app')]);
const bundle = fs.readFileSync(path.join(root, 'dist', find('app')), 'utf8');
assert(!bundle.includes('sourceMappingURL'));
assert(!bundle.includes('OPEN_METEO_API_KEY'));
async function checkPage(pathname, storage=new Map(), reloadOnly=false) {
const prior=storage.get('sol-planner-v1');
const nodes = new Map();
const timers = [];
const context2d = new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8ClampedArray([20,80,120,255])})}, {get:(o,k)=>o[k] || (()=>{})});
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { nodeType:1,tagName:'DIV',childNodes:[],dataset:{},style:{},value:'',textContent:'',innerHTML:'',attrs:{},checked:true,
    setPointerCapture(){},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},hasAttribute(k){return k in this.attrs;},
    addEventListener(k,fn){this[k]=fn;},checkValidity:()=>true,reportValidity:()=>true,getContext:()=>['panel-canvas','canvas'].includes(id)?context2d:null,clientWidth:700,clientHeight:470,
    querySelector:selector=>node(selector.replace(/^#/,'')),focus(){},click(){if(!this.disabled)this.onclick?.();},append(){},remove(){},after(){},replaceWith(){},prepend(){},insertBefore(){},contains:()=>false,classList:{add(){},remove(){},toggle:()=>false},showModal(){this.open=true;},close(){this.open=false;},
  });
  return nodes.get(id);
}
for (const match of html.matchAll(/id="([^"]+)"[^>]*?(?:value="([^"]*)")?[^>]*>/g)) node(match[1]);
for (const [id,value] of Object.entries({'energy-kwp':'3.6','energy-count':'6','energy-watts':'600','energy-loss':'20','energy-tilt':'15','energy-azimuth':'180','house-width':'8','house-length':'10','panel-count':'6','panel-floors':'1','panel-x':'0','panel-z':'0','house-bearing':'0','neighbor-left':'0','neighbor-right':'0'})) node(id).value=value;
let gpsSuccess,gpsFailure,exportedBlob;
const context = { document:{ body:node('body'),documentElement:node('html'),cookie:'',hidden:false,createElement:node,createElementNS:(ns,tag)=>node(tag),getElementById:node,querySelector:node,addEventListener(){} },
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},sessionStorage:{getItem:()=>null,setItem(){}},location:{protocol:'https:',pathname},
  navigator:{geolocation:{getCurrentPosition(success,failure){gpsSuccess=success;gpsFailure=failure;}}},
  matchMedia:()=>({matches:false,addEventListener(){}}),isSecureContext:true,
  addEventListener(){},removeEventListener(){},MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}},
  setInterval:fn=>{timers.push(fn);return timers.length;},clearInterval(){},setTimeout,clearTimeout,Date,Math,URLSearchParams,AbortController,AbortSignal,Response,DOMException,
  Blob,URL:{createObjectURL(blob){exportedBlob=blob;return 'blob:test-profile';},revokeObjectURL(){}},
  ImageData:class{constructor(data,width,height){Object.assign(this,{data,width,height});}},
  fetch:async()=>Response.json({error:'mock unavailable'},{status:503}),
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'dist',find('theme')),'utf8'),context);
vm.runInContext(bundle,context);
if(reloadOnly) {
  const saved=JSON.parse(prior);
  assert.equal(gpsSuccess,undefined,'Saved simulation location must survive instead of being overwritten by startup GPS');
  assert.equal(Number(node('house-bearing').value),saved.config.house);
  assert.equal(Number(node('panel-bearing').value),saved.config.bearing);
  assert.equal(Number(node('panel-slope').value),saved.config.tilt);
  assert.equal(Number(node('roof-type').value),saved.config.roof);
  assert.equal(Number(node('neighbor-right').value),saved.config.right);
  assert.equal(Number(node('house-length').value),saved.config.length);
  assert.equal(node('panel-zoom-label').textContent,`${Math.round(saved.view.zoom*100)}%`);
  const restored=JSON.parse(storage.get('sol-planner-v1'));
  assert.deepEqual(restored.config,saved.config);
  assert.deepEqual(restored.positions,saved.positions);
  assert.deepEqual(restored.location,saved.location);
  node('house-bearing').value=String((saved.config.house+20)%360);node('house-bearing').input();
  assert.equal(Number(node('panel-bearing').value),(saved.config.bearing+20)%360,'House rotation delta must start at restored bearing');
  return storage;
}
assert.equal(typeof gpsSuccess,'function','Startup must request GPS automatically');
gpsFailure({code:1});
assert.equal(node('header-gps').dataset.state,'error');
node('header-gps').onclick();
assert.equal(node('header-gps').dataset.state,'pending');
gpsSuccess({coords:{latitude:10.8231,longitude:106.6297,accuracy:10}});
assert.equal(node('header-gps').dataset.state,'success');
assert.match(node('rise-time').textContent,/\d{2}:\d{2}/);
assert.match(node('set-time').textContent,/\d{2}:\d{2}/);
node('time').input({target:{value:'600'}});
assert.equal(node('selected-time').textContent,'10:00');
if (pathname === '/sol-calculartor') {
  assert.equal(node('panel-planner').hidden,false);
  assert.equal(node('.compass-card').hidden,true);
  assert.equal(node('energy-open').href,'/');
  for(let i=0;i<5;i++)node('floor-add').onclick();
  assert.equal(Number(node('panel-floors').value),3);
  assert.equal(node('floor-add').disabled,true);
  node('panel-bearing').value='270';node('panel-bearing').input();
  assert.equal(Number(node('energy-azimuth').value),270);
  node('house-bearing').value='90';node('house-bearing').input();
  assert.equal(Number(node('energy-azimuth').value),0,'House rotation must rotate attached panel bearing');
  node('house-bearing').value='360';node('house-bearing').input();
  assert.equal(Number(node('energy-azimuth').value),270,'Full rotation must restore geographic bearing');
  for(const side of ['left','right']) {
    for(let i=0;i<7;i++)node('neighbor-'+side+'-add').onclick();
    assert.equal(Number(node('neighbor-'+side).value),5);
    assert.equal(node('neighbor-'+side+'-add').disabled,true);
  }
  node('panel-view-front').onclick();
  assert.equal(node('panel-follow').attrs['aria-pressed'],'false');
  context.compassState.active=true;context.compassState.ready=true;
  node('panel-follow').onclick();
  assert.equal(node('panel-follow').attrs['aria-pressed'],'true');
  assert.match(node('panel-view-status').textContent,/đang xoay theo/);
  node('date').value='2026-06-21';node('date').change();
  const juneRise=node('rise-time').textContent;
  node('date').value='2024-01-01';node('date').change();
  assert.equal(Number(node('year-day').max),366);
  const heldTime=node('time').value;
  node('year-day').input({target:{value:'60'}});
  assert.equal(node('date').value,'2024-02-29');
  assert.equal(node('time').value,heldTime,'Annual simulation preserves selected clock time');
  node('year-day').input({target:{value:'366'}});
  assert.equal(node('date').value,'2024-12-31');
  node('year-play').onclick();
  assert.equal(node('date').value,'2024-01-01','Restart annual playback at year start');
  timers[timers.length-1]();
  assert.equal(node('date').value,'2024-01-04');
  assert.equal(node('year-play').attrs['aria-pressed'],'true','Refresh must not stop annual playback');
  node('play').onclick();
  assert.equal(node('year-play').attrs['aria-pressed'],'false','Daily playback stops annual playback');

  node('date').value='2026-06-21';node('date').change();
  node('month').value='12';node('month').input();
  assert.match(node('date').value,/2026-12-21/);
  assert.notEqual(node('rise-time').textContent,juneRise,'Month must update sunrise on calculator');
  node('energy-tilt').value='35';node('energy-tilt').input();
  assert.equal(Number(node('panel-slope').value),35);
  for(let i=0;i<20;i++)node('panel-zoom-in').onclick();
  assert.equal(node('panel-zoom-label').textContent,'400%');
  assert.equal(node('panel-zoom-in').disabled,true);
  for(let i=0;i<30;i++)node('panel-zoom-out').onclick();
  assert.equal(node('panel-zoom-label').textContent,'50%');
  const beforePinch=parseInt(node('panel-zoom-label').textContent);
  node('panel-canvas').pointerdown({pointerType:'touch',pointerId:1,clientX:0,clientY:0});
  node('panel-canvas').pointerdown({pointerType:'touch',pointerId:2,clientX:100,clientY:0});
  node('panel-canvas').pointermove({pointerId:2,clientX:200,clientY:0});
  assert.equal(node('panel-zoom-label').textContent,`${beforePinch*2}%`);
  node('panel-canvas').pointercancel({pointerId:1});
  node('panel-canvas').pointerup({pointerId:2});
  node('panel-view-front').onclick();
  node('house-width').value='14';node('house-width').input();
  assert.equal(node('house-width-label').textContent,'14 m');
  node('house-length').value='30';node('house-length').input();
  assert.equal(node('house-length-label').textContent,'30 m');
  assert.equal(node('date-controls').hidden,true);
  assert.equal(node('.sun-times').hidden,true);
  assert.equal(node('.weather-card').hidden,true);
  node('energy-watts').value='700';node('energy-watts').input();
  assert.equal(Number(node('energy-kwp').value),Number(node('panel-count').value)*700/1000);
  assert.match(node('module-description').textContent,/2384 × rộng 1303/);
  node('energy-count').value='30';node('energy-count').change();
  assert.equal(Number(node('energy-count').value),Number(node('panel-count').value));
  assert.equal(Number(node('energy-kwp').value),Number(node('panel-count').value)*700/1000);
  node('energy-watts').value='600';node('energy-watts').input();
  node('energy-count').value='6';node('energy-count').change();
  const savedBeforeDraft=storage.get('sol-planner-v1');
  node('panel-arrange').onclick();
  const before=Number(node('panel-count').value);
  node('layout-add').onclick();
  node('layout-cancel').onclick();
  assert.equal(Number(node('panel-count').value),before,'Cancel must preserve committed layout');
  assert.equal(storage.get('sol-planner-v1'),savedBeforeDraft,'Canceled popup edits must not change saved simulation');
  node('panel-arrange').onclick();
  for(let i=0;i<40;i++)node('layout-add').onclick();
  node('layout-apply').onclick();
  assert.equal(Number(node('panel-count').value),30);
  assert.equal(node('panel-add').disabled,true);
  node('panel-remove').onclick();
  for(let i=0;i<40;i++)node('layout-remove').onclick();
  node('layout-apply').onclick();
  assert.equal(Number(node('panel-count').value),1);
  node('panel-arrange').onclick();node('layout-auto').onclick();
  node('layout-rotate').onclick();node('layout-apply').onclick();
  assert.equal(JSON.parse(storage.get('sol-planner-v1')).positions[0].rotation,90,'Applied panel rotation persists');
  node('panel-arrange').onclick();node('layout-rotate').onclick();node('layout-cancel').onclick();
  assert.equal(JSON.parse(storage.get('sol-planner-v1')).positions[0].rotation,90,'Cancel preserves committed rotation');

  assert.equal(node('panel-remove').disabled,true);
  node('planner-setting-group').value='planner-neighbors';node('planner-setting-group').change();
  assert.equal(node('planner-neighbors').hidden,false);
  node('planner-setting-group').value='planner-panels';
  node('planner-setting-group').change();
  assert.equal(node('planner-panels').hidden,false);
  assert.equal(node('planner-house').hidden,true);
  assert.equal(node('planner-location').hidden,true);
  node('planner-settings').open=true;
  node('planner-settings').keydown({key:'Escape'});
  assert.equal(node('planner-settings').open,false);
  node('roof-type').value='1';node('roof-type').input();
  assert.equal(Number(node('energy-tilt').value),35,'Roof style must preserve panel inclination');
  await node('panel-optimize-year').onclick();
  assert.match(node('panel-advice').textContent,/năm 2026/);
  assert.equal(Number(node('panel-slope').value),Number(node('energy-tilt').value));
  await node('panel-optimize').onclick();
  assert.equal(Number(node('panel-bearing').value),Number(node('energy-azimuth').value));
  const pendingSuggestion=node('panel-optimize').onclick();
  node('panel-bearing').value='123';node('panel-bearing').input();
  await pendingSuggestion;
  assert.equal(Number(node('panel-bearing').value),123,'Stale recommendation must not override newer edits');
  assert.equal(node('panel-optimize').disabled,false);
  assert.match(node('panel-advice').textContent,/thay đổi/);
  node('play').onclick();const tick=timers.at(-1);
  for(let i=0;i<500;i++)tick();
  assert.equal(node('selected-time').textContent,node('set-time').textContent);
  assert.equal(node('play').dataset.playing,'false');
  assert.equal(node('energy-result').hidden,true,'Draft change must invalidate forecast');
  node('planner-export').onclick();
  assert(exportedBlob,'Backup button must create a downloadable file');
  assert.match(node('a').download,/^sol-profile-.*\.json$/);
  const exported=JSON.parse(await exportedBlob.text());
  assert.deepEqual(exported.profile,JSON.parse(storage.get('sol-planner-v1')));
  const beforeImport=storage.get('sol-planner-v1');
  node('planner-import-file').files=[{size:5,text:async()=>'bad json'}];
  await node('planner-import-file').change();
  assert.equal(storage.get('sol-planner-v1'),beforeImport,'Invalid file must leave existing simulation intact');
  assert.match(node('planner-backup-status').textContent,/Không khôi phục/);
  node('planner-import-file').files=[{size:65537,text:async()=>{throw Error('Must reject before reading');}}];
  await node('planner-import-file').change();
  assert.match(node('planner-backup-status').textContent,/64 KB/);
  const imported=exported.profile;
  Object.assign(imported.config,{house:90,bearing:180,tilt:20,length:12,count:2,x:0,z:0});
  imported.positions=[{x:-2,z:0},{x:2,z:0}];
  imported.location={lat:20,lon:105,offset:7};
  imported.view={yaw:2,pitch:.6,zoom:1.5};
  imported.energy={kwp:1.2,loss:18,reserve:false};
  node('planner-import-file').files=[{size:2000,text:async()=>JSON.stringify(exported)}];
  await node('planner-import-file').change();
  assert.equal(Number(node('panel-count').value),2);
  assert.equal(Number(node('energy-kwp').value),1.2);
  assert.equal(node('panel-zoom-label').textContent,'150%');
  assert.deepEqual(JSON.parse(storage.get('sol-planner-v1')),imported,'Import must apply and persist the whole profile');
  assert.equal(node('planner-import-file').value,'','Same file can be selected again');
  assert.equal(node('planner-import').disabled,false);
  gpsSuccess({coords:{latitude:1,longitude:2}});
  assert.equal(Number(node('lat').value),20,'Late startup GPS must not overwrite imported location');

} else {
  assert.equal(node('.weather-card').hidden,true);
  assert.equal(context.onSolarLocationChanged,undefined,'Home must not initialize energy forecasts');
}
assert.equal(typeof context.lat,'undefined','App lexical state must remain inside bundle closure');
return storage;
}
(async()=>{
await checkPage('/');
const storage=await checkPage('/sol-calculartor');
await checkPage('/sol-calculartor',storage,true);
console.log('Production bundle checks passed: startup, simulation reload, canceled drafts, scene recommendations, stale-result rejection and time slider.');
})().catch(error=>{console.error(error);process.exitCode=1;});
