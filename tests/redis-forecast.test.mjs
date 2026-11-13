import assert from 'node:assert/strict';
import { createRedisForecastProxy } from '../lib/redis-forecast.mjs';
import { weatherGrid, normalizeForecast } from '../lib/forecast-proxy.mjs';
const params = new URLSearchParams({ latitude:'10.8231',longitude:'106.6297',current:'cloud_cover,rain,showers,weather_code',timezone:'UTC',timeformat:'unixtime' });
let calls = 0;
const broken = createRedisForecastProxy({ redis:{ send:async()=>{throw Error('Offline');} }, fetcher:async()=>{calls++;} });
assert.equal((await broken.handle('http://localhost/api/forecast?'+params)).status,503);
assert.equal(calls,0, 'Redis outage must never bypass shared protection');
const a = weatherGrid(10.8231,106.6297), b = weatherGrid(10.8232,106.6298);
assert.deepEqual(a,b);
for (const lat of [0,10,45,80,90,-90]) {
  const grid = weatherGrid(lat,120);
  assert(Number.isFinite(grid.latitude) && Number.isFinite(grid.longitude));
  assert(Math.abs(grid.latitude-lat)*111.32<=1.001);
  assert(Math.abs(grid.longitude-120)*111.32*Math.cos(lat*Math.PI/180)<=1.01);
}
const spec = normalizeForecast(params);
assert.equal(Number(spec.params.get('latitude')),Number(a.latitude.toFixed(5)));
console.log('Redis safety and 2 km grid checks passed.');
