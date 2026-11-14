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
  return async (asset, method, headers, request) => {
    const original = Bun.file(new URL(asset, base));
    let file = original, encoding;
    for (const candidate of acceptedEncodings(request?.headers.get('Accept-Encoding'))) {
      const packed = Bun.file(new URL(asset + (candidate === 'br' ? '.br' : '.gz'), base));
      if (await packed.exists()) { file = packed; encoding = candidate; break; }
    }
    if (!(await file.exists())) return new Response(null, {status:404});
    return new Response(method === 'HEAD' ? null : file, {headers:{
      ...headers, 'Content-Type': original.type, Vary:'Accept-Encoding',
      ...(encoding ? {'Content-Encoding':encoding} : {}),
      'Content-Length':String(file.size), 'X-Content-Type-Options':'nosniff',
    }});
  };
}
