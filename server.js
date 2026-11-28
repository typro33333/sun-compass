import { createStaticResponse } from './lib/static-response.mjs';
import { logger } from './lib/logger.mjs';
import { createHttpHandler } from './lib/http-handler.mjs';
import { RedisClient } from 'bun';
import { createVisitorLogger } from './lib/visitor-log.mjs';
import { createRedisForecastProxy } from './lib/redis-forecast.mjs';
import { startCalculator } from './lib/calculation.mjs';
const redis = new RedisClient(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  connectionTimeout: 2000, enableOfflineQueue: false, maxRetries: 2,
});
redis.onconnect = () => logger.info('redis_connected');
redis.onclose = () => logger.warn('redis_disconnected', { reason: 'upstream_blocked' });
redis.connect().catch(() => logger.error('redis_connect_failed', { reason: 'forecast_unavailable' }));
const forecast = createRedisForecastProxy({ redis, logger, apiKey: process.env.OPEN_METEO_API_KEY || '' });
const visitors = createVisitorLogger({ redis, log: line => { const entry = JSON.parse(line); logger.info(entry.event, entry); }, warn: line => { const entry = JSON.parse(line); logger.warn(entry.event, entry); }, secureCookie: process.env.COOKIE_SECURE === 'true' });
// Explicit public routes keep repository files outside the web root.
const assets = new Map(process.env.SOL_BUILD_ASSETS ? JSON.parse(process.env.SOL_BUILD_ASSETS) : [
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/system-sizing', 'system-sizing.html'],
  ['/system-sizing/', 'system-sizing.html'],
  ['/panel-dimensions', 'panel-dimensions.html'],
  ['/panel-dimensions/', 'panel-dimensions.html'],
  ['/info-page.js', 'info-page.js'],

  ['/sun-compass', 'compass.html'],
  ['/sun-compass/', 'compass.html'],
  ['/sol-calculator', 'compass.html'],
  ['/sol-calculator/', 'compass.html'],
  ['/calculator-page.js', 'calculator-page.js'],
  ['/panel-geometry.js', 'panel-geometry.js'],
  ['/annual-placement.js', 'annual-placement.js'],
  ['/panel-planner.js', 'panel-planner.js'],
  ['/planner-state.js', 'planner-state.js'],
  ['/panel-layout-editor.js', 'panel-layout-editor.js'],
  ['/depth-renderer.js', 'depth-renderer.js'],
  ['/roof-gpu.js', '../build/dev/roof-gpu.js'],
  ['/style.css', 'style.css'],
  ['/favicon.svg', 'favicon.svg'],
  ['/theme.js', 'theme.js'],
  ['/i18n.js', 'i18n.js'],
  ['/forecast-client.js', 'forecast-client.js'],
  ['/startup.js', 'startup.js'],
  ['/scene.js', 'scene.js'],
  ['/sensor.js', 'sensor.js'],
  ['/solar.js', 'solar.js'],
  ['/app.js', 'app.js'],
  ['/energy.js', 'energy.js'],
  ['/system-sizing.js', 'system-sizing.js'],
  ['/profile.js', 'profile.js'],
  ['/energy-ui.js', 'energy-ui.js'],
]);
const binary=new URL(process.env.SOL_BUILD_ASSETS?'./solar-calc':'./build/solar-calc',import.meta.url).pathname;
const calculator=startCalculator({binary,redis,externalSocket:process.env.SOL_CALC_SOCKET});
const handle = createHttpHandler({ calculator, assets, forecast, visitors, logger,
  fileResponse: createStaticResponse(new URL('./dist/', import.meta.url)),
});
try {
  const server = Bun.serve({ hostname: '0.0.0.0', port: Number(process.env.PORT || 5173), maxRequestBodySize: 1024*1024, fetch: handle });
  logger.info('server_started', { host:'0.0.0.0', port:server.port });
  let stopping = false;
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    logger.info('server_stopping', { signal });
    await server.stop(true);
    calculator.close();
    redis.close();
    process.exit(0);
  });
} catch (error) {
  logger.error('server_start_failed', { error_name:error.name, reason:'listen_failed' });
  calculator.close();
    redis.close();
  process.exitCode = 1;
}
