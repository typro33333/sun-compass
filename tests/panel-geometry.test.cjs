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
const eastHouse=[{x:11,z:0,width:8,depth:10,height:16}];
assert(G.blocked([0,6.4,0],{azimuth:90,altitude:20},eastHouse,0),'Tall east neighbor blocks low morning sunlight');
assert(!G.blocked([0,6.4,0],{azimuth:270,altitude:20},eastHouse,0),'Building behind the ray must not block sunlight');
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:80},eastHouse,0),'High sun clears the neighbor');
assert(G.blocked([0,6.4,0],{azimuth:180,altitude:20},eastHouse,90),'Occlusion must rotate with the house');
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:-5},eastHouse,0));
assert(!G.blocked([0,6.4,0],{azimuth:90,altitude:20},[],0));
console.log('House geometry checks passed: clockwise rotation, inverse transform and neighbor shading.');
