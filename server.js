import { RedisClient } from 'bun';
import { createVisitorLogger } from './lib/visitor-log.mjs';
import { createRedisForecastProxy } from './lib/redis-forecast.mjs';
const redis = new RedisClient(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  connectionTimeout: 2000, enableOfflineQueue: false, maxRetries: 2,
});
redis.onconnect = () => console.log('Shared forecast cache connected');
redis.onclose = () => console.warn('Shared forecast cache disconnected; upstream requests are blocked');
redis.connect().catch(() => console.warn('Redis unavailable; forecast API will return 503 until reconnected'));
const forecast = createRedisForecastProxy({ redis, apiKey: process.env.OPEN_METEO_API_KEY || '' });
const visitors = createVisitorLogger({ redis, secureCookie: process.env.COOKIE_SECURE === 'true' });
// Explicit public routes keep repository files outside the web root.
const assets = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/style.css', 'style.css'],
  ['/theme.js', 'theme.js'],
  ['/i18n.js', 'i18n.js'],
  ['/forecast-client.js', 'forecast-client.js'],
  ['/startup.js', 'startup.js'],
  ['/scene.js', 'scene.js'],
  ['/sensor.js', 'sensor.js'],
  ['/solar.js', 'solar.js'],
  ['/app.js', 'app.js'],
  ['/energy.js', 'energy.js'],
  ['/profile.js', 'profile.js'],
  ['/energy-ui.js', 'energy-ui.js'],
]);
const server = Bun.serve({
  hostname: '0.0.0.0',
  port: Number(process.env.PORT || 5173),
  async fetch(request) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    }
    if (new URL(request.url).pathname === '/api/forecast') {
      if (request.method !== 'GET') return new Response(null, { status: 405, headers: { Allow: 'GET' } });
      return forecast.handle(request.url);
    }
    const asset = assets.get(new URL(request.url).pathname);
    if (!asset) return new Response('Not found', { status: 404 });
    const isPage = asset === 'index.html' && request.method === 'GET';
    const cookie = isPage ? await visitors.visit(request) : null;
    const file = Bun.file(new URL(`./dist/${asset}`, import.meta.url));
    return new Response(request.method === 'HEAD' ? null : file, {
      headers: { 'Content-Type': file.type, 'Cache-Control': isPage ? 'private, no-store' : 'no-cache', ...(cookie ? { 'Set-Cookie': cookie } : {}) },
    });
  },
});
console.log(`Sol ready at ${server.url}`);
