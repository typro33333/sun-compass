import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { createStaticResponse, acceptedEncodings } from '../lib/static-response.mjs';
import { createHttpHandler } from '../lib/http-handler.mjs';
import { createVisitorLogger } from '../lib/visitor-log.mjs';
assert.deepEqual(acceptedEncodings('br;q=0, gzip;q=1'), ['gzip']);
assert.deepEqual(acceptedEncodings('br;q=0, *;q=1'), ['gzip']);
const base = new URL('../build/dist/',import.meta.url), names = await readdir(base);
const app = names.find(name=>/^app\.[a-f0-9]{12}\.js$/.test(name));
const serve = createStaticResponse(base);
const raw = await readFile(new URL(app,base));
for (const encoding of ['br','gzip']) {
  const response = await serve(app,'GET',{},new Request('https://test/'+app,{headers:{'Accept-Encoding':encoding}}));
  assert.equal(response.headers.get('content-encoding'),encoding);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.deepEqual(encoding==='br'?brotliDecompressSync(bytes):gunzipSync(bytes),raw);
  assert(bytes.length<raw.length);
}
const plain=await serve(app,'HEAD',{},new Request('https://test/'+app,{headers:{'Accept-Encoding':'br;q=0,gzip;q=0'}}));
assert.equal(plain.headers.get('content-encoding'),null);assert.equal(await plain.text(),'');
const logger={info(){},warn(){},error(){}};
let resolveRedis;
const visitors=createVisitorLogger({redis:{send:()=>new Promise(resolve=>{resolveRedis=resolve;})},log(){},warn(){},timeoutMs:1000});
const handler=createHttpHandler({assets:new Map([['/','index.html'],['/sol-calculator','index.html'],['/sol-calculator/','index.html'],['/'+app,app],['/app.js',app]]),visitors,logger,fileResponse:serve});
const page=await Promise.race([handler(new Request('https://test/')),new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('HTML waited for Redis')),250);timer.unref();})]);
assert.equal(page.status,200);assert.match(page.headers.get('set-cookie'),/sol_device_id=/);resolveRedis(1);
for (const route of ['/sol-calculartor','/sol-calculartor/']) {
  const redirect = await handler(new Request('https://test'+route+'?lang=en'));
  assert.equal(redirect.status,308);
  assert.equal(redirect.headers.get('location'),'/sol-calculator?lang=en');
}
for (const route of ['/sol-calculator','/sol-calculator/']) {
  const response=await handler(new Request('https://test'+route,{method:'HEAD'}));
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');
}
const hashed=await handler(new Request('https://test/'+app));assert.match(hashed.headers.get('cache-control'),/immutable/);
const alias=await handler(new Request('https://test/app.js'));assert.equal(alias.headers.get('cache-control'),'no-cache');
const css=await readFile(new URL(names.find(n=>/^style\.[a-f0-9]{12}\.css$/.test(n)),base),'utf8');assert(!css.includes('fonts.googleapis.com'));
console.log('Performance checks passed: HTML does not wait for Redis; Brotli/Gzip round-trip, q=0 handling, immutable hashes and no remote font.');

// Source-mode startup must compress text even without prebuilt sidecars.
const sourceBase = new URL('../dist/', import.meta.url);
const sourceServe = createStaticResponse(sourceBase);
for (const asset of ['index.html', 'style.css', 'app.js']) {
  const request = new Request('https://test/' + asset, {headers:{'Accept-Encoding':'gzip'}});
  const response = await sourceServe(asset, 'GET', {}, request);
  assert.equal(response.headers.get('content-encoding'), 'gzip');
  assert.equal(response.headers.get('vary'), 'Accept-Encoding');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.deepEqual(gunzipSync(bytes), await readFile(new URL(asset, sourceBase)));
  const head = await sourceServe(asset, 'HEAD', {}, request);
  assert.equal(head.headers.get('content-length'), String(bytes.length));
  assert.equal(await head.text(), '');
  const plain = await sourceServe(asset, 'GET', {}, new Request('https://test/' + asset));
  assert.equal(plain.headers.get('content-encoding'), null);
}
console.log('Source serving checks passed: cached Gzip for HTML/CSS/JS, HEAD and uncompressed fallback.');
