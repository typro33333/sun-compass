(function (root) {
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
  const planningLimits={dayKwh:[0,10000],nightKwh:[0,10000],capacity:[0,10000],power:[0,1000],price:[1,1e6],capital:[1,1e13],annualCost:[0,1e12],years:[1,50]};
  function validPlan(p){
    return p && Object.entries(planningLimits).every(([key,[min,max]])=>Number.isFinite(p[key])&&p[key]>=min&&p[key]<=max)
      && Number.isInteger(p.years)&&p.dayKwh+p.nightKwh>0&&(p.capacity===0||p.power>0);
  }
  function geometry(scene) {
    const {house,bearing,tilt}=scene.config;
    return {house,bearing,tilt,panels:scene.modules,volumes:scene.volumes};
  }
  async function calculate(endpoint,input,signal){
    const response=await fetch('/api/calc/'+endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal});
    if(!response.ok){
      const detail=response.status===422?(await response.json()).error?.trim():'';
      throw Error(detail || 'Không tải được dự báo. Hãy kiểm tra mạng và thử lại.');
    }
    return response.json();
  }
  root.Energy={defaultSystem,validateSystem,planningLimits,validPlan,geometry,calculate};
  if (typeof module !== 'undefined') module.exports = root.Energy;
})(typeof window !== 'undefined' ? window : globalThis);
