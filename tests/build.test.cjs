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
function checkPage(pathname) {
const nodes = new Map();
const timers = [];
const context2d = new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k] || (()=>{})});
function node(id) {
  if (!nodes.has(id)) nodes.set(id, { nodeType:1,tagName:'DIV',childNodes:[],dataset:{},style:{},value:'',textContent:'',innerHTML:'',attrs:{},checked:true,
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},hasAttribute(k){return k in this.attrs;},
    addEventListener(k,fn){this[k]=fn;},checkValidity:()=>true,reportValidity:()=>true,getContext:()=>id==='panel-canvas'?context2d:null,clientWidth:700,clientHeight:470,
    append(){},after(){},replaceWith(){},prepend(){},insertBefore(){},contains:()=>false,classList:{add(){},remove(){},toggle:()=>false},showModal(){},close(){},
  });
  return nodes.get(id);
}
for (const match of html.matchAll(/id="([^"]+)"[^>]*?(?:value="([^"]*)")?[^>]*>/g)) node(match[1]);
for (const [id,value] of Object.entries({'energy-kwp':'11','energy-loss':'20','energy-tilt':'15','energy-azimuth':'180','panel-floors':'1','panel-x':'0','panel-z':'0','house-bearing':'0','neighbor-left':'0','neighbor-right':'0'})) node(id).value=value;
let gpsSuccess;
const context = { document:{ body:node('body'),documentElement:node('html'),cookie:'',hidden:false,createElement:node,getElementById:node,querySelector:node,addEventListener(){} },
  localStorage:{getItem:()=>null,setItem(){}},sessionStorage:{getItem:()=>null,setItem(){}},location:{protocol:'https:',pathname},
  navigator:{geolocation:{getCurrentPosition(success){gpsSuccess=success;}}},
  matchMedia:()=>({matches:false,addEventListener(){}}),isSecureContext:true,
  addEventListener(){},removeEventListener(){},MutationObserver:class{observe(){}disconnect(){}},ResizeObserver:class{observe(){}},
  setInterval:fn=>{timers.push(fn);return timers.length;},clearInterval(){},setTimeout,clearTimeout,Date,Math,URLSearchParams,AbortController,AbortSignal,Response,DOMException,
  fetch:async()=>Response.json({error:'mock unavailable'},{status:503}),
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'dist',find('theme')),'utf8'),context);
vm.runInContext(bundle,context);
assert.equal(typeof gpsSuccess,'function','Startup must request GPS automatically');
gpsSuccess({coords:{latitude:10.8231,longitude:106.6297,accuracy:10}});
assert.match(node('rise-time').textContent,/\d{2}:\d{2}/);
assert.match(node('set-time').textContent,/\d{2}:\d{2}/);
node('time').input({target:{value:'600'}});
assert.equal(node('selected-time').textContent,'10:00');
if (pathname === '/sol-calculartor') {
  assert.equal(node('panel-planner').hidden,false);
  assert.equal(node('.compass-card').hidden,false);
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
  node('panel-reset').onclick();
  assert.equal(node('panel-follow').attrs['aria-pressed'],'false');
  context.compassState.active=true;context.compassState.ready=true;
  node('panel-follow').onclick();
  assert.equal(node('panel-follow').attrs['aria-pressed'],'true');
  assert.match(node('panel-view-status').textContent,/đang xoay theo/);
  node('date').value='2026-06-21';node('date').change();
  const juneRise=node('rise-time').textContent;
  node('month').value='12';node('month').input();
  assert.match(node('date').value,/2026-12-21/);
  assert.notEqual(node('rise-time').textContent,juneRise,'Month must update sunrise on calculator');
  node('energy-tilt').value='35';node('energy-tilt').input();
  assert.equal(Number(node('panel-slope').value),35);
  node('panel-optimize').onclick();
  assert.equal(Number(node('panel-bearing').value),Number(node('energy-azimuth').value));
  node('play').onclick();const tick=timers.at(-1);
  for(let i=0;i<500;i++)tick();
  assert.equal(node('selected-time').textContent,node('set-time').textContent);
  assert.equal(node('play').dataset.playing,'false');
  assert.equal(node('energy-result').hidden,true,'Draft change must invalidate forecast');
} else {
  assert.equal(node('.weather-card').hidden,true);
  assert.equal(context.onSolarLocationChanged,undefined,'Home must not initialize energy forecasts');
}
assert.equal(typeof context.lat,'undefined','App lexical state must remain inside bundle closure');
}
checkPage('/');
checkPage('/sol-calculartor');
console.log('Production bundle checks passed: assets, no source maps, script startup, GPS, solar calculations and time slider.');
