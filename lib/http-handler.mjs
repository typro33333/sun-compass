import { randomUUID } from 'node:crypto';
export function createHttpHandler({ assets, forecast, visitors, fileResponse, logger, clock = () => performance.now() }) {
  return async function handle(request) {
    const requestId = randomUUID(), started = clock();
    const pathname = new URL(request.url).pathname;
    const route = pathname === '/api/forecast' || assets.has(pathname) ? pathname : 'unmatched';
    let response;
    try {
      if (!['GET','HEAD'].includes(request.method)) response = new Response('Method not allowed', { status:405, headers:{ Allow:'GET, HEAD' } });
      else if (pathname === '/api/forecast') response = request.method === 'GET' ? await forecast.handle(request.url, { request_id: requestId }) : new Response(null, { status:405, headers:{ Allow:'GET' } });
      else {
        const asset = assets.get(pathname);
        if (!asset) response = new Response(request.method === 'HEAD' ? null : 'Not found', { status:404 });
        else {
          const isPage = asset.endsWith('.html');
          let cookie = null;
          if (isPage && request.method === 'GET') {
            if (visitors.prepare) {
              const visit = visitors.prepare(request, { request_id: requestId });
              cookie = visit.cookie;
              void visit.completion.catch(() => logger.warn('visitor_log_unavailable', { request_id: requestId }));
            } else cookie = await visitors.visit(request, { request_id: requestId });
          }
          const immutable = /\.[a-f0-9]{12}\.(?:js|css|svg)$/.test(asset) && pathname === '/' + asset;
          response = await fileResponse(asset, request.method, {
            'Cache-Control': isPage ? 'private, no-store' : immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
            ...(cookie ? { 'Set-Cookie': cookie } : {}),
          }, request);
        }
      }
    } catch (error) {
      logger.error('request_failed', { request_id:requestId, route, error_name:error?.name || 'Error' });
      response = Response.json({ error:'Internal server error' }, { status:500, headers:{ 'Cache-Control':'no-store' } });
    }
    response.headers.set('X-Request-ID', requestId);
    const level = response.status >= 500 ? 'error' : response.status >= 400 ? 'warn' : 'info';
    logger[level]('http_request', { request_id:requestId, method:request.method, route, status:response.status, duration_ms:Math.round((clock()-started)*100)/100, cache_status:response.headers.get('X-Forecast-Cache') });
    return response;
  };
}
