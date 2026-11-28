// Annual POA is an explicit user scenario. The private worker evaluates each layout.
(function(root) {
  const G=()=>root.PanelGeometry,E=()=>root.Energy;
  function scenario({year,location,config,annualPoa}) {
    if(!Number.isInteger(year)||year<1900||year>2100||!Number.isFinite(annualPoa)||annualPoa<=0||annualPoa>4000||!Number.isFinite(location?.lat)||Math.abs(location.lat)>90||!Number.isFinite(location.lon)||Math.abs(location.lon)>180||!Number.isFinite(location.offset)||location.offset< -12||location.offset>14)throw Error('Kịch bản bức xạ năm không hợp lệ.');
    return {annualPoa,year,location:{...location},bearing:config.bearing,tilt:config.tilt};
  }
  function valid(positions,c,spacing=.02) {
    const module=G().moduleFor(c.watts);
    // Inflate each footprint by half the gap on every side: conservative edge clearance too.
    return G().validPlacement(positions,c.bearing-c.house,c.length,c.width,{...module,width:module.width+spacing,length:module.length+spacing},c.outline);
  }
  function candidates(config,{spacing=.02,step=1}={}) {
    if(!Number.isFinite(spacing)||spacing<0||spacing>2||!Number.isFinite(step)||step<1||step>5)throw Error('Khoảng cách/lưới ứng viên không hợp lệ.');
    const spots=[];
    for(const rotation of [0,90])for(let x=-config.width/2;x<=config.width/2+1e-8;x+=step)for(let z=-config.length/2;z<=config.length/2+1e-8;z+=step) {
      const p={x,z,rotation};if(valid([p],config,spacing))spots.push(p);
    }
    return spots;
  }
  async function* propose({config,positions,system,scenario:climate,spacing=.02,step=1,signal}) {
    // Normalize offsets in the draft only. Current layout stays untouched.
    const c={...config,x:0,z:0},manualPositions=positions.map(p=>({...p,x:p.x+config.x,z:p.z-config.z}));
    const {panels,...scene}=E().geometry(G().scene(c,manualPositions));
    const evaluate=layouts=>E().calculate('annual',{
      ...climate,watts:c.watts,system,scene,layouts:layouts.map(positions=>G().panelSurfaces(c,positions))
    },signal);
    const [manual]=await evaluate([manualPositions]);
    const spots=candidates(c,{spacing,step});
    const seen=new Set(spots.map(p=>JSON.stringify([p.x,p.z,p.rotation||0])));
    for(const p of [...manualPositions,...G().packPanels(c.count,c.bearing-c.house,c.length,c.width,G().moduleFor(c.watts),c.outline)]) {
      const key=JSON.stringify([p.x,p.z,p.rotation||0]);if(!seen.has(key)&&valid([p],c,spacing)){spots.push({...p});seen.add(key);}
    }
    const ranking=[];
    for(let start=0;start<spots.length;start+=24){
      const chunk=spots.slice(start,start+24);
      const values=await evaluate(chunk.map(position=>[position]));
      chunk.forEach((position,i)=>ranking.push({position,...values[i]}));
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
        const [value]=await evaluate([next]);
        if(!best || value.acKwh>best.value.acKwh+1e-9)best={positions:next,value};
      }
      yield {completed:spots.length,total:spots.length};
    }
    if(!best)throw Error('Chưa tìm được bố trí đủ số tấm và khoảng cách yêu cầu. Giảm khoảng cách hoặc tăng kích thước mái.');
    return {config:c,positions:best.positions.map(p=>({...p})),manual,proposed:best.value,ranking,spacing,step,year:climate.year,annualPoa:climate.annualPoa};
  }
  root.AnnualPlacement={scenario,candidates,valid,propose};
  if (typeof module !== 'undefined') module.exports = root.AnnualPlacement;
})(typeof window !== 'undefined' ? window : globalThis);
