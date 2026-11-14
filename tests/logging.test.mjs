import assert from 'node:assert/strict';
import { createLogger } from '../lib/logger.mjs';
import { createHttpHandler } from '../lib/http-handler.mjs';
const lines = [];
const logger = createLogger({output: line => lines.push(line),now:()=>0});
logger.info('test_event',{request_id:'abc',status:200,api_key:'SECRET',cookie:'SECRET',latitude:10,longitude:106,headers:{Authorization:'SECRET'},error:new Error('SECRET')});
const record = JSON.parse(lines.pop());
assert.deepEqual(record,{timestamp:'1970-01-01T00:00:00.000Z',level:'info',service:'sol-sun-compass',event:'test_event',request_id:'abc',status:200});
logger.debug('hidden');assert.equal(lines.length,0);
let visitorCalls=0, context;
const handler = createHttpHandler({logger,assets:new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js']]),
  visitors:{async visit(req,ctx){visitorCalls++;context=ctx;return 'test=value; HttpOnly';}},
  forecast:{async handle(url,ctx){context=ctx;return Response.json({ok:true},{headers:{'X-Forecast-Cache':'hit'}});}},
  fileResponse:async(asset,method,headers)=>new Response(method==='HEAD'?null:'asset',{headers}),
});
let response=await handler(new Request('https://test/?secret=SECRET'));
assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(visitorCalls,1);
assert.equal(context.request_id,response.headers.get('x-request-id'));
response=await handler(new Request('https://test/',{method:'HEAD'}));assert.equal(visitorCalls,1);assert.equal(await response.text(),'');assert.equal(response.headers.get('cache-control'),'private, no-store');
response=await handler(new Request('https://test/api/forecast?latitude=10&apikey=SECRET'));
assert.equal(JSON.parse(lines.at(-1)).cache_status,'hit');
assert.equal(response.headers.get('x-request-id'),context.request_id);
assert.equal((await handler(new Request('https://test/api/forecast',{method:'POST'}))).status,405);
assert.equal((await handler(new Request('https://test/SECRET'))).status,404);
assert.equal(JSON.parse(lines.at(-1)).route,'unmatched');
assert(!lines.join('\n').includes('SECRET'));
const broken=createHttpHandler({logger,assets:new Map([['/','index.html']]),visitors:{visit:async()=>{throw Error('SECRET');}},fileResponse(){}});
assert.equal((await broken(new Request('https://test/'))).status,500);
assert(!lines.join('\n').includes('SECRET'));
assert(lines.every(line=>JSON.parse(line).timestamp));
console.log('JSON logging checks passed: schemas, request correlation, privacy, HEAD/405/404/500 and cache status.');
