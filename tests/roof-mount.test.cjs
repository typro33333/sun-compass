const assert=require('node:assert/strict'),G=require('../dist/panel-geometry.js');
const c={width:8,length:12,count:4,watts:600,roof:1,mount:1,bearing:180,tilt:15,floors:1,x:0,z:0,house:32,left:0,right:0,leftRoof:0,rightRoof:0};
for(const mount of [1,2]) {
 const config=G.mounting({...c,mount}),positions=G.packRoof(config,4),scene=G.scene(config,positions);
 assert.equal(positions.length,4);assert(G.validRoofPlacement(config,positions));
 assert.equal(scene.panels[0].azimuth,(32+(mount===1?270:90))%360);
 for(const panel of scene.panels)for(const world of panel.vertices){const p=G.rotate(world,-32);assert(Math.abs(p[1]-G.roofHeight(p[0],6.4,true,8)-.12)<1e-8);assert(mount===1?p[0]<0:p[0]>0);}
 assert.throws(()=>G.scene(config,[{x:0,z:0},...positions.slice(1)]));
 for(const panel of scene.panels){const f=panel.vertices;const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));assert(Math.abs(dist(f[0],f[1])-(panel.rotation===90?2.384:1.134))<1e-8);assert(Math.abs(dist(f[1],f[2])-(panel.rotation===90?1.134:2.384))<1e-8);}
 const normal=scene.panels[0].normal;assert(Math.abs(Math.hypot(...normal)-1)<1e-8);
 const frame=G.scene({...c,mount:0},G.packPanels(4,148,12,8,G.moduleFor(600)));
 assert(frame.modules.flat().every(p=>p[1]>9.4));
}
console.log('Thai roof: flush left/right clearance, orientation, ridge rejection and raised frame passed.');

const State=require('../dist/planner-state.js');
const config=G.mounting(c),positions=G.packRoof(config,4);
const state={version:1,config,positions};
assert.equal(State.validate(state).config.mount,1);
assert.deepEqual(State.importBackup(State.exportBackup(state)).config,config);
assert.equal(State.validate({...state,config:{...config,mount:99}}),null);
