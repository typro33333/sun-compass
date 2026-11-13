import { randomUUID } from 'node:crypto';
const COOKIE = 'sol_device_id';
const YEAR = 31536000;
const RECORD = `
if redis.call('SET',KEYS[1],'1','NX','EX',ARGV[1]) then
  redis.call('XADD',KEYS[2],'MAXLEN','~',10000,'*','event',ARGV[2])
  return 1
end
return 0`;
export function deviceInfo(ua = '') {
  const agent = ua.slice(0, 1024);
  const device = /bot|crawler|spider|headless/i.test(agent) ? 'bot' : /ipad|tablet/i.test(agent) ? 'tablet' : /mobile|iphone|android/i.test(agent) ? 'mobile' : 'desktop_or_unknown';
  const os = /iphone|ipad|ipod/i.test(agent) ? 'iOS' : /android/i.test(agent) ? 'Android' : /windows/i.test(agent) ? 'Windows' : /macintosh|mac os/i.test(agent) ? 'macOS' : /linux/i.test(agent) ? 'Linux' : 'unknown';
  const browser = /Edg(?:e|A|iOS)?\//i.test(agent) ? 'Edge' : /OPR\/|Opera/i.test(agent) ? 'Opera' : /Firefox\/|FxiOS\//i.test(agent) ? 'Firefox' : /Chrome\/|CriOS\//i.test(agent) ? 'Chrome' : /Safari\//i.test(agent) ? 'Safari' : 'unknown';
  return { device, os, browser };
}
export function createVisitorLogger({ redis, log = line => console.log(line), warn = line => console.warn(line), secureCookie = false, timeoutMs = 1000, now = Date.now } = {}) {
  let lastWarning = -Infinity;
  async function visit(request) {
    const cookies = (request.headers.get('cookie') || '').split(';');
    const value = cookies.map(s => s.trim()).find(s => s.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    const known = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
    const id = known ? value : randomUUID();
    const event = { event: 'new_device', timestamp: new Date(now()).toISOString(), device_id: id, ...deviceInfo(request.headers.get('user-agent') || ''), path: new URL(request.url).pathname };
    let timer;
    try {
      const result = await Promise.race([
        redis.send('EVAL', [RECORD, '2', `sol:{visitors}:seen:${id}`, 'sol:{visitors}:events', String(YEAR), JSON.stringify(event)]),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Visitor store timeout')), timeoutMs); }),
      ]);
      if (Number(result) === 1) log(JSON.stringify(event));
    } catch {
      // Serving the page never depends on availability of the logging store.
      if (!known) log(JSON.stringify({ ...event, storage: 'console_only', deduplication: 'cookie_only' }));
      if (now() - lastWarning >= 60000) {
        warn(JSON.stringify({ event: 'visitor_log_unavailable', timestamp: new Date(now()).toISOString() }));
        lastWarning = now();
      }
    } finally { clearTimeout(timer); }
    if (known) return null;
    const secure = secureCookie || new URL(request.url).protocol === 'https:';
    return `${COOKIE}=${id}; Max-Age=${YEAR}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
  }
  return { visit };
}
