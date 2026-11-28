// A 24-hour mean GTI/DNI profile for each month, indexed by UTC interval end.
export function monthlyRadiation(data, year) {
  const h=data.hourly, units=data.hourly_units;
  const start=Date.UTC(year,0,1)/1000, end=Date.UTC(year+1,0,1)/1000;
  if(units?.global_tilted_irradiance!=='W/m²'||units?.direct_normal_irradiance!=='W/m²'||h?.time?.length!==(end-start)/3600)throw Error('Incomplete radiation archive');
  const months=Array.from({length:12},()=>Array.from({length:24},()=>[0,0,0]));
  h.time.forEach((time,i)=>{
    const g=h.global_tilted_irradiance[i], d=h.direct_normal_irradiance[i];
    if(time!==start+i*3600||![g,d].every(n=>Number.isFinite(n)&&n>=0&&n<=3500))throw Error('Invalid radiation archive');
    const date=new Date(time*1000), bin=months[date.getUTCMonth()][date.getUTCHours()];
    bin[0]+=g;bin[1]+=d;bin[2]++;
  });
  return {year,months:months.map(hours=>hours.map(([g,d,n])=>[g/n,d/n]))};
}
const pending=new Map();
export async function loadHistory(redis,input){
  const {lat,lon}=input.location,{bearing,tilt}=input.scene;
  if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(bearing)||bearing<0||bearing>360||!Number.isFinite(tilt)||tilt<0||tilt>90)throw Error('Invalid location');
  const year=new Date(Date.now()-7*86400000).getUTCFullYear()-1;
  const params=new URLSearchParams({latitude:lat.toFixed(2),longitude:lon.toFixed(2),tilt:String(tilt),azimuth:String(bearing-180),start_date:year+'-01-01',end_date:year+'-12-31',timeformat:'unixtime',timezone:'UTC',hourly:'global_tilted_irradiance,direct_normal_irradiance'});
  const key='sol:history:v1:'+params;
  const hit=await redis.send('GET',[key]);if(hit)return JSON.parse(hit);
  if(pending.has(key))return pending.get(key);
  const work=(async()=>{
    const budget=await redis.send('EVAL',["local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",'1','sol:history:minute']);
    if(Number(budget)>6)throw Error('Archive busy');
    const apiKey=process.env.OPEN_METEO_API_KEY;
    if(apiKey)params.set('apikey',apiKey);
    const base=apiKey?'https://customer-archive-api.open-meteo.com':'https://archive-api.open-meteo.com';
    const response=await fetch(base+'/v1/archive?'+params,{signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error('Archive unavailable');
    const result=monthlyRadiation(await response.json(),year);
    await redis.send('SET',[key,JSON.stringify(result),'EX','2592000']);
    return result;
  })().finally(()=>pending.delete(key));
  pending.set(key,work);return work;
}
