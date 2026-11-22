const assert=require('node:assert/strict');
const G=require('../dist/panel-geometry.js'),E=require('../dist/energy.js'),S=require('../dist/solar.js');
const c={width:14,length:12,count:2,watts:600,roof:0,bearing:90,tilt:60,floors:0,x:0,z:0,house:0,left:0,right:2,leftRoof:0,rightRoof:1};
const positions=[{x:-3,z:0},{x:3,z:0}];
const system={losses:{temperature:8,wiring:2,soiling:3,other:1},inverter:{acKw:.3,maxPvKw:20,efficiency:97,mpptCount:2,mpptMinV:100,mpptMaxV:800,mpptMaxA:1,operatingV:200}};
const near=(a,b,t=1e-9)=>assert(Math.abs(a-b)<=t,`${a} != ${b}`);
let failures=0,checks=0,maxDifference=0;
function test(name,fn){try{fn();checks++;console.log('PASS',name);}catch(e){failures++;console.error('FAIL',name,e.message);}}
test('scene exposes finite panel descriptors and unit normals',()=>{
 const scene=G.scene(c,positions);
 scene.panels.forEach((p,i)=>{assert.equal(p.id,i+1);assert.deepEqual(p.vertices,scene.modules[i]);near(Math.hypot(...p.normal),1);assert.equal(p.azimuth,90);assert.equal(p.tilt,60);assert.equal(p.dimensions.length,2.384);assert(p.position.every(Number.isFinite));});
 assert.throws(()=>G.scene({...c,tilt:NaN},positions));
 assert.throws(()=>G.scene(c,[{x:NaN,z:0},positions[1]]));
 assert.throws(()=>G.exposure(scene,{azimuth:NaN,altitude:30}));
});
test('no neighbors, analytic unblocked rays, no obstacle shade',()=>{
 const scene=G.scene({...c,left:0,right:0,tilt:0},positions);
 for(const sun of [{azimuth:90,altitude:30},{azimuth:270,altitude:30},{azimuth:180,altitude:89}])for(const p of G.exposure(scene,sun).panels)near(p.shadeFraction,0);
});
test('taller neighbor creates time-dependent shadow and moving one panel changes only it',()=>{
 const scene=G.scene(c,positions);
 const sun={azimuth:90,altitude:25},initial=G.exposure(scene,sun);
 const noon=G.exposure(scene,{azimuth:90,altitude:80});
 assert(initial.panels[1].litFraction<noon.panels[1].litFraction);
 const moved=G.exposure(G.scene(c,[positions[0],{x:0,z:0}]),sun);
 assert(moved.panels[1].litFraction>initial.panels[1].litFraction);
 near(moved.panels[0].litFraction,initial.panels[0].litFraction);
});
test('rotating house and sun rotates vertices and shadow identically',()=>{
 const a=G.scene(c,positions),b=G.scene({...c,house:90,bearing:180},positions);
 a.modules.forEach((face,i)=>face.forEach((p,j)=>G.rotate(p,90).forEach((v,k)=>near(v,b.modules[i][j][k]))));
 assert.deepEqual(G.exposure(a,{azimuth:90,altitude:25}).panels,G.exposure(b,{azimuth:180,altitude:25}).panels);
});
test('renderer cells and forecast samples match at same timestamps; step energy balance and caps',()=>{
 for(const grid of [3,6,10])for(const [day,lat,lon,offset] of [['2026-03-20',10.8231,106.6297,7],['2026-06-21',51.5,0,1],['2026-12-21',-33.9,151.2,11],['2026-12-21',69.65,18.96,1]])for(const minute of [390,540,720,990]) {
  const timestamp=Date.parse(day+'T00:00:00Z')/1000-offset*3600+minute*60+.5,sun=S.position(day,minute+.5/60,lat,lon,offset),scene=G.scene({...c,tilt:20},positions);
  const frame=G.renderCells(scene,sun,grid),steps=[];
  const ending=Math.ceil((timestamp+1)/3600)*3600;
  const result=E.estimateSystem({time:[ending],global_tilted_irradiance:[700],direct_normal_irradiance:[600]},timestamp-.5,timestamp+.5,{...system,scene,location:{lat,lon,offset},grid,onSample:s=>steps.push(s)});
  assert.equal(steps.length,1);near(steps[0].timestamp,timestamp);
  frame.exposure.panels.forEach((p,i)=>{
   const cells=frame.cells.filter(cell=>cell.panelId===i+1);
   near(cells.filter(cell=>cell.lit).length/(grid*grid),p.litFraction);
   const other=steps[0].exposure.panels[i];
   if(p.shadeFraction!==null){maxDifference=Math.max(maxDifference,Math.abs(p.shadeFraction-other.shadeFraction));assert(Math.abs(p.shadeFraction-other.shadeFraction)<=.02);}
   for(const v of [p.litFraction,other.litFraction])assert(Number.isFinite(v)&&v>=0&&v<=1);
  });
  const step=steps[0];assert(step.acKw<=system.inverter.acKw+1e-10);assert(step.mpptKw.every(v=>v<=.2+1e-10));
  if(sun.altitude<=0)near(step.directIrradiance,0);
  near(result.rawDcKwh,result.kwh+result.shadeLossKwh+Object.values(result.lossKwh).reduce((a,b)=>a+b,0)+result.mpptLossKwh+result.inverterLossKwh+result.clippingKwh);
  assert.deepEqual(frame,G.renderCells(scene,sun,grid));
 }
});
test('independent ray-triangle oracle matches rendered roof/wall occlusion',()=>{
 const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 function hits(origin,ray,[a,b,c]) {
  const e1=sub(b,a),e2=sub(c,a),h=cross(ray,e2),det=dot(e1,h);if(Math.abs(det)<1e-10)return false;
  const q=sub(origin,a),u=dot(q,h)/det;if(u<0||u>1)return false;
  const k=cross(q,e1),v=dot(ray,k)/det;if(v<0||u+v>1)return false;
  return dot(e2,k)/det>.0001;
 }
 for(const house of [0,32,122])for(const roof of [0,1]) {
  const scene=G.scene({...c,house,bearing:house+90,roof,tilt:20},positions);
  const faces=[...scene.roofs,...scene.roofFaces];
  for(const top of scene.roofs)for(let i=0;i<4;i++){const a=top[i],b=top[(i+1)%4];faces.push([a,b,[b[0],0,b[2]],[a[0],0,a[2]]]);}
  const triangles=faces.flatMap(f=>Array.from({length:f.length-2},(_,i)=>[f[0],f[i+1],f[i+2]]));
  for(const altitude of [5,25,60]) {
   const sun={azimuth:house+90,altitude},frame=G.renderCells(scene,sun),ray=G.vector(sun.azimuth,sun.altitude);
   for(const cell of frame.cells){const center=cell.p[0].map((v,k)=>(v+cell.p[2][k])/2);assert.equal(cell.lit,!triangles.some(t=>hits(center,ray,t)));}
  }
 }
});
console.log(JSON.stringify({checks,failures,maxShadeDifferencePercentagePoints:maxDifference*100}));
if(failures)process.exitCode=1;
