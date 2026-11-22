// Offline prototype. Annual POA is an explicit user scenario, not weather data.
(function(root) {
  const G=()=>root.PanelGeometry,E=()=>root.Energy;
  function scenario({year,location,config,annualPoa}) {
    if(!Number.isInteger(year)||year<1900||year>2100||!Number.isFinite(annualPoa)||annualPoa<=0||annualPoa>4000||!Number.isFinite(location?.lat)||Math.abs(location.lat)>90||!Number.isFinite(location.lon)||Math.abs(location.lon)>180||!Number.isFinite(location.offset)||location.offset< -12||location.offset>14)throw Error('Kịch bản bức xạ năm không hợp lệ.');
    const days=[];
    let normalization=0;
    for(let month=0;month<12;month++) {
      const day=`${year}-${String(month+1).padStart(2,'0')}-15`,weight=new Date(Date.UTC(year,month+1,0)).getUTCDate();
      const start=Date.parse(day+'T00:00:00Z')/1000-location.offset*3600;
      const hourly={time:[],global_tilted_irradiance:[],direct_normal_irradiance:[]};
      for(let h=0;h<24;h++) {
        const sun=root.Solar.position(day,h*60+30,location.lat,location.lon,location.offset),height=Math.max(0,Math.sin(sun.altitude*Math.PI/180));
        const dni=height*.8,gti=dni*G().incidence(sun,config.bearing,config.tilt)+height*.2;
        hourly.time.push(start+(h+1)*3600);hourly.global_tilted_irradiance.push(gti);hourly.direct_normal_irradiance.push(dni);
        normalization+=gti*weight;
      }
      days.push({start,end:start+86400,weight,hourly});
    }
    if(normalization<=0)throw Error('Không có bức xạ trong tập ngày đại diện.');
    const scale=annualPoa*1000/normalization;
    for(const d of days)for(const field of ['global_tilted_irradiance','direct_normal_irradiance'])d.hourly[field]=d.hourly[field].map(v=>v*scale);
    return {kind:'assumed-annual-poa',annualPoa,year,location:{...location},bearing:config.bearing,tilt:config.tilt,days};
  }
  function valid(positions,c,spacing=.02) {
    const module=G().moduleFor(c.watts);
    // Inflate each footprint by half the gap on every side: conservative edge clearance too.
    return G().validPlacement(positions,c.bearing-c.house,c.length,c.width,{...module,width:module.width+spacing,length:module.length+spacing});
  }
  function candidates(config,{spacing=.02,step=1}={}) {
    if(!Number.isFinite(spacing)||spacing<0||spacing>2||!Number.isFinite(step)||step<1||step>5)throw Error('Khoảng cách/lưới ứng viên không hợp lệ.');
    const spots=[];
    for(const rotation of [0,90])for(let x=-config.width/2;x<=config.width/2+1e-8;x+=step)for(let z=-config.length/2;z<=config.length/2+1e-8;z+=step) {
      const p={x,z,rotation};if(valid([p],config,spacing))spots.push(p);
    }
    return spots;
  }
  function evaluate(config,positions,system,climate) {
    if(config.bearing!==climate.bearing || config.tilt!==climate.tilt)throw Error('Kịch bản bức xạ không khớp hướng/nghiêng.');
    const scene=G().scene(config,positions),total={acKwh:0,dcKwh:0,shadeLossKwh:0,rawDcKwh:0};
    for(const d of climate.days) {
      const r=E().estimateSystem(d.hourly,d.start,d.end,{...system,scene,location:climate.location});
      total.acKwh+=r.kwh*d.weight;total.dcKwh+=r.dcKwh*d.weight;total.shadeLossKwh+=r.shadeLossKwh*d.weight;total.rawDcKwh+=r.rawDcKwh*d.weight;
    }
    return {...total,shadeFraction:total.rawDcKwh?total.shadeLossKwh/total.rawDcKwh:0};
  }
  function* propose({config,positions,system,scenario:climate,spacing=.02,step=1}) {
    // Normalize offsets in the draft only. Current layout stays untouched.
    const c={...config,x:0,z:0},manualPositions=positions.map(p=>({...p,x:p.x+config.x,z:p.z-config.z}));
    const manual=evaluate(c,manualPositions,system,climate),spots=candidates(c,{spacing,step});
    const seen=new Set(spots.map(p=>JSON.stringify([p.x,p.z,p.rotation||0])));
    for(const p of [...manualPositions,...G().packPanels(c.count,c.bearing-c.house,c.length,c.width,G().moduleFor(c.watts))]) {
      const key=JSON.stringify([p.x,p.z,p.rotation||0]);if(!seen.has(key)&&valid([p],c,spacing)){spots.push({...p});seen.add(key);}
    }
    const ranking=[];
    for(const position of spots) {
      const value=evaluate({...c,count:1},[position],system,climate);
      ranking.push({position,...value});
      yield {completed:ranking.length,total:spots.length};
    }
    ranking.sort((a,b)=>b.dcKwh-a.dcKwh || a.shadeFraction-b.shadeFraction || a.position.z-b.position.z || a.position.x-b.position.x || (a.position.rotation||0)-(b.position.rotation||0));
    let best=valid(manualPositions,c,spacing)?{positions:manualPositions,value:manual}:null;
    for(let seed=0;seed<Math.min(8,ranking.length);seed++) {
      const next=[ranking[seed].position];
      for(const r of ranking) {
        if(next.length===c.count)break;
        if(valid([...next,r.position],c,spacing))next.push(r.position);
      }
      if(next.length===c.count) {
        const value=evaluate(c,next,system,climate);
        if(!best || value.acKwh>best.value.acKwh+1e-9)best={positions:next,value};
      }
      yield {completed:spots.length,total:spots.length};
    }
    if(!best)throw Error('Chưa tìm được bố trí đủ số tấm và khoảng cách yêu cầu. Giảm khoảng cách hoặc tăng kích thước mái.');
    return {config:c,positions:best.positions.map(p=>({...p})),manual,proposed:best.value,ranking,spacing,step,year:climate.year,annualPoa:climate.annualPoa};
  }
  root.AnnualPlacement={scenario,candidates,valid,evaluate,propose};
  if (typeof module !== 'undefined') module.exports = root.AnnualPlacement;
})(typeof window !== 'undefined' ? window : globalThis);
