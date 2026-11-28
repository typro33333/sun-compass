import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const limits = {solar:2048, shade:524288, energy:524288, annual:524288, sizing:2048, recommend:524288};
const failure = (status, error) => Response.json({error}, {status});
export function startCalculator({binary, redis, externalSocket}) {
  const dir=externalSocket?null:mkdtempSync(join(tmpdir(),'hn-'));
  const socket=externalSocket || join(dir,'calc.sock');
  let worker, starting, closed=false, active=0;
  async function launch() {
    if(worker?.exitCode===null && existsSync(socket)) return;
    rmSync(socket,{force:true});
    worker=Bun.spawn([binary],{env:{SOL_CALC_SOCKET:socket,SOL_CALC_CHILD:"1"},stdin:'pipe',stdout:'ignore',stderr:'inherit'});
    for(let i=0;i<150 && worker.exitCode===null && !closed;i++){
      if(existsSync(socket))return;
      await Bun.sleep(20);
    }
    worker.kill();
    throw Error('Calculator failed to start');
  }
  async function handle(request,op){
    if(!Object.hasOwn(limits,op))return failure(404,'Unknown calculation');
    if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
    if(!request.headers.get('content-type')?.startsWith('application/json'))return failure(415,'Expected JSON');
    if(Number(request.headers.get('content-length'))>limits[op])return failure(413,'Request too large');
    if(active>=8)return failure(503,'Calculator busy');
    active++;
    try{
      const bytes=new Uint8Array(await request.arrayBuffer());
      if(bytes.length>limits[op])return failure(413,'Request too large');
      const key='sol:calc:v1:'+op+':'+createHash('sha256').update(bytes).digest('hex');
      const jsonHeaders={'Content-Type':'application/json','Cache-Control':'private, no-store'};
      const hit=await redis.send('GET',[key]).catch(()=>null);
      if(hit)return new Response(hit,{headers:jsonHeaders});
      if(!externalSocket){
        starting??=launch().finally(()=>{starting=null;});
        await starting;
      }
      const upstream=await fetch('http://localhost/'+op,{unix:socket,method:'POST',body:bytes,signal:AbortSignal.any([request.signal,AbortSignal.timeout(90000)])});
      if(!upstream.ok)return failure(upstream.status,(await upstream.text()).slice(0,240));
      const body=await upstream.text();
      if(body.length<=524288)void redis.send('SET',[key,body,'EX','900']).catch(()=>{});
      return new Response(body,{headers:jsonHeaders});
    }catch{return failure(503,'Calculation unavailable');}
    finally{active--;}
  }
  function close(){closed=true;worker?.kill();if(dir)rmSync(dir,{recursive:true,force:true});}
  return {handle,close};
}
