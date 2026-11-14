const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
// Log only operational fields, never request URLs, headers, cookies, credentials or GPS.
const FIELDS = new Set(['request_id','method','route','status','duration_ms','cache_status','kind','retry_after_seconds','device_id','device','os','browser','storage','deduplication','port','host','reason','error_name','stage','signal']);
export function createLogger({ level = 'info', output = line => console.log(line), now = Date.now } = {}) {
  const threshold = LEVELS[level] ?? LEVELS.info;
  function emit(severity, event, fields = {}) {
    if (LEVELS[severity] < threshold) return;
    const record = { timestamp: new Date(now()).toISOString(), level: severity, service: 'sol-sun-compass', event };
    for (const [key, value] of Object.entries(fields)) {
      if (!FIELDS.has(key) || value === undefined || value === null) continue;
      if (typeof value === 'number' && Number.isFinite(value)) record[key] = value;
      else if (typeof value === 'boolean') record[key] = value;
      else if (typeof value === 'string') record[key] = value.slice(0, 160);
    }
    output(JSON.stringify(record));
  }
  return Object.fromEntries(Object.keys(LEVELS).map(level => [level, (event, fields) => emit(level, event, fields)]));
}
export const logger = createLogger({ level: process.env.LOG_LEVEL || 'info' });
