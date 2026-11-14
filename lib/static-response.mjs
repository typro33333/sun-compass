import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
const compressGzip = promisify(gzip);
export function acceptedEncodings(header = '') {
  const choices = new Map((header || '').toLowerCase().split(',').filter(Boolean).map(item => {
    const [name, ...params] = item.trim().split(';');
    const q = params.find(value => value.trim().startsWith('q='));
    const weight = q ? Number(q.trim().slice(2)) : 1;
    return [name.trim(), Number.isFinite(weight) && weight >= 0 && weight <= 1 ? weight : 0];
  }));
  return ['br','gzip'].map(name => [name, choices.get(name) ?? choices.get('*') ?? 0]).filter(([,q])=>q>0).sort((a,b)=>b[1]-a[1]).map(([name])=>name);
}
export function createStaticResponse(base) {
  // Bounded cache also covers direct source serving without build sidecars.
  const compressed = new Map();
  return async (asset, method, headers, request) => {
    const original = Bun.file(new URL(asset, base));
    let file = original, encoding;
    for (const candidate of acceptedEncodings(request?.headers.get('Accept-Encoding'))) {
      const packed = Bun.file(new URL(asset + (candidate === 'br' ? '.br' : '.gz'), base));
      if (await packed.exists()) { file = packed; encoding = candidate; break; }
    }
    if (!(await file.exists())) return new Response(null, {status:404});
    let body = file, size = file.size;
    if (!encoding && original.size >= 1024 && /\.(?:html|css|js|svg)$/.test(asset) && acceptedEncodings(request?.headers.get('Accept-Encoding')).includes('gzip')) {
      const key = `${asset}:${original.lastModified}:${original.size}`;
      let pending = compressed.get(key);
      if (!pending) {
        if (compressed.size >= 32) compressed.delete(compressed.keys().next().value);
        pending = original.arrayBuffer().then(bytes => compressGzip(bytes)).catch(error => { compressed.delete(key); throw error; });
        compressed.set(key, pending);
      }
      const packed = await pending;
      if (packed.length < original.size) { body = packed; size = packed.length; encoding = 'gzip'; }
    }
    return new Response(method === 'HEAD' ? null : body, {headers:{
      ...headers, 'Content-Type': original.type, Vary:'Accept-Encoding',
      ...(encoding ? {'Content-Encoding':encoding} : {}),
      'Content-Length':String(size), 'X-Content-Type-Options':'nosniff',
    }});
  };
}
