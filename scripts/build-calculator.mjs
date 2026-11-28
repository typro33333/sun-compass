import { mkdir } from 'node:fs/promises';
const root=new URL('../',import.meta.url);
await mkdir(new URL('build',root),{recursive:true});
const processHandle=Bun.spawn(['go','build','-trimpath','-o','build/solar-calc','./backend'],{cwd:root.pathname,stdout:'inherit',stderr:'inherit'});
if(await processHandle.exited) throw Error('Go calculator build failed');
