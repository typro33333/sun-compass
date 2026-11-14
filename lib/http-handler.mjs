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
          const isPage = asset === 'index.html';
          const cookie = isPage && request.method === 'GET' ? await visitors.visit(request, { request_id: requestId }) : null;
          response = await fileResponse(asset, request.method, {
            'Cache-Control': isPage ? 'private, no-store' : 'no-cache',
            ...(cookie ? { 'Set-Cookie': cookie } : {}),
          });
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
