const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const elements = new Map();
function get(id) {
  if (!elements.has(id)) elements.set(id, { value: '', textContent: '', innerHTML: '', style: {}, setAttribute() {}, addEventListener(type, fn) { this[type] = fn; } });
  return elements.get(id);
}
let fail = false;
const context = {
  isSolarCalculator: true,
  document: { getElementById: get, hidden: false },
  Solar: require('../dist/solar.js'), Date, Math, URLSearchParams, AbortController,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  ForecastClient: { fetch: async () => {
    if (fail) throw new Error('Offline');
    return { ok: true, json: async () => ({ current: { cloud_cover: 92, rain: 0.2, showers: 0.1, weather_code: 61, time: Date.now() / 1000, interval: 900 } }) };
  } },
};
vm.createContext(context);
(async () => {
  vm.runInContext(fs.readFileSync(require.resolve('../dist/app.js'), 'utf8'), context);
  await vm.runInContext('locationReady = true; loadWeather(true)', context);
  assert.match(get('weather-cloud').textContent, /92%/);
  assert.match(get('weather-rain').textContent, /Có mưa.*0.30 mm/);
  assert.match(get('clouds').innerHTML, /rain-drop/);
  get('date').value = '2020-01-01';
  vm.runInContext('updateWeatherVisibility()', context);
  assert.equal(get('clouds').style.display, 'none');
  fail = true;
  await vm.runInContext('loadWeather(true)', context);
  assert.equal(get('clouds').innerHTML, '');
  assert.equal(get('weather-rain').textContent, 'Mưa: —');
  assert.match(get('weather-status').textContent, /Không lấy được/);
  context.isSolarCalculator = false;
  get('weather-status').textContent = 'home';
  await vm.runInContext('loadWeather(true)', context);
  assert.equal(get('weather-status').textContent, 'home', 'Home must not request weather');
  context.isSolarCalculator = true;
  context.hideCurrentWeather = true;
  get('weather-status').textContent = 'hidden';
  await vm.runInContext('loadWeather(true)', context);
  assert.equal(get('weather-status').textContent, 'hidden', 'Calculator must not request removed current weather');
  console.log('Weather checks passed: live payload, rain rendering, simulated date, network failure.');
})().catch(error => { console.error(error); process.exitCode = 1; });
