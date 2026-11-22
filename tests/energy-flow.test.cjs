const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const E=require('../dist/energy.js'),G=require('../dist/panel-geometry.js'),Solar=require('../dist/solar.js');
const nodes=new Map();
const $=id=>{if(!nodes.has(id))nodes.set(id,{value:'',checked:false,hidden:false,textContent:'',innerHTML:'',addEventListener(type,fn){this[type]=fn;},checkValidity:()=>true,reportValidity:()=>true,scrollIntoView(){}});return nodes.get(id);};
Object.entries({'energy-count':2,'energy-watts':600,'energy-kwp':1.2,'energy-tilt':0,'energy-azimuth':90,'energy-loss':20}).forEach(([key,v])=>$(key).value=v);
const config={width:8,length:10,count:2,watts:600,roof:0,bearing:90,tilt:0,floors:0,x:0,z:0,house:0,left:0,right:0,leftRoof:0,rightRoof:0};
let calls=0,release=null,lastQuery;
const start=Date.parse('2026-06-21T00:00:00Z')/1000-7*3600;
const payload={hourly_units:{global_tilted_irradiance:'W/m²',direct_normal_irradiance:'W/m²'},hourly:{time:Array.from({length:24},(_,i)=>start+(i+1)*3600),global_tilted_irradiance:Array(24).fill(100),direct_normal_irradiance:Array(24).fill(0),cloud_cover:Array(24).fill(100),rain:Array(24).fill(2),showers:Array(24).fill(0)}};
const ctx={$,Energy:E,PanelGeometry:G,Solar,isSolarCalculator:true,document:{getElementById:$,addEventListener(){}},localStorage:{},SolarProfile:{migrate:()=>null,write(){}},locationReady:true,lat:10,lon:106,offset:7,today:()=> '2026-06-21',getEnergyScene:()=>G.scene(config,[{x:-2,z:0},{x:2,z:0}]),URLSearchParams,Date,AbortController,setTimeout,clearTimeout,setInterval:()=>0,ForecastClient:{fetch:async query=>{calls++;lastQuery=query;if(release)await new Promise(resolve=>release.resolve=resolve);return {ok:true,json:async()=>payload};}}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require.resolve('../dist/energy-ui.js'),'utf8'),ctx);
const wait=()=>new Promise(r=>setTimeout(r,60));
(async()=>{
 assert.equal($('energy-reserve').checked,false);
 ctx.applyEnergySystem({losses:{temperature:0,wiring:0,soiling:0,other:0},inverter:{acKw:1,maxPvKw:2,efficiency:100,mpptCount:1,mpptMinV:100,mpptMaxV:500,mpptMaxA:30,operatingV:300}});
 $('energy-tilt').value=30; // Deliberately divergent legacy form draft.
 $('energy-form').submit({preventDefault(){}});await wait();
 assert.equal(lastQuery.get('tilt'),'0','Weather orientation must match shared scene');
 assert.equal(calls,1);assert(lastQuery.get('hourly').includes('direct_normal_irradiance'));
 assert.equal($('energy-result').hidden,false);assert.match($('energy-kwh').textContent,/2[,.]9/);
 assert.match($('energy-hourly').innerHTML,/MPPT/);assert.match($('energy-formula').textContent,/clipping AC/);
 assert.match($('energy-chart').innerHTML,/<svg/);
 assert.match($('energy-loss-table').innerHTML,/Bóng che/);
 assert.equal($('energy-dc-total').textContent,'2.88');
 assert.equal($('energy-ac-total').textContent,'2.88');
 $('energy-chart-hour').value='0';$('energy-chart-hour').oninput();
 assert.match($('energy-chart-reading').textContent,/0.12 kW/);
 $('energy-reserve').checked=true;$('energy-reserve').change();await wait();
 assert.match($('energy-kwh').textContent,/2[,.]2/,'Optional reserve is distinct from base estimate');
 release={};$('energy-form').submit({preventDefault(){}});await wait();
 ctx.invalidateSolarPrediction();assert.equal($('energy-preview').hidden,true);release.resolve();release=null;await wait();
 assert.equal($('energy-result').hidden,true,'Canceled forecast cannot publish stale scene output');
 // New configuration finishes before an older request resolves.
 $('energy-reserve').checked=false;
 release={};$('energy-form').submit({preventDefault(){}});await wait();
 const oldResolve=release.resolve;release=null;
 ctx.invalidateSolarPrediction();$('inverter-efficiency').value=50;
 $('energy-form').submit({preventDefault(){}});await wait();
 const newest=$('energy-kwh').textContent;
 assert.match(newest,/1[,.]4/);oldResolve();await wait();
 assert.equal($('energy-kwh').textContent,newest);
 // Geometry changed programmatically, without an input event.
 release={};$('energy-form').submit({preventDefault(){}});await wait();
 config.right=5;release.resolve();release=null;await wait();
 assert.equal($('energy-result').hidden,true,'Snapshot guard must reject silently changed geometry');
 $('mppt-max').value=50;$('energy-form').submit({preventDefault(){}});await wait();
 assert.match($('energy-status').textContent,/MPPT/);
 console.log('Energy UI flow passed: default reserve, DNI request, rendered hourly detail, optional reserve, invalid settings and stale-result rejection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
