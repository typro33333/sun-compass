(function (root) {
  function estimate(input) {
    const {day,night,watts,yieldPerKwp,peak=0,coverage=100}=input;
    for(const value of [day,night,watts,yieldPerKwp,peak,coverage]) if(!Number.isFinite(value)) throw Error('Vui lòng nhập đủ thông số hợp lệ.');
    if(day<0 || night<0 || day+night<=0 || watts<100 || watts>1000 || yieldPerKwp<=0 || yieldPerKwp>10 || peak<0 || coverage<0 || coverage>100) throw Error('Điện dùng phải lớn hơn 0; kiểm tra công suất tấm và sản lượng trên mỗi kWp.');
    // Explicit planning assumptions, not equipment-specific performance guarantees.
    const roundTrip=.90, discharge=.95, usable=.90, dcAcRatio=1.2;
    const storedLoad=night*coverage/100;
    const requiredEnergy=day+storedLoad/roundTrip;
    const panels=Math.ceil(requiredEnergy/(yieldPerKwp*watts/1000));
    const pvKwp=panels*watts/1000;
    const batteryKwh=Math.ceil(storedLoad/(usable*discharge));
    const inverterKw=Math.ceil(Math.max(pvKwp/dcAcRatio,peak));
    return {panels,pvKwp,batteryKwh,inverterKw,storedLoad,requiredEnergy,
      production:pvKwp*yieldPerKwp,gridNight:night-storedLoad,
      dayOnlyPanels:Math.ceil(day/(yieldPerKwp*watts/1000)),peakKnown:peak>0};
  }
  root.SystemSizing={estimate};
  if (typeof module !== 'undefined') module.exports = root.SystemSizing;
  if(typeof document==='undefined')return;
  const form=document.getElementById('sizing-form');
  const result=document.getElementById('sizing-result');
  function render() {
    if(!form.checkValidity()){result.hidden=true;return;}
    try {
      const input=Object.fromEntries(['day','night','watts','yield','peak','coverage'].map(key=>[key,Number(document.getElementById('sizing-'+key).value)]));
      const r=estimate({...input,yieldPerKwp:input.yield});
      document.getElementById('sizing-pv').textContent=`${r.panels} tấm · ${r.pvKwp.toFixed(2)} kWp`;
      document.getElementById('sizing-inverter').textContent=`${r.inverterKw} kW${r.batteryKwh?' · Hybrid':''}`;
      document.getElementById('sizing-battery').textContent=`${r.batteryKwh} kWh`;
      document.getElementById('sizing-detail').textContent=`PV cần tạo ${r.requiredEnergy.toFixed(1)} kWh/ngày, gồm điện ban ngày và điện sạc bù hao hụt. Cấu hình làm tròn tạo khoảng ${r.production.toFixed(1)} kWh/ngày theo giả định. Lưu trữ cấp ${r.storedLoad.toFixed(1)} kWh cho ban đêm; còn ${r.gridNight.toFixed(1)} kWh/đêm lấy từ lưới theo mục tiêu đã chọn.`;
      document.getElementById('sizing-caveat').textContent=(r.peakKnown?'Inverter sơ bộ đã xét tải đồng thời bạn nhập.':'Chưa có tải đồng thời: inverter chỉ được chọn sơ bộ theo PV; nhập kW tải đỉnh để kiểm tra thêm.')+' Cần đối chiếu công suất sạc/xả pin, giới hạn PV/MPPT và dòng khởi động của thiết bị.'+(r.panels>30?' Gợi ý vượt 30 tấm, ngoài giới hạn mô phỏng mái hiện tại.':'');
      document.getElementById('sizing-alternative').textContent=`Phương án ít vốn hơn: khoảng ${r.dayOnlyPanels} tấm cho ${input.day} kWh ban ngày, không lưu trữ và dùng lưới ban đêm. Chưa có giá thiết bị, giá điện và biểu đồ tải nên chưa kết luận phương án nào hoàn vốn tốt nhất.`;
      document.getElementById('sizing-error').textContent='';result.hidden=false;
    } catch(error) {result.hidden=true;document.getElementById('sizing-error').textContent=error.message;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  form.addEventListener('input',render);
  render();
})(typeof window !== 'undefined' ? window : globalThis);
