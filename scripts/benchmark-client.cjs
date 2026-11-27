const {performance}=require('node:perf_hooks');
const folder=process.argv[2] || require('node:path').resolve(__dirname,'../dist'),G=require(folder+'/panel-geometry.js'),E=require(folder+'/energy.js'),S=require(folder+'/solar.js'),D=require(folder+'/depth-renderer.js');
const c={width:14,length:20,count:30,watts:600,roof:0,bearing:180,tilt:20,floors:1,x:0,z:0,house:0,left:3,right:4,leftRoof:1,rightRoof:1};
const positions=G.packPanels(c.count,180,c.length,c.width,G.moduleFor(600)),scene=G.scene(c,positions),sun={azimuth:110,altitude:30};
const start=Date.parse('2026-06-21T00:00:00Z')/1000;
const hourly={time:Array.from({length:24},(_,i)=>start+(i+1)*3600),global_tilted_irradiance:Array(24).fill(700),direct_normal_irradiance:Array(24).fill(600)};
const system=E.defaultSystem();system.inverter.maxPvKw=30;
const frame=G.renderCells(scene,sun),faces=frame.cells.map(c=>({p:c.p,color:c.lit?'lit':'shade'}));
const colorOf=c=>c==='lit'?[40,100,160,255]:[20,30,40,255];const project=([x,y,z])=>[400+x*30,180+z*10-y*15,z+y];
function bench(name,fn,n){for(let i=0;i<3;i++)fn();const times=[];for(let run=0;run<5;run++){const t=performance.now();for(let i=0;i<n;i++)fn();times.push((performance.now()-t)/n);}times.sort((a,b)=>a-b);console.log(name,times[2].toFixed(3),'ms');}
bench('exposure 30 panels',()=>G.exposure(scene,sun),100);
bench('renderCells 30 panels',()=>G.renderCells(scene,sun),50);
bench('daily energy 30 panels',()=>E.estimateSystem(hourly,start,start+86400,{...system,scene,sunAt:()=>sun}),5);
const workspace={};
bench('raster 800x400 (retained buffers)',()=>D.rasterize(800,400,faces,project,colorOf,workspace),10);
bench('raster 800x400',()=>D.rasterize(800,400,faces,project,colorOf),10);
bench('valid placement 30 panels',()=>G.validPlacement(positions,180,20,14,G.moduleFor(600)),100);
console.log('fingerprint',JSON.stringify({lit:G.exposure(scene,sun).panels.map(p=>p.litFraction),energy:E.estimateSystem(hourly,start,start+86400,{...system,scene,sunAt:()=>sun}).kwh}));
