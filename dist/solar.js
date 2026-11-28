// Full-day ephemerides are computed privately. Sliders and camera updates read
// the same minute table, including the endpoint at the following midnight.
(function(root){
  const days=new Map(), pending=new Map();
  const key=(day,lat,lon,offset)=>JSON.stringify([day,lat,lon,offset]);
  function load(day,lat,lon,offset){
    const id=key(day,lat,lon,offset);
    if(days.has(id))return Promise.resolve(days.get(id));
    if(pending.has(id))return pending.get(id);
    const request=fetch('/api/calc/solar',{method:'POST',signal:AbortSignal.timeout(12000),headers:{'Content-Type':'application/json'},body:JSON.stringify({day,lat,lon,offset})})
      .then(async response=>{
        if(!response.ok)throw Error('Solar service unavailable');
        const data=await response.json();
        if(data.positions?.length!==1441 || !data.events)throw Error('Incomplete solar ephemeris');
        days.set(id,data);
        if(days.size>32)days.delete(days.keys().next().value);
        return data;
      }).finally(()=>pending.delete(id));
    pending.set(id,request);
    return request;
  }
  function position(day,minute,lat,lon,offset){
    const rows=days.get(key(day,lat,lon,offset))?.positions;
    if(!rows)throw Error('Solar ephemeris unavailable');
    const time=Math.max(0,Math.min(1440,minute)),i=Math.floor(time),f=time-i;
    const [alt,az]=rows[i],[nextAlt,nextAz]=rows[Math.min(i+1,1440)];
    return {altitude:alt+f*(nextAlt-alt),azimuth:(az+f*((nextAz-az+540)%360-180)+360)%360};
  }
  root.Solar={load,position,ready:(...args)=>days.has(key(...args)),events:(...args)=>days.get(key(...args))?.events};
})(typeof window!=='undefined'?window:globalThis);
