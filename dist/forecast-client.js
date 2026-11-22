(() => {
  const pending = new Map(), cache = new Map();
  const blocked = new Map();
  const storageKey = 'sol-forecast-cache-v3';
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) for (const [key, entry] of saved.slice(-16)) {
      if (entry?.expires > Date.now() && entry.expires < Date.now() + 1801000) cache.set(key, entry);
    }
  } catch {}
  function persist() {
    for (const [key, value] of cache) if (value.expires <= Date.now()) cache.delete(key);
    while (cache.size > 16) cache.delete(cache.keys().next().value);
    try { sessionStorage.setItem(storageKey, JSON.stringify([...cache])); } catch {}
  }
  function keyFor(params) {
    const normalized = new URLSearchParams(params);
    for (const key of ['latitude', 'longitude']) normalized.set(key, Number(normalized.get(key)).toFixed(4));
    normalized.sort();
    return normalized.toString();
  }
  async function fetchForecast(params, { signal } = {}) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    for (const [key, until] of blocked) if (until <= Date.now()) blocked.delete(key);
    while (blocked.size > 64) blocked.delete(blocked.keys().next().value);
    const query = keyFor(params);
    const key = `${new Date().toISOString().slice(0, 10)}|${query}`, existing = cache.get(key);
    if (existing?.expires > Date.now()) return Response.json(existing.data);
    if (Date.now() < (blocked.get(key) || 0)) return Response.json({ error: 'Please wait before retrying' }, { status: 429 });
    let task = pending.get(key);
    if (!task) {
      task = (async () => {
        let response;
        for (let attempt = 0; attempt < 3; attempt++) {
          let retryAfter = 0;
          try {
            response = await fetch(`/api/forecast?${query}`, { signal: AbortSignal.timeout(3000) });
            if (response.ok) break;
            if (![408, 429, 500, 502, 503, 504].includes(response.status)) return { ok: false, status: response.status };
            const header = response.headers.get('Retry-After');
            retryAfter = header === null ? 0 : /^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - Date.now()) || 0;
            if (retryAfter > 2000 || attempt === 2) {
              blocked.set(key, Date.now() + Math.max(15000, retryAfter));
              return { ok: false, status: response.status };
            }
          } catch (error) {
            if (attempt === 2) { blocked.set(key, Date.now() + 15000); throw error; }
          }
          await new Promise(resolve => setTimeout(resolve, Math.max(retryAfter, 250 * 2 ** attempt + Math.random() * 100)));
        }
        const data = await response.json();
        const expires = Date.parse(data._cache?.expires_at);
        if (!data._cache?.stale && Number.isFinite(expires) && expires > Date.now()) {
          cache.set(key, { data, expires: Math.min(expires, Date.now() + 1800000) }); persist();
        }
        return { ok: true, data };
      })().finally(() => pending.delete(key));
      pending.set(key, task);
    }
    // Cancelling a consumer must not cancel the shared network request.
    const result = await new Promise((resolve, reject) => {
      const abort = () => { cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
      const cleanup = () => signal?.removeEventListener('abort', abort);
      signal?.addEventListener('abort', abort, { once: true });
      task.then(value => { cleanup(); resolve(value); }, error => { cleanup(); reject(error); });
    });
    return result.ok ? Response.json(result.data) : Response.json({ error: 'Forecast unavailable' }, { status: result.status });
  }
  globalThis.ForecastClient = { fetch: fetchForecast };
})();
