const assert=require('node:assert/strict');
const G=require('../dist/panel-geometry.js'), Solar=require('../dist/solar.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
close(G.incidence({azimuth:180,altitude:60},180,30),1);
close(G.incidence({azimuth:0,altitude:45},180,90),0);
assert(G.angle({azimuth:0,altitude:45},180,90)>90,'Backside incidence angle must exceed 90°');
close(G.incidence({azimuth:180,altitude:-1},180,30),0);
close(G.incidence({azimuth:60,altitude:30},0,0),.5);
close(G.incidence({azimuth:0,altitude:45},0,30),G.incidence({azimuth:0,altitude:45},360,30));
for(let bearing=0;bearing<=360;bearing+=5)for(let tilt=0;tilt<=90;tilt+=5){
  const corners=G.corners(bearing,tilt,12.8,1,2);
  for(const [x,y,z] of corners){assert(Math.abs(x)<4);assert(Math.abs(z)<5);assert(y>12.8,'Panel must clear roof');}
  const a=corners[1].map((v,i)=>v-corners[0][i]),b=corners[3].map((v,i)=>v-corners[0][i]);
  const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const expected=G.vector(bearing,90-tilt);const length=Math.hypot(...normal);
  expected.forEach((v,i)=>close(v,-normal[i]/length));
}
const shadow=G.shadow([[0,3,0]],{azimuth:90,altitude:45})[0];close(shadow[0],-3);close(shadow[1],0);close(shadow[2],0);
assert.deepEqual(G.shadow([[0,3,0]],{azimuth:90,altitude:-1}),[]);
const samples=Array.from({length:144},(_,i)=>Solar.position('2026-12-21',i*10,21,105,7));
const best=G.recommend(samples);assert(best.bearing>=170&&best.bearing<=190);assert(best.tilt>20&&best.tilt<70);
assert.equal(G.recommend([{azimuth:0,altitude:-20}]).score,0);
console.log('Panel geometry checks passed: incidence, normals, roof clearance, shadow direction, winter recommendation and polar night.');

const north=G.rotate([0,0,-5],90);close(north[0],5);close(north[2],0);
for(let bearing=0;bearing<=360;bearing+=15){
  const point=[2,9,-3], rotated=G.rotate(G.rotate(point,bearing),-bearing);
  point.forEach((v,i)=>close(v,rotated[i]));
}
const touching=G.neighbors(5,5);
assert.equal(touching[0].x+touching[0].width/2,-4,'Left neighbor must touch central west wall');
assert.equal(touching[1].x-touching[1].width/2,4,'Right neighbor must touch central east wall');
assert.deepEqual(G.neighbors(0,0),[]);
const eastHouse=G.neighbors(0,5);
assert(G.blocked([0,6.4,0],{azimuth:90,altitude:20},eastHouse,0),'Tall east neighbor blocks low morning sunlight');
assert(!G.blocked([0,6.4,0],{azimuth:270,altitude:20},eastHouse,0),'Building behind the ray must not block sunlight');
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:80},eastHouse,0),'High sun clears the neighbor');
assert(G.blocked([0,6.4,0],{azimuth:180,altitude:20},eastHouse,90),'Occlusion must rotate with the house');
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:-5},eastHouse,0));
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:20},[],0));
console.log('House geometry checks passed: clockwise rotation, inverse transform and neighbor shading.');

const annual=G.annualSamples(2024,21,105,7,Solar.position);
assert.equal(annual.length,366*48,'Leap year includes every day');
assert.equal(G.annualSamples(2025,21,105,7,Solar.position).length,365*48);
const northYear=G.recommend(annual);
assert(northYear.bearing>=170 && northYear.bearing<=190);
assert(northYear.tilt>=10 && northYear.tilt<=30);
const southYear=G.recommend(G.annualSamples(2025,-33,151,10,Solar.position));
assert(southYear.bearing<=10 || southYear.bearing>=350);
assert(southYear.tilt>=20 && southYear.tilt<=40);
console.log('Annual recommendation checks passed: leap years and both hemispheres.');

// Roof supports must land on the roof, including after rotating the house.
for(const thai of [false,true]) for(const house of [0,45,90,180,270]) {
  const height=6.4;
  const panel=G.corners(70,25,height+(thai?3:0),.8,-1.5).map(p=>G.rotate(p,house));
  for(const [foot,top] of G.supports(panel,height,thai,house)) {
    const local=G.rotate(foot,-house);
    close(foot[0],top[0]);close(foot[2],top[2]);
    close(foot[1],height+(thai?3*(1-Math.abs(local[0])/4.5):0));
    assert(top[1]>foot[1],'Support must extend upward from roof');
  }
}
console.log('Roof supports checks passed: flat/sloped contact and rotated houses.');

for(const count of [1,2,5,6,9,12]) for(const length of [8,10,30]) for(let bearing=0;bearing<360;bearing+=15) {
  const layout=G.panelLayout(count,bearing,25,9.4,10,-20,length);
  assert.equal(layout.panels.length,count);
  for(const panel of layout.panels) for(const [x,y,z] of panel) {
    assert(Math.abs(x)<=4+1e-9,'Panel stays within roof width');
    assert(Math.abs(z)<=length/2+1e-9,'Panel stays within roof length');
    assert(y>9.4);
  }
}
assert.equal(G.neighbors(5,3,30)[0].depth,30);
assert(G.blocked([0,6.4,12],{azimuth:90,altitude:20},G.neighbors(0,5,30),0));
assert(!G.blocked([0,6.4,12],{azimuth:90,altitude:20},G.neighbors(0,5,10),0));
console.log('Variable house length, individual panels, roof bounds and neighbor shadow checks passed.');

// Neighbor ridge blocks a ray that clears its flat roof; rotation and absence
// must give the same physical result as the visible model.
const ray={azimuth:90,altitude:10}, point=[0,7,0];
assert(!G.blocked(point,ray,G.neighbors(0,2,10,false,false),0));
assert(G.blocked(point,ray,G.neighbors(0,2,10,false,true),0));
assert(G.blocked(G.rotate(point,90),{azimuth:180,altitude:10},G.neighbors(0,2,10,false,true),90));
assert(!G.blocked(point,ray,G.neighbors(0,0,10,true,true),0));
assert(!G.blocked([0,7,8],ray,G.neighbors(0,2,10,false,true),0),'Ray outside gable depth stays clear');
assert(!G.blocked(point,{azimuth:90,altitude:80},G.neighbors(0,2,10,false,true),0));
assert(G.validPlacement([{x:-2,z:0},{x:2,z:0}],35,8));
assert(!G.validPlacement([{x:0,z:0},{x:.2,z:.3}],35,8),'Overlapping panels rejected');
assert(!G.validPlacement([{x:3.8,z:0}],0,8),'Roof overflow rejected');
for(let bearing=0;bearing<360;bearing+=15)for(const tilt of [0,15,45,90]) {
  const positions=[{x:-2,z:-2},{x:2,z:2}];
  const panels=G.individualPanels(positions,bearing,tilt,9.4);
  panels.forEach((p,i)=>{
    close((p[0][0]+p[2][0])/2,positions[i].x);
    close((p[0][2]+p[2][2])/2,positions[i].z);
    assert(p.every(v=>v[1]>=9.75-1e-9),'Every panel clears Thai ridge at all tilts');
  });
}
console.log('Individual placement and Thai neighbor roof shading checks passed.');

function sceneBest(samples,c,positions) {
  const search=G.recommendScene(samples,c,positions);let result;
  do {result=search.next();}while(!result.done);
  return result.value;
}
const scene={length:10,count:1,roof:0,bearing:90,tilt:45,floors:0,x:0,z:0,house:0,left:0,right:5,leftRoof:0,rightRoof:1};
const centers=[{x:0,z:0}], before=JSON.stringify(centers);
const clearAndBlocked=[{azimuth:90,altitude:20},{azimuth:270,altitude:20}];
const recommended=sceneBest(clearAndBlocked,scene,centers);
assert(recommended.bearing>=255 && recommended.bearing<=285,'Avoid shaded eastern sky and face unobstructed western sky');
assert(recommended.score>recommended.baseline,'Scene-aware recommendation improves over current placement');
assert.equal(JSON.stringify(centers),before,'Optimization must not rearrange panel centers');
assert(G.validPlacement(centers,recommended.bearing-scene.house,scene.length));
const constrained=[{x:3.3,z:0},{x:3.3,z:2}];
const constrainedScene={...scene,count:2,bearing:180};
const constrainedBest=sceneBest(clearAndBlocked,constrainedScene,constrained);
assert(G.validPlacement(constrained,constrainedBest.bearing,10),'Recommendation cannot rotate edge panels beyond roof or overlap');
assert(constrainedBest.score>=constrainedBest.baseline);
assert.equal(sceneBest([{azimuth:180,altitude:-10}],scene,centers).score,0);
const flat=sceneBest([{azimuth:90,altitude:10}],{...scene,floors:1,right:2,rightRoof:0},centers);
const thai=sceneBest([{azimuth:90,altitude:10}],{...scene,floors:1,right:2,rightRoof:1},centers);
assert(thai.baseline<flat.baseline,'Optimizer includes the neighbor Thai ridge in its baseline score');
console.log('Scene recommendation checks passed: neighbor shading, roof shape, improvement and layout constraints.');
const annualLayoutSamples=Array.from({length:12},(_,m)=>Array.from({length:24},(_,h)=>({...Solar.position(`2026-${String(m+1).padStart(2,'0')}-15`,h*60+30,10.8,106.6,7),weight:new Date(Date.UTC(2026,m+1,0)).getUTCDate()}))).flat();
assert(annualLayoutSamples.some(s=>s.altitude>0));
const layoutSearch=G.recommendScene(annualLayoutSamples,scene,centers,true);
let layoutResult;
do {layoutResult=layoutSearch.next();} while(!layoutResult.done);
const layoutBest=layoutResult.value;
assert.equal(layoutBest.positions.length,centers.length);
assert(G.validPlacement(layoutBest.positions,layoutBest.bearing-scene.house,scene.length),'Annual layout fits the roof without overlap');
assert(layoutBest.score>=layoutBest.baseline,'Layout search must not reduce baseline annual exposure');
assert.equal(JSON.stringify(centers),before,'Search must not mutate the original layout');
console.log('Annual layout checks passed: roof bounds, panel count, nondecreasing exposure and immutable input.');
assert(G.validPlacement([{x:8,z:0}],0,10,20));
assert(!G.validPlacement([{x:8,z:0}],0,10,8));
assert.equal(G.neighbors(1,1,10,false,false,20)[0].x,-14);
close(G.roofHeight(5,3.2,true,20),3.2+3*(1-5/10.5));
const freeScene={width:14,length:16,count:4,roof:0,bearing:90,tilt:20,floors:0,x:0,z:0,house:0,left:0,right:3,leftRoof:0,rightRoof:1};
const freeBefore=[{x:3,z:-3},{x:3,z:0},{x:3,z:3},{x:0,z:0}];
const freeSearch=G.recommendScene([{azimuth:90,altitude:25},{azimuth:120,altitude:35}],freeScene,freeBefore,true);
let freeResult;do {freeResult=freeSearch.next();}while(!freeResult.done);
const free=freeResult.value;
assert.equal(free.positions.length,4);
assert(G.validPlacement(free.positions,free.bearing,16,14));
assert(free.score>free.baseline);
const shifts=free.positions.map((p,i)=>[p.x-freeBefore[i].x,p.z-freeBefore[i].z]);
assert(shifts.some(p=>Math.hypot(p[0]-shifts[0][0],p[1]-shifts[0][1])>.1),'Move individual panels, not only translate the whole group');
console.log('Variable width and independent panel placement checks passed.');
for(const [count,width,length] of [[6,3,8],[30,14,30]]) {
  const layout=G.panelLayout(count,180,0,0,0,0,length,width);
  const positions=layout.panels.map(p=>({x:(p[0][0]+p[2][0])/2,z:(p[0][2]+p[2][2])/2}));
  assert.equal(positions.length,count);
  assert(G.validPlacement(positions,180,length,width),'Automatic layout fits narrow roofs and 30-panel roofs');
}
const portrait=G.individualPanels([{x:0,z:0}],0,0,0)[0];
const landscape=G.individualPanels([{x:0,z:0,rotation:90}],0,0,0)[0];
close(Math.max(...portrait.map(p=>p[0]))-.0,.59);
close(Math.max(...landscape.map(p=>p[0]))-.0,.98);
assert(G.validPlacement([{x:3.2,z:0}],0,10,8));
assert(!G.validPlacement([{x:3.2,z:0,rotation:90}],0,10,8),'Rotation cannot cross roof edge');
assert(!G.validPlacement([{x:0,z:0,rotation:90},{x:1.3,z:0}],0,10,8),'Rotation cannot overlap another module');
assert(free.explanation.beforeShade>=0 && free.explanation.afterShade>=0);
assert(free.explanation.samples===2 && free.explanation.moved>0);
for(let watts=550;watts<=700;watts+=5) {
  const module=G.moduleFor(watts);
  assert(module && module.source.startsWith('https://'));
  for(const bearing of [0,30,90]) {
    const positions=G.packPanels(30,bearing,8,3,module);
    assert(positions.length>0 && positions.length<30);
    assert(G.validPlacement(positions,bearing,8,3,module));
    const geometry=G.individualPanels([{x:0,z:0}],0,0,0,module)[0];
    close(Math.max(...geometry.map(p=>p[2]))-Math.min(...geometry.map(p=>p[2])),module.length);
  }
}
assert.equal(G.moduleFor(600).length,2.384);
assert.equal(G.moduleFor(600).width,1.134);
assert.equal(G.moduleFor(700).width,1.303);
for(const watts of [549,701,601,NaN,Infinity])assert.equal(G.moduleFor(watts),null);
const six=G.packPanels(30,180,8,3,G.moduleFor(600));
assert.equal(six.length,6,'3 × 8 m roof fits six portrait 600 W modules in regular layout');
console.log('Module catalog checks passed: 31 power bins, exact dimensions and constrained roof packing.');

for(const watts of [550,600,700])for(const bearing of [0,32,45,90,122,173,295])for(const count of (watts===700?[18]:[18,20])) {
 const module=G.moduleFor(watts),positions=G.packPanels(count,bearing,20,6,module);
 assert.equal(positions.length,count,`6 × 20 m roof must fit ${count} modules at ${bearing}°, ${watts} W`);
 assert(G.validPlacement(positions,bearing,20,6,module),'Full-size panels must stay within roof without overlap');
}
console.log('6 × 20 m roof packing: 18 panels at 550/600/700 W, 20 panels at 550/600 W across rotations passed.');

{
  const G=require('../dist/panel-geometry.js');
  const c={width:8,length:12,count:1,watts:600,house:45,bearing:45,tilt:15,floors:0,roof:0,left:2,right:3,leftRoof:0,rightRoof:1,x:0,z:0};
  const positions=[{x:0,z:0}];
  for(const [type,x,height] of [['tank',-8,6.4],['antenna',8,12.6]]) {
    const scene=G.scene({...c,obstacles:[{type,x,z:0}]},positions);
    const ys=scene.obstacleFaces.flatMap(face=>face.p.map(vertex=>vertex[1]));
    assert(Math.abs(Math.min(...ys)-height)<1e-8);
    assert(Math.abs(Math.max(...ys)-height-(type==='tank'?2:3))<1e-8);
  }
  assert.throws(()=>G.scene(c,[{x:8,z:0}]),'Panels cannot be placed on a neighboring roof');
  console.log('Neighbor rooftop object heights, rotation and main-roof panel boundary passed.');
}

{
  const G=require('../dist/panel-geometry.js');
  for(const width of [3,8])for(const house of [0,127])for(const neighbor of [false,true]){
    const roofX=neighbor?width/2+4:0,roofWidth=neighbor?8:width,height=neighbor?9.6:3.2;
    for(const dx of [-roofWidth/2+.73,-.35,0,.35,roofWidth/2-.73]){
      const x=roofX+dx;
      const c={width,length:12,count:1,watts:600,house,bearing:house,tilt:15,floors:0,roof:1,left:0,right:3,leftRoof:0,rightRoof:1,x:0,z:0,obstacles:[{type:'tank',x,z:2}]};
      const scene=G.scene(c,[{x:0,z:-2}]);
      let clearance=Infinity;
      for(const face of scene.obstacleFaces)for(const p of face.p){
        const local=G.rotate(p,-house);
        const gap=p[1]-G.roofHeight(local[0]-roofX,height,true,roofWidth);
        assert(gap>=-1e-8,'Tank and feet must clear the sloped roof');
        clearance=Math.min(clearance,gap);
      }
      assert(Math.abs(clearance)<1e-8,'Feet must touch the roof');
    }
  }
}

{
  const outline=[[-.1,-.5],[.5,-.5],[.5,.5],[-.5,.5]];
  const clipped=[{x:-3,z:-4}];
  assert(G.validOutline(outline));
  assert(G.validPlacement(clipped,0,12,8));
  assert(!G.validPlacement(clipped,0,12,8,G.moduleFor(550),outline));
  for(const bearing of [0,45,90]){
    const packed=G.packPanels(12,bearing,12,8,G.moduleFor(550),outline);
    assert(packed.length>0);
    assert(G.validPlacement(packed,bearing,12,8,G.moduleFor(550),outline));
  }
}
