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
