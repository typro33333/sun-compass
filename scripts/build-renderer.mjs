import {readFileSync} from 'node:fs';
// Source-mode Bun serves the same locally bundled ES module as production.
const root=new URL('../',import.meta.url);
const result=await Bun.build({entrypoints:[new URL('dist/roof-gpu.js',root).pathname],outdir:new URL('build/dev/',root).pathname,naming:'roof-gpu.js',banner:'/*! '+readFileSync(new URL('node_modules/three/LICENSE',root),'utf8')+' */',format:'esm',target:'browser',minify:true});
if(!result.success)throw new AggregateError(result.logs,'WebGPU renderer build failed');
