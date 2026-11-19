const assert=require('node:assert/strict');
const {rasterize}=require('../dist/depth-renderer.js');
const G=require('../dist/panel-geometry.js');
const colors={roof:[180,90,50,255],panel:[20,90,180,255]};
const colorOf=c=>colors[c];
const roofs=[
  [[-4.5,6.4,-5.5],[0,9.4,-5.5],[0,9.4,5.5],[-4.5,6.4,5.5]],
  [[0,9.4,-5.5],[4.5,6.4,-5.5],[4.5,6.4,5.5],[0,9.4,5.5]],
];
for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/12)for(const pitch of [.05,.3,.55,1.2,Math.PI/2]) {
  const project=([x,y,z])=>[150+(x*Math.cos(yaw)+z*Math.sin(yaw))*15,210+((-x*Math.sin(yaw)+z*Math.cos(yaw))*Math.sin(pitch)-y*Math.cos(pitch))*15,(-x*Math.sin(yaw)+z*Math.cos(yaw))*Math.cos(pitch)+y*Math.sin(pitch)];
  const panel=G.corners(180,25,9.4,0,0,3.6,4), faces=[...roofs.map(p=>({p,color:'roof'})),{p:panel,color:'panel'}];
  const pixels=rasterize(300,300,faces,project,colorOf);
  const reverse=rasterize(300,300,[...faces].reverse(),project,colorOf);
  assert.deepEqual(pixels,reverse,'Face insertion order cannot hide panels');
  const center=project(panel[0].map((v,i)=>(v+panel[2][i])/2));
  const index=(Math.floor(center[1])*300+Math.floor(center[0]))*4;
  assert.deepEqual([...pixels.slice(index,index+4)],colors.panel,`Panel visible above ridge: yaw=${yaw}, pitch=${pitch}`);
}
// A genuinely nearer building still occludes the panel.
const square=z=>[[2,2,z],[8,2,z],[8,8,z],[2,8,z]];
const pixels=rasterize(10,10,[{p:square(1),color:'panel'},{p:square(2),color:'roof'}],p=>p,colorOf);
assert.deepEqual([...pixels.slice((5*10+5)*4,(5*10+5)*4+4)],colors.roof);
console.log('Depth rendering checks passed: 120 camera views, order independence and real occlusion.');
