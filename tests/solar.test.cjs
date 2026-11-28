const assert = require('node:assert/strict');
const solar = require('./reference/solar.cjs');
const equinox = solar.events('2026-03-20', 0, 0, 0);
assert(Math.abs(equinox.rise - 360) < 15, 'Equatorial sunrise near 06:00');
assert(Math.abs(equinox.set - 1080) < 15, 'Equatorial sunset near 18:00');
assert(solar.position('2026-03-20', 720, 0, 0, 0).altitude > 87);
assert.equal(solar.events('2026-06-21', 80, 0, 0).daylight, 1440);
assert.equal(solar.events('2026-12-21', 80, 0, 0).daylight, 0);
const local = solar.position('2026-05-01', 720, 10, 106, 7);
const utc = solar.position('2026-05-01', 300, 10, 106, 0);
assert(Math.abs(local.altitude - utc.altitude) < 0.15);
console.log('Solar checks passed: equinox, polar day/night, UTC offset.');
const summer = solar.events('2026-06-21', 21, 105, 7);
const winter = solar.events('2026-12-21', 21, 105, 7);
const summerRise = solar.position('2026-06-21', summer.rise, 21, 105, 7).azimuth;
const winterRise = solar.position('2026-12-21', winter.rise, 21, 105, 7).azimuth;
assert(summerRise < 90 && winterRise > 90, 'Sunrise shifts across east with the seasons');
assert(summer.daylight > winter.daylight, 'Northern summer has longer daylight');
console.log('Seasonal direction and daylight checks passed.');
const reference = require('./fixtures/noaa.json');
let maxAngle = 0, maxTime = 0;
for (const row of reference.rows) {
  const args = [row.day, row.lat, row.lon, row.offset];
  for (const expected of row.positions) {
    const actual = solar.position(row.day, expected.minute, row.lat, row.lon, row.offset);
    const azError = Math.abs(((actual.azimuth - expected.azimuth + 540) % 360) - 180);
    const altError = Math.abs(actual.altitude - expected.altitude);
    maxAngle = Math.max(maxAngle, azError, altError);
    assert(azError < .01 && altError < .01, `NOAA position ${args} minute ${expected.minute}`);
  }
  const actual = solar.events(...args);
  for (const type of ['rise','set']) {
    if (row[type] === null) assert.equal(actual[type], null, `NOAA polar ${args} ${type}`);
    else {
      assert.notEqual(actual[type], null);
      const error = Math.abs(actual[type] - row[type]);
      maxTime = Math.max(maxTime, error);
      assert(error < 2, `NOAA event ${args} ${type}: ${error} minutes`);
    }
  }
}
const a = solar.position('2026-03-20', 60, 27, 85, 5.75);
const b = solar.position('2026-03-19', 1155, 27, 85, 0);
assert(Math.abs(a.altitude-b.altitude) < 1e-8, 'UTC previous-day equivalence');
for (const lat of [-90, -80, 80, 90]) for (const day of ['2026-06-21','2026-12-21']) {
  const value = solar.events(day,lat,0,0);
  assert.equal(value.rise,null); assert.equal(value.set,null);
  assert.equal(value.daylight, (lat > 0) === (day.includes('06-21')) ? 1440 : 0);
}
console.log(`NOAA: ${reference.rows.length} days/sites, ${reference.rows.length*5} positions; max angle ${maxAngle.toFixed(6)}°, max event ${maxTime.toFixed(3)} min.`);

async function testSolarClient(calculator){
  const fs=require('node:fs'),vm=require('node:vm');
  const fields=new Map(),listeners={},requests=[];
  function node(id){
    if(!fields.has(id))fields.set(id,{value:'',textContent:'',innerHTML:'',style:{},dataset:{},addEventListener(k,fn){this[k]=fn;},setAttribute(){}});
    return fields.get(id);
  }
  const context=vm.createContext({
    document:{getElementById:node},isSolarCalculator:calculator,hideCurrentWeather:true,Date,AbortSignal,AbortController,
    addEventListener:(name,fn)=>listeners[name]=fn,clearInterval(){},setInterval:()=>1,
    fetch:(url,{body})=>new Promise(resolve=>requests.push({url,body:JSON.parse(body),resolve}))
  });
  for(const name of ['solar','app'])vm.runInContext(fs.readFileSync(require.resolve('../dist/'+name+'.js'),'utf8'),context);
  function refresh(day){node('date').value=day;return vm.runInContext('locationReady=true;refresh()',context);}
  const day='2026-06-21',next='2026-06-22',older='2026-06-23',newer='2026-06-24';
  const data=(rise)=>Response.json({events:{rise,set:1080,daylight:720},positions:Array.from({length:1441},(_,i)=>[30,i===0?359:1])});
  const first=refresh(day);
  assert.equal(node('play').disabled,true);assert.equal(node('solar-service-notice').hidden,false);
  requests.at(-1).resolve(new Response(null,{status:503}));await first;
  assert.equal(node('solar-retry').hidden,false);assert.equal(node('rise-time').textContent,'—');
  const retry=node('solar-retry').onclick();
  requests.at(-1).resolve(data(361));await retry;
  assert.equal(node('rise-time').textContent,'06:01');assert.equal(node('solar-service-notice').hidden,true);
  const angles=vm.runInContext('Solar.position($("date").value,.5,lat,lon,offset)',context);
  assert.equal(angles.azimuth,0,'Interpolate across north on the shortest arc');
  const count=requests.length;
  await refresh(day);assert.equal(requests.length,count,'Slider and revisited dates reuse the cached ephemeris');
  const failed=refresh(next);requests.at(-1).resolve(new Response(null,{status:503}));await failed;
  listeners.online();requests.at(-1).resolve(data(362));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(node('rise-time').textContent,'06:02');
  const a=refresh(older),respondA=requests.at(-1).resolve,b=refresh(newer);
  requests.at(-1).resolve(data(364));await b;respondA(data(363));await a;
  assert.equal(node('rise-time').textContent,'06:04','Slow older responses cannot replace the active date');
}
Promise.all([testSolarClient(false),testSolarClient(true)]).then(()=>console.log('Solar client checks passed: loading, failure, retry, reconnect, cached day, north crossing and stale responses on both pages.')).catch(error=>{console.error(error);process.exitCode=1;});
