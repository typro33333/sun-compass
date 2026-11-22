// NOAA/Meeus geometry, https://gml.noaa.gov/grad/solcalc/calcdetails.html
// Altitude is geometric (no refraction); sunrise/set use the -0.833° horizon.
(function(root) {
 const R = Math.PI / 180, cache = new Map();
 const wrap = value => (value % 360 + 360) % 360;
 function position(day, minute, lat, lon, offset) {
  // Evaluate orbital elements at the actual UTC instant, including date rollover.
  const jd = Date.parse(day + 'T00:00:00Z') / 86400000 + 2440587.5 + (minute - offset * 60) / 1440;
  const t = (jd - 2451545) / 36525;
  const l = wrap(280.46646 + t * (36000.76983 + t * .0003032)) * R;
  const m = (357.52911 + t * (35999.05029 - .0001537 * t)) * R;
  const e = .016708634 - t * (.000042037 + .0000001267 * t);
  const center = Math.sin(m) * (1.914602 - t * (.004817 + .000014 * t)) + Math.sin(2*m) * (.019993 - .000101*t) + .000289*Math.sin(3*m);
  const omega = (125.04 - 1934.136*t)*R;
  const ob = (23 + (26 + (21.448 - t*(46.815 + t*(.00059 - t*.001813)))/60)/60 + .00256*Math.cos(omega))*R;
  const dec = Math.asin(Math.sin(ob)*Math.sin(l + (center - .00569 - .00478*Math.sin(omega))*R));
  const y = Math.tan(ob/2)**2;
  const eq = 4/R*(y*Math.sin(2*l) - 2*e*Math.sin(m) + 4*e*y*Math.sin(m)*Math.cos(2*l) - .5*y*y*Math.sin(4*l) - 1.25*e*e*Math.sin(2*m));
  const h = (wrap((minute + eq + 4*lon - 60*offset)/4) - 180)*R, p = lat*R;
  const altitude = Math.asin(Math.max(-1, Math.min(1, Math.sin(p)*Math.sin(dec) + Math.cos(p)*Math.cos(dec)*Math.cos(h))))/R;
  const azimuth = wrap(Math.atan2(Math.sin(h), Math.cos(h)*Math.sin(p) - Math.tan(dec)*Math.cos(p))/R + 180);
  return { altitude, azimuth };
 }
 function events(day, lat, lon, offset) {
  lat = Number(lat.toFixed(4)); lon = Number(lon.toFixed(4));
  const key = `events|${day}|${lat}|${lon}|${offset}`;
  if (cache.has(key)) return { ...cache.get(key) };
  let rise = null, set = null, above = 0;
  let prev = position(day, 0, lat, lon, offset).altitude + .833;
  for (let m = 1; m <= 1440; m++) {
   const v = position(day, m, lat, lon, offset).altitude + .833;
   if (v >= 0) above++;
   if (prev < 0 && v >= 0) rise = m - 1 - prev/(v-prev);
   if (prev >= 0 && v < 0) set = m - 1 - prev/(v-prev);
   prev = v;
  }
  const result = { rise, set, daylight: above };
  cache.set(key, result);
  if (cache.size > 64) cache.delete(cache.keys().next().value);
  return { ...result };
 }
 root.Solar = { position, events };
 if (typeof module !== 'undefined') module.exports = root.Solar;
})(typeof window !== 'undefined' ? window : globalThis);
