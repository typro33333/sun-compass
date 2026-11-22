// Usage: bun scripts/generate-noaa-fixtures.cjs /path/to/noaa-main.js
// Download reference from https://gml.noaa.gov/grad/solcalc/main.js
const fs = require('node:fs'), vm = require('node:vm'), crypto = require('node:crypto');
const source = fs.readFileSync(process.argv[2], 'utf8');
const ref = vm.createContext({});
vm.runInContext(source, ref);
// Match our geometric altitude contract, excluding atmospheric refraction.
vm.runInContext('calcRefraction = function() { return 0; }', ref);
const sites = [[0,0,0],[10.8231,106.6297,7],[40.7128,-74.006,-4],[51.5074,-.1278,1],[-33.8688,151.2093,11],[27.7172,85.324,5.75],[1.8721,-157.4278,14],[80,20,1],[-80,20,1]];
const rows = [];
for (const day of ['2026-03-20','2026-06-21','2026-09-23','2026-12-21','2024-02-29']) {
 for (const [lat,lon,offset] of sites) {
  const jd = ref.getJD(...day.split('-').map(Number));
  const positions = [0,540,720,1080,1439].map(minute => {
   const value = ref.calcAzEl(ref.calcTimeJulianCent(jd + (minute-offset*60)/1440), ((minute-offset*60)%1440+1440)%1440, lat, lon, 0);
   return {minute,azimuth:value.azimuth,altitude:value.elevation};
  });
  // NOAA returns neighboring-day events in polar conditions; retain only this civil day.
  const event = rise => {
   for (const shift of [-1,0,1]) {
    const value = ref.calcSunriseSet(rise,jd+shift,lat,lon,offset);
    if (value.jday === jd && value.azimuth >= 0) return value.timelocal;
   }
   return null;
  };
  rows.push({day,lat,lon,offset,positions,rise:event(1),set:event(0)});
 }
}
fs.writeFileSync('tests/fixtures/noaa.json', JSON.stringify({source:'https://gml.noaa.gov/grad/solcalc/main.js',sha256:crypto.createHash('sha256').update(source).digest('hex'),altitude:'geometric; refraction disabled',rows},null,2)+'\n');
