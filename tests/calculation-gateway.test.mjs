import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {startCalculator} from '../lib/calculation.mjs';
import {createHttpHandler} from '../lib/http-handler.mjs';
import {createStaticResponse} from '../lib/static-response.mjs';

const values=new Map();
let now=0,writes=0,hits=0;
const redis={
  async send(command,[key,value,policy,seconds]){
    if(command==='GET'){
      const cached=values.get(key);
      if(cached && cached.expires>now){hits++;return cached.value;}
      values.delete(key);
      return null;
    }
    assert.equal(command,'SET');
    assert.equal(policy,'EX');
    assert.ok(Number(seconds)>0);
    values.set(key,{value,expires:now+Number(seconds)*1000});
    writes++;
  }
};
const calculator=startCalculator({binary:new URL('../build/solar-calc',import.meta.url).pathname,redis});
const handle=createHttpHandler({
  calculator,assets:new Map([['/system-sizing','system-sizing.html']]),
  fileResponse:createStaticResponse(new URL('../build/dist/',import.meta.url)),
  visitors:{visit:async()=>null},logger:{info(){},warn(){},error(){}}
});
const get=path=>handle(new Request('http://local'+path));
const post=(op,body)=>handle(new Request('http://local/api/calc/'+op,{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)
}));
async function calculate(op,body){
  const response=await post(op,body);
  const payload=await response.text();
  assert.equal(response.status,200,op+': '+payload.slice(0,200));
  assert.match(response.headers.get('cache-control'),/private, no-store/);
  return JSON.parse(payload);
}
const closeTo=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} ≠ ${expected}`);
const panels=[[[-1,2,-1],[1,2,-1],[1,2,1],[-1,2,1]]];
const scene={house:0,bearing:180,tilt:0,volumes:[],panels};
const location={lat:0,lon:0,offset:0};
const system={losses:{temperature:0,wiring:0,soiling:0,other:0},
  inverter:{acKw:5,maxPvKw:7.5,efficiency:100,mpptCount:1,mpptMinV:120,mpptMaxV:550,mpptMaxA:16,operatingV:350}};
try {
  const sizingInput={day:20,night:30,watts:600,yieldPerKwp:4};
  const initial=await calculate('sizing',sizingInput);
  assert.equal(initial.panels,23);assert.equal(initial.batteryKwh,36);
  assert.equal(writes,1);
  assert.deepEqual(await calculate('sizing',sizingInput),initial);
  assert.equal(hits,1);assert.equal(writes,1);
  now=Math.max(...[...values.values()].map(entry=>entry.expires))+1;
  assert.deepEqual(await calculate('sizing',sizingInput),initial);
  assert.equal(writes,2,'Expired cache entry must recompute through the worker');
  assert.equal((await post('sizing',{...sizingInput,day:-1})).status,400);
  assert.equal(writes,2,'Failed validations must never enter Redis');

  const reference=JSON.parse(await readFile(new URL('fixtures/noaa.json',import.meta.url),'utf8')).rows[1];
  const {day,lat,lon,offset}=reference;
  const solar=await calculate('solar',{day,lat,lon,offset});
  assert.equal(solar.positions.length,1441);
  closeTo(solar.events.rise,reference.rise,2);
  closeTo(solar.events.set,reference.set,2);
  for(const expected of reference.positions){
    const [altitude,azimuth]=solar.positions[expected.minute];
    closeTo(altitude,expected.altitude,.01);closeTo(azimuth,expected.azimuth,.01);
  }
  const nextDay=await calculate('solar',{day:'2026-12-21',lat,lon,offset});
  assert.notEqual(nextDay.events.rise,solar.events.rise,'Changing dates must use another ephemeris');

  const sun={azimuth:0,altitude:90};
  const open=await calculate('shade',{scene,sun});
  assert.equal(open.panels[0].litFraction,1);
  const overhang=[[1,0,0,0],[-1,0,0,2],[0,1,0,4],[0,-1,0,-3],[0,0,1,2],[0,0,-1,2]];
  const shaded=await calculate('shade',{scene:{...scene,volumes:[overhang]},sun});
  assert.equal(shaded.panels[0].litFraction,.5);assert.equal(shaded.panels[0].cells.filter(Boolean).length,18);

  // One hour of measured GTI, one horizontal 600 W panel, no losses. The
  // 0.4 kW inverter clips 0.6 kW at full irradiation but not at half.
  const end=Date.parse('2026-03-20T12:00:00Z')/1000;
  const forecast={start:end-3600,end,watts:600,location,scene,system:{...system,inverter:{...system.inverter,acKw:.4}},
    hourly:{time:[end],global_tilted_irradiance:[1000],direct_normal_irradiance:[0]}};
  const high=(await calculate('energy',forecast)).result;
  closeTo(high.dcKwh,.6);closeTo(high.kwh,.4);closeTo(high.clippingKwh,.2);
  closeTo(high.hours[0].panels[0].acKwh,.4);
  const revised={...forecast,hourly:{...forecast.hourly,global_tilted_irradiance:[500]}};
  const low=(await calculate('energy',revised)).result;
  closeTo(low.kwh,.3);closeTo(low.clippingKwh,0);
  assert.equal((await post('energy',{...forecast,hourly:{time:[end]}})).status,422);

  const annual=await calculate('annual',{year:2026,annualPoa:1600,watts:600,location,system,scene,layouts:[panels]});
  assert.equal(annual.length,1);closeTo(annual[0].rawDcKwh,960);closeTo(annual[0].acKwh,960);closeTo(annual[0].shadeLossKwh,0);
  const request={date:'2026-03-20',location,config:{...scene,width:8,length:10,house:0,tilt:85,bearing:90,x:0,z:0,floors:1,roof:0},
    module:{width:1,length:2},outline:[[-4,-5],[4,-5],[4,5],[-4,5]],positions:[{x:0,z:0,rotation:0}],volumes:[]};
  const optimum=await calculate('recommend',request);
  assert.ok(optimum.score>optimum.baseline);
  assert.ok(optimum.tilt<20,'Near-equatorial equinox should favor a shallow tilt');
  assert.deepEqual(optimum.positions,request.positions);
  assert.equal((await post('recommend',{...request,positions:[{x:100,z:0}]})).status,400);

  assert.equal((await get('/api/calc/solar')).status,405);
  assert.equal((await post('unknown',sizingInput)).status,404);
  for(const path of ['/backend/solar.go','/solar-calc','/backend/energy.go'])assert.equal((await get(path)).status,404);
  const sizing=await get('/system-sizing?day=15&night=0');
  const html=await sizing.text();assert.match(html,/7 tấm · 4.20 kWp/);assert.match(html,/id="sizing-night"[^>]*value="0"/);
  console.log('Private Go gateway passed: solar/NOAA, per-cell shade, revised irradiation, clipping, annual output, orientation, Redis hits/expiry, SSR and private routes.');
}finally{calculator.close();}
