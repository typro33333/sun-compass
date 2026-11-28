// P0 acceptance tests written before implementation (2026-11-22).
const assert=require('node:assert/strict'),fs=require('node:fs');
const G=require('./oracles/panel-geometry.cjs'),E=require('./oracles/energy.cjs');
const start=Date.parse('2026-06-21T00:00:00Z')/1000;
const config={width:14,length:12,count:2,watts:600,roof:0,bearing:90,tilt:60,floors:0,x:0,z:0,house:0,left:0,right:0,leftRoof:0,rightRoof:0};
const positions=[{x:-3,z:0},{x:3,z:0,rotation:90}];
const system={losses:{temperature:0,wiring:0,soiling:0,other:0},inverter:{acKw:10,maxPvKw:20,efficiency:100,mpptCount:2,mpptMinV:100,mpptMaxV:800,mpptMaxA:30,operatingV:400}};
const data=(gti=1000,dni=0)=>({time:[start+3600],global_tilted_irradiance:[gti],direct_normal_irradiance:[dni],cloud_cover:[100],rain:[2],showers:[0]});
const options=(c=config,sys=system)=>({...sys,scene:G.scene(c,positions),location:{lat:10,lon:106,offset:7},sunAt:()=>({azimuth:90,altitude:30})});
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
let failures=0;
function test(name,fn){try{fn();console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e.message);}}
test('weather reserve off by default',()=>assert(!/id="energy-reserve"[^>]*\bchecked/.test(fs.readFileSync(require.resolve('../dist/compass.html'),'utf8'))));
test('shared geometry and per-panel sampled area',()=>{
 const scene=G.scene({...config,right:2,rightRoof:1},positions);
 assert.equal(scene.modules.length,2);
 const exposure=G.exposure(scene,{azimuth:90,altitude:25});
 assert.equal(exposure.panels[0].cells.length,36);
 assert(exposure.panels[0].litFraction>exposure.panels[1].litFraction);
 exposure.panels.forEach(p=>near(p.litArea,p.area*p.litFraction));
 near(exposure.panels[0].area,2.384*1.134);
 const rotated=G.scene({...config,house:90,bearing:180,right:2,rightRoof:1},positions);
 const r=G.exposure(rotated,{azimuth:180,altitude:25});
 near(r.panels[0].litFraction,exposure.panels[0].litFraction);
});
test('no second weather loss; DC and AC agree at unity efficiency',()=>{
 const r=E.estimateSystem(data(),start,start+3600,options());near(r.dcKwh,1.2);near(r.kwh,1.2);
 assert.equal(r.hours[0].panels.length,2);near(r.hours[0].panels[0].dcKwh,.6);
});
test('partial shade affects direct only, preserves diffuse, is per panel/hour',()=>{
 const o=options({...config,right:2,rightRoof:1});
 const diffuse=E.estimateSystem(data(1000,0),start,start+3600,o);near(diffuse.kwh,1.2);
 const shaded=E.estimateSystem(data(1000,1000),start,start+3600,o);
 assert(shaded.kwh<diffuse.kwh && shaded.shadeLossKwh>0);
 assert(shaded.hours[0].panels[0].dcKwh>shaded.hours[0].panels[1].dcKwh);
});
test('0%, 50%, 100% geometric shade produces exact direct and mixed-light power',()=>{
 // Sun is normal to the panel: incidence = 1. Moving toward the east
 // neighbor puts respectively zero, three, or six sample columns in shadow.
 for(const [x,lit] of [[-3,1],[3,.5],[5,0]]) {
  const scene=G.scene({...config,count:1,right:2,rightRoof:1},[{x,z:0}]);
  const o={...system,scene,sunAt:()=>({azimuth:90,altitude:30})};
  for(const [dni,expectedKwh] of [[1000,.6*lit],[800,.12+.48*lit],[0,.6]]) {
   const samples=[];
   const r=E.estimateSystem(data(1000,dni),start,start+3600,{...o,onSample:s=>samples.push(s)});
   near(r.hours[0].panels[0].litFraction,lit);
   near(r.dcKwh,expectedKwh);near(r.kwh,expectedKwh);
   near(r.shadeLossKwh,.6-expectedKwh);
   near(r.hours[0].panels[0].shadeLossKwh,r.shadeLossKwh);
   assert.equal(samples.length,4);
   samples.forEach(s=>{near(s.dcKw[0],expectedKwh);near(s.acKw,expectedKwh);});
  }
 }
});
test('moving shadow is integrated per quarter hour, including a partial interval',()=>{
 const scene=G.scene({...config,count:1,right:2,rightRoof:1},[{x:3,z:0}]);
 const o={...system,scene,sunAt:t=>({azimuth:90,altitude:t<start+1800?30:80})};
 // First half-hour: 50% lit at incidence 1. Second: fully lit.
 const r=E.estimateSystem(data(1000,800),start,start+3600,o);
 near(r.kwh,.36*.5+.6*.5);near(r.shadeLossKwh,.24*.5);
 near(r.hours[0].panels[0].litFraction,.75);
 const partial=E.estimateSystem(data(1000,800),start+900,start+3600,o);
 near(partial.kwh,.36*.25+.6*.5);near(partial.shadeLossKwh,.24*.25);
});
test('loss categories applied once, inverter once, energy budget reconciles',()=>{
 const sys=structuredClone(system);sys.losses={temperature:10,wiring:2,soiling:3,other:1};sys.inverter.efficiency=95;
 const r=E.estimateSystem(data(),start,start+3600,options(config,sys));
 near(r.dcKwh,1.2*.9*.98*.97*.99);near(r.kwh,r.dcKwh*.95);
 near(r.rawDcKwh,r.kwh+r.shadeLossKwh+Object.values(r.lossKwh).reduce((a,b)=>a+b,0)+r.mpptLossKwh+r.inverterLossKwh+r.clippingKwh);
});
test('AC clipping each hour, not daily average',()=>{
 const sys=structuredClone(system);sys.inverter.acKw=.5;
 const h={time:[start+3600,start+7200],global_tilted_irradiance:[1000,0],direct_normal_irradiance:[0,0]};
 const r=E.estimateSystem(h,start,start+7200,options(config,sys));near(r.kwh,.5);near(r.clippingKwh,.7);
});
test('MPPT current and voltage windows enforced',()=>{
 const sys=structuredClone(system);Object.assign(sys.inverter,{mpptCount:1,operatingV:200,mpptMaxA:2});
 const r=E.estimateSystem(data(),start,start+3600,options(config,sys));near(r.kwh,.4);near(r.mpptLossKwh,.8);
 sys.inverter.operatingV=50;near(E.estimateSystem(data(),start,start+3600,options(config,sys)).kwh,0);
});
test('PV admission limit and invalid efficiencies rejected',()=>{
 const sys=structuredClone(system);sys.inverter.maxPvKw=1;
 assert.throws(()=>E.estimateSystem(data(),start,start+3600,options(config,sys)),/PV DC/);
 sys.inverter.maxPvKw=20;sys.inverter.efficiency=101;
 assert.throws(()=>E.estimateSystem(data(),start,start+3600,options(config,sys)));
});
test('missing DNI fails explicitly; fractional interval integrates correctly',()=>{
 assert.throws(()=>E.estimateSystem({time:[start+3600],global_tilted_irradiance:[500]},start,start+3600,options()),/trực tiếp|DNI/);
 const r=E.estimateSystem(data(),start+900,start+3600,options());near(r.kwh,.9);
 assert.equal(r.hours[0].durationHours,.75);
});
test('night has no direct yield; diffuse zero stays zero',()=>{
 const o=options();o.sunAt=()=>({azimuth:90,altitude:-10});
 const r=E.estimateSystem(data(0,0),start,start+3600,o);near(r.kwh,0);assert(Number.isFinite(r.shadeLossKwh));
});
test('render masks agree with forecast per panel at four local times',()=>{
 const Solar=require('./reference/solar.cjs');
 for(const minute of [390,540,720,990]) {
  const c={...config,house:122,bearing:295,left:5,right:5,leftRoof:1,rightRoof:1};
  const scene=G.scene(c,positions),sun=Solar.position('2026-06-21',minute,10.8231,106.6297,7);
  const mask=G.exposure(scene,sun);
  const result=E.estimateSystem(data(700,600),start,start+3600,{...system,scene,sunAt:()=>sun});
  mask.panels.forEach((p,i)=>{
   near(result.hours[0].panels[i].litFraction,p.cells.filter(Boolean).length/36);
   if(mask.incidence>1e-12 && sun.altitude>0)near(p.shadeFraction,1-p.litFraction);
   else assert.equal(p.shadeFraction,null);
  });
 }
});
if(failures)process.exitCode=1;
test('a tree or rooftop tank reduces energy only while blocking the sun',()=>{
 const c={...config,count:1},positions=[{x:0,z:0}];
 function energy(obstacles,dni=800){
  const scene=G.scene({...c,obstacles},positions);
  return E.estimateSystem(data(1000,dni),start,start+3600,{...system,scene,sunAt:()=>({azimuth:90,altitude:30})}).kwh;
 }
 const clear=energy([]);
 for(const [type,x] of [['tree',8],['tank',1.1]]){
  assert(energy([{type,x,z:0}])<clear);
  near(energy([{type,x:-x,z:4}]),clear);
  near(energy([{type,x,z:0}],0),clear);
 }
});
if(failures)process.exitCode=1;
test('object masks reconcile with direct energy loss and recommended orientation',()=>{
 const pos=[{x:0,z:0}],sun={azimuth:90,altitude:30};
 const samples=[sun,{azimuth:150,altitude:55},{azimuth:230,altitude:30}];
 for(const [type,x,z,blocked] of [['tree',8,0,30],['tank',1.1,0,18],['antenna',1.1,.1,6]]) {
  const c={...config,count:1,obstacles:[{type,x,z}]},scene=G.scene(c,pos);
  const cells=G.renderCells(scene,sun).cells;
  assert.equal(cells.filter(cell=>!cell.lit).length,blocked);
  const energy=E.estimateSystem(data(1000,800),start,start+3600,{...system,scene,sunAt:()=>sun});
  near(energy.shadeLossKwh,.48*blocked/36);near(energy.kwh,.6-.48*blocked/36);
  const search=G.recommendScene(samples,c,pos);let result;
  do{result=search.next();}while(!result.done);
  const best=result.value,updated=G.scene({...c,bearing:best.bearing,tilt:best.tilt},pos);
  const score=s=>samples.reduce((sum,sun)=>{
    const mask=G.exposure(s,sun);
    return sum+mask.incidence*Math.sin(sun.altitude*Math.PI/180)*mask.panels[0].litFraction;
  },0);
  near(score(updated),best.score);near(score(scene),best.baseline);assert(best.score>=best.baseline);
 }
});
if(failures)process.exitCode=1;
