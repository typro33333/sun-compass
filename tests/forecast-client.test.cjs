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
(async () => {
  let calls = 0, now = Date.now(); const waits = [];
  const ctx = { URLSearchParams, Response, DOMException, AbortSignal, Math,
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } },
    sessionStorage:{getItem:()=>null,setItem(){}},
    setTimeout(fn, ms) { waits.push(ms); fn(); },
    fetch: async () => { calls++; if (calls < 3) return new Response('',{status:503}); return Response.json({_cache:{expires_at:new Date(now+600000).toISOString()},value:42}); }
  };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(require.resolve('../dist/forecast-client.js'),'utf8'),ctx);
  const params = new URLSearchParams({latitude:'10.82311',longitude:'106.62971',current:'cloud_cover'});
  assert.equal((await ctx.ForecastClient.fetch(params)).status,200);
  assert.equal(calls,3); assert.equal(waits.length,2); assert(waits[1]>waits[0]);
  params.set('latitude','10.82312'); await ctx.ForecastClient.fetch(params); assert.equal(calls,3,'Rounded coordinates share cache');
  params.set('hourly','rain'); await ctx.ForecastClient.fetch(params); assert.equal(calls,4,'Data types have separate keys');
  now += 86400000; await ctx.ForecastClient.fetch(params); assert.equal(calls,5,'Date rollover refreshes cache');
  ctx.fetch = async () => { calls++; return new Response('',{status:429,headers:{'Retry-After':'60'}}); };
  params.set('hourly','showers');
  assert.equal((await ctx.ForecastClient.fetch(params)).status,429);
  const count = calls; await ctx.ForecastClient.fetch(params); assert.equal(calls,count,'Honors server cooldown');
  ctx.fetch = async () => { calls++; return new Response('',{status:400}); };
  params.set('hourly','other'); assert.equal((await ctx.ForecastClient.fetch(params)).status,400);
  assert.equal(calls,count+1,'No retry for permanent errors; cooldown is per key');
  console.log('Retry checks passed: bounded backoff, rounded keys, types, day rollover, Retry-After and permanent errors.');
})().catch(error=>{console.error(error);process.exitCode=1;});
