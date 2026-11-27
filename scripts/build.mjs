import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('build/', root);
await rm(output, { recursive: true, force: true });
await mkdir(new URL('dist/', output), { recursive: true });
async function build(options) {
  const result = await Bun.build({ sourcemap: 'none', minify: true, ...options });
  if (!result.success) throw new AggregateError(result.logs, 'Build failed');
  return result;
}
const html = await readFile(new URL('dist/index.html', root), 'utf8');
const sources = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
const bodySources = sources.filter(name => name !== 'theme.js');
// Combine classic scripts in their original order before minification, preserving
// shared lexical state. Separate per-file minification would break these bindings.
const combined = (await Promise.all(bodySources.map(name => readFile(new URL('dist/' + name, root), 'utf8')))).join('\n;\n')
  // Test-only CommonJS exports would turn the combined browser entry into a
  // deferred module factory. Browser code uses the window/globalThis exports.
  .replace(/if\s*\(\s*typeof module\s*!==\s*['"]undefined['"]\s*\)\s*module\.exports\s*=\s*root\.\w+;/g, '');
await build({
  entrypoints: ['sol:app'], target: 'browser', format: 'iife',
  outdir: new URL('dist/', output).pathname, naming: 'app.js',
  plugins: [{ name: 'browser-entry', setup(builder) {
    builder.onResolve({ filter: /^sol:app$/ }, () => ({ path: 'app', namespace: 'sol' }));
    builder.onLoad({ filter: /.*/, namespace: 'sol' }, () => ({ contents: `(() => {\n${combined}\n})();`, loader: 'js' }));
  } }],
});
await build({ entrypoints: [new URL('dist/theme.js', root).pathname], target: 'browser', format: 'iife', outdir: new URL('dist/', output).pathname, naming: 'theme.js' });
await build({ entrypoints: [new URL('dist/style.css', root).pathname], target: 'browser', outdir: new URL('dist/', output).pathname, naming: 'style.css', external: ['https://*'] });
let inserted = false;
let productionHtml = html.replace(/<script src="([^"]+)"><\/script>/g, (tag, name) => {
  if (name === 'theme.js') return tag;
  if (inserted) return '';
  inserted = true;
  return '<script src="app.js"></script>';
});
await cp(new URL('dist/favicon.svg', root), new URL('dist/favicon.svg', output));
const routes = [['/','index.html'], ['/index.html','index.html'], ['/sol-calculartor','index.html'], ['/sol-calculartor/','index.html']];
const extraPages = ['system-sizing.html','panel-dimensions.html'];
const pageHtml = new Map(await Promise.all(extraPages.map(async name => [name, await readFile(new URL('dist/'+name, root),'utf8')])));
const extraScripts = ['system-sizing.js','panel-geometry.js','info-page.js','i18n.js'];
for (const name of extraScripts) await build({entrypoints:[new URL('dist/'+name,root).pathname],target:'browser',format:'iife',outdir:new URL('dist/',output).pathname,naming:name});
for (const name of extraPages) {
  const route='/'+name.replace('.html','');
  routes.push([route,name],[route+'/',name]);
}
const publicFiles = ['index.html',...extraPages];
for (const name of ['theme.js','app.js','style.css','favicon.svg',...extraScripts]) {
  const bytes = await readFile(new URL('dist/' + name, output));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const extension = name.slice(name.lastIndexOf('.'));
  const hashed = name.slice(0, -extension.length) + '.' + hash + extension;
  await rename(new URL('dist/' + name, output), new URL('dist/' + hashed, output));
  productionHtml = productionHtml.replaceAll(`"${name}"`, `"${hashed}"`);
  for (const [page, content] of pageHtml) pageHtml.set(page,content.replaceAll(`"${name}"`, `"${hashed}"`));
  routes.push(['/' + hashed, hashed]);
  // Keep the stable alias for Docker health checks, without immutable caching.
  if (name === 'app.js') routes.push(['/app.js', hashed]);
  publicFiles.push(hashed);
}
const browserAsset = publicFiles.find(name => name.startsWith('app.'));
productionHtml = productionHtml.replace('</head>', `<link rel="preload" as="script" href="${browserAsset}"></head>`);
await writeFile(new URL('dist/index.html', output), productionHtml);
for (const [name, content] of pageHtml) await writeFile(new URL('dist/'+name,output),content);
for (const name of publicFiles) {
  const bytes = await readFile(new URL('dist/' + name, output));
  await writeFile(new URL('dist/' + name + '.br', output), brotliCompressSync(bytes));
  await writeFile(new URL('dist/' + name + '.gz', output), gzipSync(bytes));
}
await build({
  entrypoints: [new URL('server.js', root).pathname], outdir: output.pathname,
  target: 'bun', format: 'esm', naming: 'server.js',
  define: { 'process.env.SOL_BUILD_ASSETS': JSON.stringify(JSON.stringify(routes)) },
});
console.log(JSON.stringify({ level: 'info', event: 'build_completed', server: 'build/server.js', browser_bundle: 'build/dist/' + browserAsset, source_maps: false }));
