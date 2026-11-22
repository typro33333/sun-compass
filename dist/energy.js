// GTI is a mean W/m² value over the hour ending at each API timestamp.
(function (root) {
  function estimate(hourly, start, end, kwp, loss) {
    if (!Number.isFinite(kwp) || kwp <= 0 || !Number.isFinite(loss) || loss < 0 || loss >= 100) throw new Error('Thông số hệ thống không hợp lệ.');
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error('Mốc thời gian không hợp lệ.');
    if (!Array.isArray(hourly?.time) || !Array.isArray(hourly.global_tilted_irradiance)) throw new Error('Thiếu dữ liệu bức xạ.');
    let irradiation = 0, covered = 0, previous = -Infinity;
    const hours = [];
    hourly.time.forEach((time, i) => {
      if (!Number.isFinite(time) || time <= previous) throw new Error('Mốc thời gian không hợp lệ.');
      if (previous !== -Infinity && time - previous !== 3600) throw new Error('Mốc thời gian không hợp lệ.');
      previous = time;
      const overlap = Math.max(0, Math.min(time, end) - Math.max(time - 3600, start));
      if (!overlap) return;
      const radiation = hourly.global_tilted_irradiance[i];
      if (!Number.isFinite(radiation) || radiation < 0) throw new Error('Dữ liệu bức xạ hôm nay chưa đầy đủ.');
      covered += overlap;
      const sunHours = radiation / 1000 * overlap / 3600;
      irradiation += sunHours;
      hours.push({ time, kwh: kwp * sunHours * (1 - loss / 100) });
    });
    if (covered !== end - start) throw new Error('Chưa có đủ dữ liệu cho cả ngày. Hãy thử cập nhật lại.');
    return { irradiation, kwh: kwp * irradiation * (1 - loss / 100), hours };
  }
  // Planning reserve only: the irradiance forecast already includes cloud effects.
  function weatherReserve(hourly, estimate) {
    const index = new Map(hourly.time.map((time, i) => [time, i]));
    let reduction = 0, clouds = 0, rainyEnergy = 0;
    for (const hour of estimate.hours) {
      if (hour.kwh <= 0) continue;
      const i = index.get(hour.time);
      const cloud = hourly.cloud_cover?.[i], rain = hourly.rain?.[i], showers = hourly.showers?.[i];
      if (!Number.isFinite(cloud) || cloud < 0 || cloud > 100 || !Number.isFinite(rain) || rain < 0 || !Number.isFinite(showers) || showers < 0) return null;
      const wet = rain + showers;
      // Explicit heuristic: up to 15% cloud reserve + up to 10% rain reserve.
      const factor = Math.max(0, (cloud - 50) / 50) * 0.15 + Math.min(wet / 2, 1) * 0.10;
      reduction += hour.kwh * factor;
      clouds += hour.kwh * cloud;
      if (wet > 0) rainyEnergy += hour.kwh;
    }
    return { kwh: Math.max(0, estimate.kwh - reduction), percent: estimate.kwh > 0 ? reduction / estimate.kwh * 100 : 0, cloudCover: estimate.kwh > 0 ? clouds / estimate.kwh : 0, rain: rainyEnergy > 0 };
  }
  function defaultSystem() {
    return {losses:{temperature:8,wiring:2,soiling:3,other:0},inverter:{acKw:5,maxPvKw:7.5,efficiency:97,mpptCount:2,mpptMinV:120,mpptMaxV:550,mpptMaxA:16,operatingV:350}};
  }
  function validateSystem(system) {
    const l=system?.losses,inv=system?.inverter;
    if(!l || !inv)throw Error('Thiếu cấu hình inverter/hao hụt.');
    for(const key of ['temperature','wiring','soiling','other'])if(!Number.isFinite(l[key]) || l[key]<0 || l[key]>=100)throw Error('Hao hụt không hợp lệ.');
    for(const key of ['acKw','maxPvKw','efficiency','mpptMinV','mpptMaxV','mpptMaxA','operatingV'])if(!Number.isFinite(inv[key]) || inv[key]<=0)throw Error('Thông số inverter không hợp lệ.');
    if(inv.efficiency>100 || !Number.isInteger(inv.mpptCount) || inv.mpptCount<1 || inv.mpptCount>16 || inv.mpptMaxV<=inv.mpptMinV)throw Error('Giới hạn MPPT/hiệu suất không hợp lệ.');
    return {losses:{...l},inverter:{...inv}};
  }
  function estimateSystem(hourly,start,end,options) {
    const {losses,inverter}=validateSystem(options),scene=options.scene,G=root.PanelGeometry;
    if(!scene?.modules?.length || !G)throw Error('Thiếu hình học mô phỏng.');
    const kwp=scene.modules.length*scene.config.watts/1000;
    if(kwp>inverter.maxPvKw+1e-9)throw Error('Công suất PV DC vượt giới hạn tiếp nhận của inverter.');
    // Reuse coverage/ordering validation; legacy estimate remains available for old callers.
    const base=estimate(hourly,start,end,kwp,0);
    const index=new Map(hourly.time.map((t,i)=>[t,i]));
    const sunAt=options.sunAt || (timestamp=>{
      const {lat,lon,offset}=options.location;
      const local=new Date((timestamp+offset*3600)*1000);
      return root.Solar.position(local.toISOString().slice(0,10),local.getUTCHours()*60+local.getUTCMinutes()+local.getUTCSeconds()/60,lat,lon,offset);
    });
    const total={kwh:0,dcKwh:0,rawDcKwh:0,shadeLossKwh:0,lossKwh:{temperature:0,wiring:0,soiling:0,other:0},mpptLossKwh:0,inverterLossKwh:0,clippingKwh:0,irradiation:base.irradiation,hours:[]};
    for(const interval of base.hours) {
      const i=index.get(interval.time),gti=hourly.global_tilted_irradiance[i],dni=hourly.direct_normal_irradiance?.[i];
      if(!Number.isFinite(dni)||dni<0)throw Error('Thiếu bức xạ trực tiếp DNI theo giờ.');
      const from=Math.max(start,interval.time-3600),to=Math.min(end,interval.time);
      const row={time:interval.time,durationHours:(to-from)/3600,kwh:0,dcKwh:0,clippingKwh:0,mpptLossKwh:0,panels:scene.panels.map((panel,id)=>({id:panel.id,mppt:id%inverter.mpptCount+1,dcKwh:0,acKwh:0,shadeLossKwh:0,litFraction:0}))};
      // 15-minute quadrature of geometry within each backward-averaged weather hour.
      for(let t=from;t<to;t+=900) {
        const seconds=Math.min(900,to-t),dt=seconds/3600;
        const sample=G.exposure(scene,sunAt(t+seconds/2),options.grid??6);
        const beam=Math.min(gti,Math.max(0,dni*sample.incidence));
        const powers=sample.panels.map((panel,p)=>{
          const raw=scene.config.watts/1000*gti/1000;
          const shade=scene.config.watts/1000*beam/1000*(1-panel.litFraction);
          let dc=raw-shade;
          total.rawDcKwh+=raw*dt;total.shadeLossKwh+=shade*dt;row.panels[p].shadeLossKwh+=shade*dt;
          for(const key of ['temperature','wiring','soiling','other']){const loss=dc*losses[key]/100;dc-=loss;total.lossKwh[key]+=loss*dt;}
          total.dcKwh+=dc*dt;row.dcKwh+=dc*dt;row.panels[p].dcKwh+=dc*dt;
          row.panels[p].litFraction+=panel.litFraction*dt/row.durationHours;
          return dc;
        });
        const admitted=powers.map(()=>0);
        for(let tracker=0;tracker<inverter.mpptCount;tracker++) {
          const ids=powers.map((_,p)=>p).filter(p=>p%inverter.mpptCount===tracker),power=ids.reduce((sum,p)=>sum+powers[p],0);
          const limit=inverter.operatingV>=inverter.mpptMinV && inverter.operatingV<=inverter.mpptMaxV?inverter.operatingV*inverter.mpptMaxA/1000:0;
          const accepted=Math.min(power,limit),ratio=power>0?accepted/power:0;
          for(const p of ids)admitted[p]=powers[p]*ratio;
          total.mpptLossKwh+=(power-accepted)*dt;row.mpptLossKwh+=(power-accepted)*dt;
        }
        const dc=admitted.reduce((a,b)=>a+b,0),beforeClip=dc*inverter.efficiency/100,ac=Math.min(beforeClip,inverter.acKw);
        total.inverterLossKwh+=(dc-beforeClip)*dt;total.clippingKwh+=(beforeClip-ac)*dt;row.clippingKwh+=(beforeClip-ac)*dt;
        total.kwh+=ac*dt;row.kwh+=ac*dt;
        admitted.forEach((p,id)=>{row.panels[id].acKwh+=dc>0?ac*dt*p/dc:0;});
        options.onSample?.({timestamp:t+seconds/2,durationSeconds:seconds,exposure:sample,directIrradiance:beam,dcKw:powers,admittedKw:admitted,acKw:ac,clippingKw:beforeClip-ac,mpptKw:Array.from({length:inverter.mpptCount},(_,m)=>admitted.reduce((sum,p,i)=>sum+(i%inverter.mpptCount===m?p:0),0))});
      }
      total.hours.push(row);
    }
    return total;
  }

  root.Energy = { estimate, weatherReserve, estimateSystem, defaultSystem, validateSystem };
  if (typeof module !== 'undefined') module.exports = root.Energy;
})(typeof window !== 'undefined' ? window : globalThis);
