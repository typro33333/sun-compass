const assert = require('node:assert/strict');
const solar = require('../dist/solar.js');
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
