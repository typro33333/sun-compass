(() => {
  const pending = new Map(), cache = new Map();
  let blockedUntil = 0;
  const storageKey = 'sol-forecast-cache-v2';
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
    const key = keyFor(params), existing = cache.get(key);
    if (existing?.expires > Date.now()) return Response.json(existing.data);
    if (Date.now() < blockedUntil) return Response.json({ error: 'Please wait before retrying' }, { status: 429 });
    let task = pending.get(key);
    if (!task) {
      task = (async () => {
        const response = await fetch(`/api/forecast?${key}`, { signal: AbortSignal.timeout(14000) });
        if (!response.ok) {
          const seconds = Number(response.headers.get('Retry-After'));
          blockedUntil = Date.now() + Math.max(15, Number.isFinite(seconds) ? seconds : 60) * 1000;
          return { ok: false, status: response.status };
        }
        const data = await response.json();
        const expires = Date.parse(data._cache?.expires_at);
        if (!data._cache?.stale && Number.isFinite(expires) && expires > Date.now()) {
          cache.set(key, { data, expires: Math.min(expires, Date.now() + 1800000) }); persist();
        }
        return { ok: true, data };
      })().catch(error => { blockedUntil = Date.now() + 15000; throw error; }).finally(() => pending.delete(key));
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
