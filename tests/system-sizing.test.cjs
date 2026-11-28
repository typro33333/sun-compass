const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(), requests=[];
const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',hidden:false,textContent:'',valid:true,checkValidity(){return this.valid;},addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);};
for(const [key,value] of Object.entries({day:20,night:30,watts:600,yield:4,peak:'',coverage:100}))node('sizing-'+key).value=String(value);
(async()=>{
 vm.runInNewContext(fs.readFileSync(require.resolve('../dist/system-sizing.js'),'utf8'),{document:{getElementById:node},setTimeout,clearTimeout,fetch(url,opts){assert.equal(url,'/api/calc/sizing');requests.push(JSON.parse(opts.body));return Promise.resolve(Response.json({panels:23,pvKwp:13.8,inverterKw:12,batteryKwh:36,storedLoad:30,requiredEnergy:53.3,production:55.2,gridNight:0,dayOnlyPanels:9}));}});
 await new Promise(setImmediate);
 assert.equal(requests[0].yieldPerKwp,4);assert.match(node('sizing-pv').textContent,/23 tấm/);
 node('sizing-form').valid=false;node('sizing-form').input();assert.equal(node('sizing-result').hidden,true);
})().catch(e=>{console.error(e);process.exitCode=1;});
