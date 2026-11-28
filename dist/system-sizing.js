(function () {
  const form=document.getElementById('sizing-form');
  const result=document.getElementById('sizing-result');
  let initial;
  try{initial=JSON.parse(result.dataset.initial);delete result.dataset.initial;}catch{}
  let revision=0,timer;
  async function render() {
    const current=++revision;
    if(!form.checkValidity()){result.hidden=true;return;}
    try {
      const input=Object.fromEntries(['day','night','watts','yield','peak','coverage'].map(key=>[key,Number(document.getElementById('sizing-'+key).value)]));
      let r;
      if(initial && Object.entries(initial.input).every(([k,v])=>(k==='yieldPerKwp'?input.yield:input[k])===v) && !input.peak){
        r=initial.result;
      }else{
        const response=await fetch('/api/calc/sizing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,yieldPerKwp:input.yield})});
        if(!response.ok)throw Error('Chưa thể tính hệ thống. Hãy thử lại.');
        r=await response.json();
      }
      initial=null;
      if(current!==revision)return;
      document.getElementById('sizing-pv').textContent=`${r.panels} tấm · ${r.pvKwp.toFixed(2)} kWp`;
      document.getElementById('sizing-inverter').textContent=`${r.inverterKw} kW${r.batteryKwh?' · Hybrid':''}`;
      document.getElementById('sizing-battery').textContent=`${r.batteryKwh} kWh`;
      document.getElementById('sizing-detail').textContent=`PV cần tạo ${r.requiredEnergy.toFixed(1)} kWh/ngày, gồm điện ban ngày và điện sạc bù hao hụt. Cấu hình làm tròn tạo khoảng ${r.production.toFixed(1)} kWh/ngày theo giả định. Lưu trữ cấp ${r.storedLoad.toFixed(1)} kWh cho ban đêm; còn ${r.gridNight.toFixed(1)} kWh/đêm lấy từ lưới theo mục tiêu đã chọn.`;
      document.getElementById('sizing-caveat').textContent=(r.peakKnown?'Inverter sơ bộ đã xét tải đồng thời bạn nhập.':'Chưa có tải đồng thời: inverter chỉ được chọn sơ bộ theo PV; nhập kW tải đỉnh để kiểm tra thêm.')+' Cần đối chiếu công suất sạc/xả pin, giới hạn PV/MPPT và dòng khởi động của thiết bị.'+(r.panels>30?' Gợi ý vượt 30 tấm, ngoài giới hạn mô phỏng mái hiện tại.':'');
      document.getElementById('sizing-alternative').textContent=`Phương án ít vốn hơn: khoảng ${r.dayOnlyPanels} tấm cho ${input.day} kWh ban ngày, không lưu trữ và dùng lưới ban đêm. Chưa có giá thiết bị, giá điện và biểu đồ tải nên chưa kết luận phương án nào hoàn vốn tốt nhất.`;
      document.getElementById('sizing-error').textContent='';result.hidden=false;
    } catch(error) {if(current!==revision)return;result.hidden=true;document.getElementById('sizing-error').textContent=error.message;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();render();});
  form.addEventListener('input',()=>{revision++;result.hidden=true;clearTimeout(timer);timer=setTimeout(render,180);});
  render();
})();
