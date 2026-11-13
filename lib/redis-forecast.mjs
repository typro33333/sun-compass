import { createHash, randomUUID } from 'node:crypto';
import { normalizeForecast } from './forecast-proxy.mjs';
// All replicas use Redis time, atomic counters and expiring leases.
const CLAIM = `
local t=redis.call('TIME'); local now=t[1]*1000+math.floor(t[2]/1000)
local cooldown=redis.call('PTTL',KEYS[3]); if cooldown>0 then return {429,math.ceil(cooldown/1000)} end
if redis.call('EXISTS',KEYS[1])==1 then return {409,1} end
redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',now)
if redis.call('ZCARD',KEYS[2])>=tonumber(ARGV[4]) then return {503,15} end
local minute=math.floor(now/60000); local day=math.floor(now/86400000)
local mw=tonumber(redis.call('HGET',KEYS[4],'minute') or '-1'); local dw=tonumber(redis.call('HGET',KEYS[4],'day') or '-1')
local mc=0; local dc=0
if mw==minute then mc=tonumber(redis.call('HGET',KEYS[4],'mc') or '0') end
if dw==day then dc=tonumber(redis.call('HGET',KEYS[4],'dc') or '0') end
if mc>=tonumber(ARGV[2]) then return {429,math.ceil(((minute+1)*60000-now)/1000)} end
if dc>=tonumber(ARGV[3]) then return {429,math.ceil(((day+1)*86400000-now)/1000)} end
redis.call('HSET',KEYS[4],'minute',minute,'day',day,'mc',mc+1,'dc',dc+1); redis.call('EXPIRE',KEYS[4],172800)
redis.call('SET',KEYS[1],ARGV[1],'PX',30000)
redis.call('ZADD',KEYS[2],now+30000,ARGV[1]); redis.call('EXPIRE',KEYS[2],60)
return {200,0}`;
const RELEASE = `if redis.call('GET',KEYS[1])==ARGV[1] then redis.call('DEL',KEYS[1]) end; redis.call('ZREM',KEYS[2],ARGV[1]); return 1`;
const STORE = `if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end; redis.call('SET',KEYS[2],ARGV[2],'PX',ARGV[3]); return 1`;
const COOLDOWN = `local ttl=redis.call('PTTL',KEYS[1]); if ttl<tonumber(ARGV[1]) then redis.call('SET',KEYS[1],'1','PX',ARGV[1]) end; return 1`;
function failure(status, message, retry = 60) { return Object.assign(new Error(message), { status, retry }); }
export function createRedisForecastProxy({ redis, fetcher = fetch, apiKey = '', prefix = 'sol:{forecast-v2}', perMinute = 50, perDay = 5000, maxConcurrent = 8, waitMs = 10000 } = {}) {
  const localPending = new Map();
  const stats = { upstream: 0, hits: 0, joined: 0, stale: 0 };
  async function command(name, args) {
    let timer;
    try { return await Promise.race([redis.send(name, args.map(String)), new Promise((_, reject) => { timer = setTimeout(() => reject(failure(503, 'Shared cache unavailable', 15)), 2500); })]); }
    finally { clearTimeout(timer); }
  }
  const lua = (script, keys, args) => command('EVAL', [script, keys.length, ...keys, ...args]);
  const get = async key => { const value = await command('GET', [key]); return value ? JSON.parse(value) : null; };
  const shared = [prefix + ':active', prefix + ':cooldown', prefix + ':quota'];
  function respond(entry, spec, mode) {
    const stale = Date.now() >= entry.expires;
    return Response.json({ ...entry.data, _cache: { status: mode, stale, fetched_at: new Date(entry.fetched).toISOString(), expires_at: new Date(entry.expires).toISOString(), latitude: Number(spec.params.get('latitude')), longitude: Number(spec.params.get('longitude')), grid_km: 2 } }, { headers: { 'Cache-Control': stale ? 'no-store' : `private, max-age=${Math.max(0, Math.floor((entry.expires-Date.now())/1000))}`, 'X-Forecast-Cache': mode } });
  }
  async function obtain(spec) {
    const hash = createHash('sha256').update(spec.key).digest('hex');
    const cacheKey = `${prefix}:data:${hash}`, lock = `${prefix}:lock:${hash}`, negative = `${prefix}:error:${hash}`;
    let cached;
    try {
      cached = await get(cacheKey);
      if (cached?.expires > Date.now()) { stats.hits++; return { entry: cached, mode: 'hit' }; }
      const deadline = Date.now() + waitMs;
      while (true) {
        const recentError = await get(negative);
        if (recentError) throw failure(recentError.status, 'Provider temporarily unavailable', recentError.retry);
        const token = randomUUID();
        const [status, retry] = await lua(CLAIM, [lock, ...shared], [token, perMinute, perDay, maxConcurrent]);
        if (Number(status) === 409) {
          stats.joined++;
          if (Date.now() >= deadline) throw failure(503, 'Forecast still loading', 5);
          await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));
          const filled = await get(cacheKey);
          if (filled?.expires > Date.now()) return { entry: filled, mode: 'shared' };
          continue;
        }
        if (Number(status) !== 200) throw failure(Number(status), 'Shared forecast budget or cooldown reached', Number(retry));
        try {
          // A completed owner may have released its lease just before our claim.
          const filled = await get(cacheKey);
          if (filled?.expires > Date.now()) return { entry: filled, mode: 'shared' };
          const url = new URL(apiKey ? 'https://customer-api.open-meteo.com/v1/forecast' : 'https://api.open-meteo.com/v1/forecast');
          url.search = spec.key; if (apiKey) url.searchParams.set('apikey', apiKey);
          stats.upstream++;
          const upstream = await fetcher(url, { signal: AbortSignal.timeout(12000) });
          if (upstream.status === 429) {
            const raw = upstream.headers.get('Retry-After');
            const seconds = raw && Number.isFinite(Number(raw)) ? Number(raw) : (Date.parse(raw)-Date.now())/1000;
            const retrySeconds = Math.max(60, Number.isFinite(seconds) ? seconds : 300);
            await lua(COOLDOWN, [shared[1]], [Math.ceil(retrySeconds*1000)]);
            throw failure(429, 'Provider rate limit', Math.ceil(retrySeconds));
          }
          if (!upstream.ok) throw failure(502, 'Provider unavailable');
          const data = await upstream.json();
          if (data.error || (spec.kind === 'current' ? !Number.isFinite(data.current?.time) : !Array.isArray(data.hourly?.time) || !Array.isArray(data.hourly?.global_tilted_irradiance))) throw failure(502, 'Invalid provider response');
          const fetched = Date.now(), retention = spec.kind === 'current' ? 1800000 : 7200000;
          const entry = { data, fetched, expires: fetched+spec.ttl, staleUntil: fetched+retention };
          const stored = await lua(STORE, [lock, cacheKey], [token, JSON.stringify(entry), retention]);
          if (!Number(stored)) throw failure(503, 'Forecast lease expired', 5);
          return { entry, mode: 'fresh' };
        } catch (error) {
          await lua(STORE, [lock, negative], [token, JSON.stringify({ status: error.status || 502, retry: error.retry || 60 }), 60000]).catch(() => {});
          throw error;
        } finally { await lua(RELEASE, [lock, shared[0]], [token]).catch(() => {}); }
      }
    } catch (error) {
      if (cached?.staleUntil > Date.now()) { stats.stale++; return { entry: cached, mode: 'stale' }; }
      throw error;
    }
  }
  async function handle(url) {
    try {
      const spec = normalizeForecast(new URL(url).searchParams);
      let task = localPending.get(spec.key);
      if (!task) { task = obtain(spec).finally(() => localPending.delete(spec.key)); localPending.set(spec.key, task); }
      const { entry, mode } = await task;
      return respond(entry, spec, mode);
    } catch (error) {
      return Response.json({ error: 'Forecast temporarily unavailable' }, { status: error.status || 503, headers: { 'Retry-After': String(error.retry || 15), 'Cache-Control': 'no-store' } });
    }
  }
  return { handle, stats };
}
