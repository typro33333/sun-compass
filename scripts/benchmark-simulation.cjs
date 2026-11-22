const root=process.cwd();const G=require(root+'/dist/panel-geometry.js'),E=require(root+'/dist/energy.js');require(root+'/dist/solar.js');const A=require(root+'/dist/annual-placement.js');
const c={width:6,length:20,count:18,watts:600,roof:1,bearing:90,tilt:20,floors:0,x:0,z:0,house:0,left:5,right:5,leftRoof:1,rightRoof:1};
const system=E.defaultSystem();system.inverter.maxPvKw=20;
const climate=A.scenario({year:2026,location:{lat:10.8,lon:106.6,offset:7},config:c,annualPoa:1600});const p=G.packPanels(18,90,20,6,G.moduleFor(600));
const t=performance.now();const result=A.evaluate(c,p,system,climate);console.log(JSON.stringify({ms:performance.now()-t,result}));
