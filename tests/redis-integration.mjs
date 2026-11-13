// Explicit integration test. Requires a running Redis 7.2+; isolated random prefix.
import { RedisClient } from 'bun';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRedisForecastProxy } from '../lib/redis-forecast.mjs';
const connection = process.env.REDIS_TEST_URL || 'redis://127.0.0.1:6379';
const r1 = new RedisClient(connection, {connectionTimeout:2000,enableOfflineQueue:false});
const r2 = new RedisClient(connection, {connectionTimeout:2000,enableOfflineQueue:false});
const prefix = `sol-test:{${randomUUID()}}`;
const params = new URLSearchParams({latitude:'10.8231',longitude:'106.6297',current:'cloud_cover,rain,showers,weather_code',timezone:'UTC',timeformat:'unixtime'});
const url = 'http://localhost/api/forecast?' + params;
let calls = 0, rateLimited = false;
const fetcher = async () => {
  calls++;
  await new Promise(resolve=>setTimeout(resolve,100));
  return rateLimited ? new Response('',{status:429,headers:{'Retry-After':'120'}}) : Response.json({current:{time:Date.now()/1000,cloud_cover:80}});
};
try {
  await Promise.all([r1.connect(),r2.connect()]);
  const p1 = createRedisForecastProxy({redis:r1,fetcher,prefix});
  const p2 = createRedisForecastProxy({redis:r2,fetcher,prefix});
  const results = await Promise.all(Array.from({length:100},(_,i)=>(i%2?p1:p2).handle(url)));
  assert(results.every(r=>r.status===200));assert.equal(calls,1);
  const restarted = createRedisForecastProxy({redis:r2,fetcher,prefix});
  assert.equal((await restarted.handle(url)).status,200);assert.equal(calls,1);
  rateLimited=true;params.set('latitude','20');
  assert.equal((await p1.handle('http://localhost/api/forecast?'+params)).status,429);
  const before=calls;params.set('latitude','30');
  assert.equal((await p2.handle('http://localhost/api/forecast?'+params)).status,429);assert.equal(calls,before);
  // Quota shared across replicas with a separate isolated namespace.
  rateLimited=false;
  const budgetPrefix=prefix+':budget';
  const b1=createRedisForecastProxy({redis:r1,fetcher,prefix:budgetPrefix,perDay:1});
  const b2=createRedisForecastProxy({redis:r2,fetcher,prefix:budgetPrefix,perDay:1});
  assert.equal((await b1.handle(url)).status,200);
  assert.equal((await b2.handle('http://localhost/api/forecast?'+params)).status,429);
  console.log('Redis integration passed: 100 requests / 2 replicas → 1 provider call, restart cache, shared cooldown and quota.');
} finally {
  try {
    let cursor='0';
    do {
      const result=await r1.send('SCAN',[cursor,'MATCH',prefix+'*','COUNT','100']);
      cursor=String(result[0]);
      if(result[1].length)await r1.send('DEL',result[1]);
    } while(cursor!=='0');
  } catch {}
  r1.close();r2.close();
}
