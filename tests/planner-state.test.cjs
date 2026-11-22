const assert=require('node:assert/strict');
require('../dist/panel-geometry.js');
const State=require('../dist/planner-state.js');
const config={width:8,length:12,count:2,roof:1,bearing:180,tilt:25,floors:2,x:0,z:0,house:90,left:3,right:5,leftRoof:1,rightRoof:0};
const state={version:1,config,positions:[{x:-2,z:0},{x:2,z:0}],view:{yaw:2,pitch:.6,zoom:1.5},location:{lat:10.8,lon:106.6,offset:7},energy:{kwp:11,loss:20,reserve:true}};
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
const clientA=storage(),clientB=storage();
assert(State.save(clientA,state));
assert.deepEqual(State.load(clientA),state,'Round-trip every simulation setting and panel center');
assert.equal(State.load(clientB),null,'Different browser stores do not share client configuration');
clientA.setItem(State.key,'broken JSON');assert.equal(State.load(clientA),null);
for(const invalid of [{...state,version:2},{...state,config:{...config,length:500}},{...state,config:{...config,count:1}},{...state,positions:[{x:0,z:0},{x:0,z:0}]},{...state,positions:[{x:Infinity,z:0},{x:2,z:0}]}])assert.equal(State.validate(invalid),null);
const blocked={getItem(){throw Error('Disabled');},setItem(){throw Error('Quota exceeded');}};
assert.equal(State.load(blocked),null);assert.equal(State.save(blocked,state),false);
assert.equal(State.validate({...state,location:{lat:999,lon:0,offset:7}}).location,undefined);
assert.equal(State.validate({...state,view:{yaw:0,pitch:99,zoom:1}}).view,undefined);
console.log('Planner persistence checks passed: complete round-trip, per-client isolation, invalid data and blocked storage.');
const backup=State.exportBackup(state);
assert.deepEqual(State.importBackup(backup),state);
assert.deepEqual(State.importBackup('\uFEFF'+backup),state,'Accept UTF-8 BOM from text editors');
for(const data of ['not json','null',JSON.stringify({...JSON.parse(backup),version:2}),JSON.stringify({...JSON.parse(backup),format:'other-app'}),' '.repeat(65537)])assert.throws(()=>State.importBackup(data));
for(const profile of [{...state,location:{lat:999,lon:0,offset:7}},{...state,energy:{kwp:-1,loss:20,reserve:true}},{...state,positions:[{x:0,z:0},{x:0,z:0}]}]) {
  assert.throws(()=>State.exportBackup(profile));
  assert.throws(()=>State.importBackup(JSON.stringify({...JSON.parse(backup),profile})));
}
assert.deepEqual(State.importBackup(State.exportBackup({version:1,config,positions:state.positions})),{version:1,config,positions:state.positions},'Backup can omit unavailable location');
console.log('Profile backup checks passed: complete export/import, invalid files, unsupported versions and optional coordinates.');

const legacy=JSON.parse(JSON.stringify(state));delete legacy.config.width;
assert.equal(State.validate(legacy).config.width,8,'Old profiles default to 8 m width');
const wide={...state,config:{...config,width:20},positions:[{x:-8,z:0},{x:8,z:0}]};
assert.deepEqual(State.importBackup(State.exportBackup(wide)),wide);
assert.equal(State.validate({...wide,config:{...wide.config,width:31}}),null);
