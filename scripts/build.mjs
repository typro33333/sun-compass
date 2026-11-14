import { cp, mkdir, rm } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const output = new URL('build/', root);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const result = await Bun.build({
  entrypoints: [new URL('server.js', root).pathname],
  outdir: output.pathname,
  target: 'bun',
  format: 'esm',
  naming: 'server.js',
  minify: false,
});
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exitCode = 1;
} else {
  // Classic browser scripts share globals; preserve their order and individual files.
  await cp(new URL('dist/', root), new URL('dist/', output), { recursive: true });
  console.log(JSON.stringify({ level: 'info', event: 'build_completed', server: 'build/server.js', assets: 'build/dist' }));
}
