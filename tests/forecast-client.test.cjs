const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let calls = 0;
const context = { URLSearchParams, Date, Response, DOMException, AbortSignal, sessionStorage:{ getItem:()=>null,setItem(){} }, fetch: async () => {
  calls++;
  await new Promise(resolve => setTimeout(resolve,10));
  return Response.json({current:{cloud_cover:80},_cache:{expires_at:new Date(Date.now()+600000).toISOString(),stale:false}});
} };
vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dist/forecast-client.js'),'utf8'),context);
(async()=>{
  const params = new URLSearchParams({latitude:'10.8231',longitude:'106.6297'});
  const controller = new AbortController();
  const first = context.ForecastClient.fetch(params,{signal:controller.signal});
  const second = context.ForecastClient.fetch(params);
  controller.abort();
  await assert.rejects(first, {name:'AbortError'});
  assert.equal((await second).status,200);
  assert.equal(calls,1);
  assert.equal((await context.ForecastClient.fetch(params)).status,200);assert.equal(calls,1);
  console.log('Client cache checks passed: request sharing, independent cancellation, cache reuse.');
})().catch(error=>{console.error(error);process.exitCode=1;});
