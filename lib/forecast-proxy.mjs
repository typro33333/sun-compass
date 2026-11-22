const CURRENT = 'cloud_cover,rain,showers,weather_code';
const HOURLY_SYSTEM = 'global_tilted_irradiance,direct_normal_irradiance,cloud_cover,rain,showers';
const HOURLY = 'global_tilted_irradiance,cloud_cover,rain,showers';
const MINUTE = 60000;
class ApiError extends Error {
  constructor(status, message, retry = 0) { super(message); this.status = status; this.retry = retry; }
}
// Approximate 2 km cells; longitude spacing follows each latitude row.
export function weatherGrid(lat, lon) {
  const step = 2 / 111.32;
  const latitude = Math.max(-90, Math.min(90, Math.round(lat / step) * step));
  const longitudeStep = Math.min(360, step / Math.max(0.000001, Math.cos(latitude * Math.PI / 180)));
  const longitude = Math.max(-180, Math.min(180, Math.round(lon / longitudeStep) * longitudeStep));
  return { latitude, longitude };
}
export function normalizeForecast(input, now = Date.now()) {
  const allowed = new Set(['latitude', 'longitude', 'current', 'hourly', 'tilt', 'azimuth', 'timezone', 'timeformat', 'start_date', 'end_date']);
  for (const [key] of input) if (!allowed.has(key) || input.getAll(key).length !== 1) throw new ApiError(400, 'Invalid forecast parameter');
  function number(key, min, max) {
    const raw = input.get(key), value = Number(raw);
    if (raw === null || raw.trim() === '' || !Number.isFinite(value) || value < min || value > max) throw new ApiError(400, 'Invalid ' + key);
    return value;
  }
  const grid = weatherGrid(number('latitude', -90, 90), number('longitude', -180, 180));
  const latitude = grid.latitude.toFixed(5);
  const longitude = grid.longitude.toFixed(5);
  const params = new URLSearchParams({ latitude, longitude, timezone: 'UTC', timeformat: 'unixtime' });
  if (input.get('timezone') !== 'UTC' || input.get('timeformat') !== 'unixtime') throw new ApiError(400, 'Only UTC Unix timestamps are supported');
  let kind, ttl;
  if (input.get('current') === CURRENT && !input.has('hourly')) {
    if (['tilt', 'azimuth', 'start_date', 'end_date'].some(k => input.has(k))) throw new ApiError(400, 'Unexpected current-weather parameter');
    kind = 'current'; ttl = 10 * MINUTE;
    params.set('current', CURRENT);
  } else if ([HOURLY,HOURLY_SYSTEM].includes(input.get('hourly')) && !input.has('current')) {
    kind = 'hourly'; ttl = 30 * MINUTE;
    params.set('hourly', input.get('hourly'));
    params.set('tilt', String(number('tilt', 0, 90)));
    params.set('azimuth', String(number('azimuth', -180, 180)));
    const dates = ['start_date', 'end_date'].map(key => {
      const value = input.get(key);
      const time = Date.parse(value + 'T00:00:00Z');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value || Math.abs(time - now) > 5 * 86400000) throw new ApiError(400, 'Invalid forecast date');
      params.set(key, value);
      return time;
    });
    if (dates[1] < dates[0] || dates[1] - dates[0] > 4 * 86400000) throw new ApiError(400, 'Forecast range too large');
  } else throw new ApiError(400, 'Unsupported forecast variables');
  return { key: params.toString(), params, kind, ttl };
}
export function createForecastProxy({ fetcher = fetch, now = Date.now, maxEntries = 1500, maxConcurrent = 8, perMinute = 50, perDay = 5000, apiKey = '' } = {}) {
  const cache = new Map(), pending = new Map(), failures = new Map();
  let minuteWindow = -1, dayWindow = -1, minuteCount = 0, dayCount = 0, cooldownUntil = 0;
  const stats = { upstream: 0, hits: 0, joined: 0, stale: 0, rejected: 0 };
  function response(entry, spec, mode) {
    const stale = now() >= entry.expires;
    const remaining = Math.max(0, Math.floor((entry.expires - now()) / 1000));
    return Response.json({ ...entry.data, _cache: { status: mode, stale, fetched_at: new Date(entry.fetched).toISOString(), expires_at: new Date(entry.expires).toISOString(), latitude: Number(spec.params.get('latitude')), longitude: Number(spec.params.get('longitude')) } }, {
      headers: { 'Cache-Control': stale ? 'no-store' : `private, max-age=${remaining}`, 'X-Forecast-Cache': mode, 'X-Content-Type-Options': 'nosniff' },
    });
  }
  function trim() {
    for (const [key, entry] of cache) if (entry.staleUntil < now()) cache.delete(key);
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }
  async function request(spec) {
    const time = now();
    if (time < cooldownUntil) throw new ApiError(429, 'Weather provider is cooling down', Math.ceil((cooldownUntil - time) / 1000));
    const minute = Math.floor(time / MINUTE), day = Math.floor(time / 86400000);
    if (minute !== minuteWindow) { minuteWindow = minute; minuteCount = 0; }
    if (day !== dayWindow) { dayWindow = day; dayCount = 0; }
    if (pending.size >= maxConcurrent) throw new ApiError(503, 'Forecast queue is busy', 15);
    if (minuteCount >= perMinute || dayCount >= perDay) throw new ApiError(429, 'Forecast request budget reached', dayCount >= perDay ? Math.ceil(((day + 1) * 86400000 - time) / 1000) : 60);
    minuteCount++; dayCount++; stats.upstream++;
    const url = new URL(apiKey ? 'https://customer-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast');
    url.search = spec.key;
    if (apiKey) url.searchParams.set('apikey', apiKey);
    const result = await fetcher(url, { signal: AbortSignal.timeout(12000) });
    if (result.status === 429) {
      const retry = result.headers.get('Retry-After');
      const seconds = retry && Number.isFinite(Number(retry)) ? Number(retry) : (Date.parse(retry) - now()) / 1000;
      cooldownUntil = now() + Math.max(60, Number.isFinite(seconds) ? seconds : 300) * 1000;
      throw new ApiError(429, 'Weather provider rate limit', Math.ceil((cooldownUntil - now()) / 1000));
    }
    if (!result.ok) throw new ApiError(502, 'Weather provider unavailable', 60);
    const data = await result.json();
    if (data.error || (spec.kind === 'current' ? !Number.isFinite(data.current?.time) : !Array.isArray(data.hourly?.time) || !Array.isArray(data.hourly?.global_tilted_irradiance))) throw new ApiError(502, 'Invalid weather response', 60);
    const fetched = now();
    const entry = { data, fetched, expires: fetched + spec.ttl, staleUntil: fetched + (spec.kind === 'current' ? 30 * MINUTE : 120 * MINUTE) };
    cache.set(spec.key, entry); trim();
    return entry;
  }
  async function handle(url) {
    let spec, entry;
    try {
      spec = normalizeForecast(new URL(url).searchParams, now());
      entry = cache.get(spec.key);
      if (entry && now() < entry.expires) { stats.hits++; return response(entry, spec, 'hit'); }
      const failure = failures.get(spec.key);
      if (failure?.until > now()) throw failure.error;
      let task = pending.get(spec.key);
      if (task) stats.joined++;
      else {
        task = request(spec).catch(error => {
          failures.set(spec.key, { error, until: now() + 60000 });
          while (failures.size > maxEntries) failures.delete(failures.keys().next().value);
          throw error;
        }).finally(() => pending.delete(spec.key));
        pending.set(spec.key, task);
      }
      return response(await task, spec, 'fresh');
    } catch (error) {
      if (entry && now() < entry.staleUntil) { stats.stale++; return response(entry, spec, 'stale'); }
      stats.rejected++;
      return Response.json({ error: 'Forecast temporarily unavailable', message: error instanceof ApiError ? error.message : 'Weather request failed' }, { status: error.status || 502, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(error.retry || 60) } });
    }
  }
  return { handle, stats };
}
