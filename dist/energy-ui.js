(() => {
if (!globalThis.isSolarCalculator) return;
const energyDialog = document.getElementById('energy-dialog');
const energyForm = document.getElementById('energy-form');
const systemFields={losses:{temperature:'loss-temperature',wiring:'loss-wiring',soiling:'loss-soiling',other:'loss-other'},inverter:{acKw:'inverter-ac',maxPvKw:'inverter-pv',efficiency:'inverter-efficiency',mpptCount:'mppt-count',mpptMinV:'mppt-min',mpptMaxV:'mppt-max',mpptMaxA:'mppt-current',operatingV:'mppt-operating'}};
let lastValidSystem=Energy.defaultSystem();
globalThis.readEnergySystem=()=>lastValidSystem=Energy.validateSystem(Object.fromEntries(Object.entries(systemFields).map(([group,fields])=>[group,Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,Number($(id).value)]))])));
globalThis.getStoredEnergySystem=()=>{try{return globalThis.readEnergySystem();}catch{return lastValidSystem;}};
globalThis.applyEnergySystem=system=>{
  const valid=lastValidSystem=Energy.validateSystem(system);
  for(const [group,fields] of Object.entries(systemFields))for(const [key,id] of Object.entries(fields))$(id).value=valid[group][key];
};
globalThis.applyEnergySystem(Energy.defaultSystem());
$('energy-reserve').checked=false;
let energyRequest = 0, energyController, lastPredictionAt = 0;
let noticeTimer, noticeHide, noticePriorityUntil=0;
globalThis.showSolarNotice=(message,priority=false)=>{
  if(!priority && Date.now()<noticePriorityUntil)return;
  if(priority)noticePriorityUntil=Date.now()+6000;
  clearTimeout(noticeTimer);clearTimeout(noticeHide);
  noticeTimer=setTimeout(()=>{const node=$('solar-notice');node.textContent=message;node.hidden=false;noticeHide=setTimeout(()=>node.hidden=true,6000);},priority?0:600);
};
globalThis.invalidateSolarPrediction = () => {
  energyRequest++;
  energyController?.abort();
  $('energy-calculate').disabled = false;
  $('energy-result').hidden = true;
  $('energy-preview').hidden = true;
  globalThis.showSolarNotice('Cấu hình đã đổi. Bấm Tính sản lượng hôm nay để cập nhật.');
  $('energy-status').textContent = 'Thông số đã đổi. Bấm tính để cập nhật sản lượng.';
};
energyForm.addEventListener('input', globalThis.invalidateSolarPrediction);
energyForm.addEventListener('invalid', event => {
  if (Object.values(systemFields).some(fields=>Object.values(fields).includes(event.target.id)) && !['inverter-ac','inverter-pv'].includes(event.target.id)) $('inverter-advanced').open=true;
}, true);
$('energy-preview-open').onclick = () => {
  energyDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('energy-location').textContent = `${$('location-name').textContent} · ${lat.toFixed(4)}, ${lon.toFixed(4)} · UTC${offset >= 0 ? '+' : ''}${offset}`;
  if (!$('energy-status').textContent) $('energy-status').textContent = 'Nhập thông số hệ thống để dự đoán tổng điện năng hôm nay.';
};
$('energy-close').hidden = true;
let savedProfile = null;
try { savedProfile = SolarProfile.migrate(localStorage, document); } catch {}
function saveProfile() {
  savedProfile = { version: 1, kwp: Number($('energy-count').value)*Number($('energy-watts').value)/1000, count:Number($('energy-count').value), watts:Number($('energy-watts').value), loss:0, system:globalThis.readEnergySystem(), tilt: Number($('energy-tilt').value), azimuth: Number($('energy-azimuth').value), lat, lon, offset };
  try {
    SolarProfile.write(savedProfile, localStorage);
    $('profile-status').textContent = 'Đã lưu cấu hình trên trình duyệt này. Lần mở sau tự tải dự báo mới cho hôm nay.';
  } catch {
    $('profile-status').textContent = 'Trình duyệt không cho lưu cấu hình. Vẫn tính được nhưng lần mở sau cần nhập lại.';
  }
}
energyForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!energyForm.reportValidity()) return;
  if (!locationReady) { $('energy-status').textContent = 'Cần cấp quyền GPS trước khi dự đoán điện mặt trời.'; return; }
  try {globalThis.readEnergySystem();saveProfile();calculateEnergy();} catch(error){$('energy-status').textContent=error.message;}
});
function forecastInputKey() {
  const scene=globalThis.getEnergyScene();
  return JSON.stringify([scene.config,scene.positions,globalThis.readEnergySystem(),lat,lon,offset,today(),$('energy-reserve').checked,Number($('energy-tilt').value),Number($('energy-azimuth').value),Number($('energy-count').value),Number($('energy-watts').value)]);
}
async function calculateEnergy() {
  if (!energyForm.checkValidity()) {
    $('energy-status').textContent = 'Thông số hệ thống không hợp lệ.';
    return;
  }
  if (!locationReady) {
    $('energy-status').textContent = 'Cần cấp quyền GPS trước khi dự đoán điện mặt trời.';
    return;
  }
  const kwp = Number($('energy-count').value)*Number($('energy-watts').value)/1000;
  if (!Number.isInteger(Number($('energy-count').value)) || Number($('energy-count').value)<1 || Number($('energy-count').value)>30 || !PanelGeometry.moduleFor(Number($('energy-watts').value))) return;
  $('energy-location').textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)} · UTC${offset >= 0 ? '+' : ''}${offset}`;
  const day = today();
  // The selected UTC offset defines today's midnight; ignore simulation date/time.
  const start = Date.parse(`${day}T00:00:00Z`) / 1000 - offset * 3600, end = start + 86400;
  const from = new Date((start - 86400) * 1000).toISOString().slice(0, 10);
  const to = new Date((end + 86400) * 1000).toISOString().slice(0, 10);
  const request = ++energyRequest;
  energyController?.abort();
  const controller = energyController = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  $('energy-preview').hidden = false;
  $('energy-preview-text').textContent = 'Đang dự đoán sản lượng hôm nay…';
  $('energy-result').hidden = true;
  $('energy-status').textContent = 'Đang lấy dự báo bức xạ theo giờ hôm nay…';
  $('energy-calculate').disabled = true;
  try {
    const system=globalThis.readEnergySystem(),scene=globalThis.getEnergyScene();
    if(kwp>system.inverter.maxPvKw)throw Error('Công suất PV DC vượt giới hạn tiếp nhận của inverter.');
    const forecastLocation={lat,lon,offset},inputKey=forecastInputKey();
    const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), hourly: 'global_tilted_irradiance,direct_normal_irradiance,cloud_cover,rain,showers', tilt: String(scene.config.tilt), azimuth: String(scene.config.bearing - 180), timezone: 'UTC', timeformat: 'unixtime', start_date: from, end_date: to });
    const response = await ForecastClient.fetch(params, { signal: controller.signal });
    if (!response.ok) throw new Error('Không tải được dự báo. Hãy kiểm tra mạng và thử lại.');
    const data = await response.json();
    if (request !== energyRequest) return;
    if(inputKey!==forecastInputKey()){globalThis.invalidateSolarPrediction();return;}
    if(controller.signal.aborted)throw new DOMException('Yêu cầu quá thời gian','AbortError');
    if (data.hourly_units?.global_tilted_irradiance !== 'W/m²' || data.hourly_units?.direct_normal_irradiance !== 'W/m²') throw new Error('Đơn vị bức xạ không hợp lệ.');
    const result = Energy.estimateSystem(data.hourly, start, end, {...system,scene,location:forecastLocation});
    renderEnergyAnalysis(result, forecastLocation.offset);
    const reserve = Energy.weatherReserve(data.hourly, result);
    const useReserve = $('energy-reserve').checked && reserve !== null;
    const output = useReserve ? reserve.kwh : result.kwh;
    const reduction = useReserve ? reserve.percent : 0;
    const weatherLabel = reserve === null ? 'Thiếu dự báo mây/mưa; giữ sản lượng gốc' : result.kwh === 0 ? 'Không có bức xạ tạo điện' : `${reserve.cloudCover >= 50 ? 'Nhiều mây' : 'Ít mây'}${reserve.rain ? ' · Có mưa' : ' · Không mưa'}`;
    $('energy-weather').textContent = `${weatherLabel} · Giảm dự phòng ${reduction.toFixed(1)}% · Gốc ${result.kwh.toFixed(1)} kWh → ${output.toFixed(1)} kWh`;
    lastPredictionAt = Date.now();
    $('energy-kwh').textContent = output.toLocaleString(globalThis.solLocale?.() || 'vi-VN', { maximumFractionDigits: 1 });
    $('energy-summary').textContent = `Ngày ${day} · PV DC ${kwp} kWp · Inverter AC ${system.inverter.acKw} kW · UTC${offset >= 0 ? '+' : ''}${offset}`;
    $('energy-formula').textContent=`DC lý tưởng ${result.rawDcKwh.toFixed(2)} kWh → trừ bóng che ${result.shadeLossKwh.toFixed(2)} → hao hụt DC ${Object.values(result.lossKwh).reduce((a,b)=>a+b,0).toFixed(2)} → DC còn ${result.dcKwh.toFixed(2)} kWh → MPPT mất ${result.mpptLossKwh.toFixed(2)} → chuyển đổi mất ${result.inverterLossKwh.toFixed(2)} → clipping AC ${result.clippingKwh.toFixed(2)} → AC ${result.kwh.toFixed(2)} kWh`;
    $('energy-detail').textContent=`Nhiệt độ ${result.lossKwh.temperature.toFixed(2)}, dây dẫn ${result.lossKwh.wiring.toFixed(2)}, bụi ${result.lossKwh.soiling.toFixed(2)}, khác ${result.lossKwh.other.toFixed(2)} kWh. Hiệu suất inverter ${system.inverter.efficiency}%. Lấy dữ liệu lúc ${new Date(data._cache?.fetched_at || Date.now()).toLocaleTimeString(globalThis.solLocale?.() || 'vi-VN')}.`;
    $('energy-hourly').innerHTML=result.hours.map(h=>`<details><summary>${new Date((h.time+offset*3600)*1000).toISOString().slice(11,16)} · Kết thúc khoảng ${h.durationHours.toFixed(2)} giờ · DC ${h.dcKwh.toFixed(3)} / AC ${h.kwh.toFixed(3)} kWh</summary><table><thead><tr><th>Tấm</th><th>MPPT</th><th>Diện tích có nắng TB</th><th>DC kWh</th><th>AC phân bổ kWh</th></tr></thead><tbody>${h.panels.map(p=>`<tr><td>${p.id}</td><td>${p.mppt}</td><td>${(p.litFraction*100).toFixed(1)}%</td><td>${p.dcKwh.toFixed(3)}</td><td>${p.acKwh.toFixed(3)}</td></tr>`).join('')}</tbody></table></details>`).join('');
    $('energy-status').textContent = data._cache?.stale ? 'Đang dùng dữ liệu đã lưu do dịch vụ thời tiết tạm lỗi.' : 'Đã tính theo dự báo bức xạ có xét điều kiện mây của mô hình thời tiết.';
    $('energy-result').hidden = false;
    $('energy-preview-text').textContent = `☀ Hôm nay ${day}: khoảng ${output.toLocaleString(globalThis.solLocale?.() || 'vi-VN', { maximumFractionDigits: 1 })} kWh · hệ ${kwp} kWp${savedProfile ? '' : ' (mẫu, hãy chỉnh công suất)'} · ${weatherLabel} · Giảm dự phòng ${reduction.toFixed(1)}%${data._cache?.stale ? ' · Dữ liệu lưu tạm' : ''} · dự báo, không phải số điện đã đo`;
  } catch (error) {
    if (request === energyRequest) {
      lastPredictionAt=0;
      $('energy-preview-text').textContent = 'Chưa tải được dự báo điện hôm nay. Mở hệ thống để thử lại.';
      $('energy-status').textContent = error.name === 'AbortError' ? 'Yêu cầu quá thời gian. Hãy thử lại.' : error.message;
    }
  } finally {
    clearTimeout(timeout);
    if (request === energyRequest) $('energy-calculate').disabled = false;
  }
}
function renderEnergyAnalysis(result, offset) {
  $('energy-dc-total').textContent=result.dcKwh.toFixed(2);
  $('energy-ac-total').textContent=result.kwh.toFixed(2);
  const hours=result.hours, max=Math.max(.1,...hours.map(h=>h.dcKwh/h.durationHours),...hours.map(h=>h.kwh/h.durationHours));
  const top=Math.ceil(max*10)/10, x=i=>48+i*544/Math.max(1,hours.length-1), y=v=>210-v/top*180;
  const local=t=>new Date((t+offset*3600)*1000).toISOString().slice(11,16);
  const series=key=>hours.map((h,i)=>`${x(i).toFixed(2)},${y(h[key]/h.durationHours).toFixed(2)}`).join(' ');
  const grid=Array.from({length:5},(_,i)=>{const value=top*i/4,py=y(value);return `<line x1="48" x2="592" y1="${py}" y2="${py}" class="chart-grid"/><text x="40" y="${py+4}" text-anchor="end">${value.toFixed(1)}</text>`;}).join('');
  const ticks=hours.map((h,i)=>i%Math.max(1,Math.ceil(hours.length/5))===0||i===hours.length-1?`<text x="${x(i)}" y="235" text-anchor="middle">${local(h.time)}</text>`:'').join('');
  $('energy-chart').innerHTML=`<svg viewBox="0 0 640 250" role="img" aria-label="Công suất DC và AC trung bình trong từng khoảng giờ, chi tiết qua thanh chọn bên dưới"><g>${grid}${ticks}</g><polyline class="chart-dc" points="${series('dcKwh')}"/><polyline class="chart-ac" points="${series('kwh')}"/><g aria-hidden="true"><line id="energy-chart-cursor" class="chart-cursor" y1="30" y2="210"/><circle id="energy-chart-dot-dc" class="chart-dot chart-dot-dc" r="8"/><circle id="energy-chart-dot-ac" class="chart-dot chart-dot-ac" r="5"/></g></svg>`;
  const slider=$('energy-chart-hour');slider.max=Math.max(0,hours.length-1);slider.value=String(Math.max(0,hours.findIndex(h=>h.kwh>0)));
  const show=()=>{const h=hours[Number(slider.value)];if(!h)return;
    const px=x(Number(slider.value));
    $('energy-chart-cursor').setAttribute('x1',px);
    $('energy-chart-cursor').setAttribute('x2',px);
    for(const [id,key] of [['energy-chart-dot-dc','dcKwh'],['energy-chart-dot-ac','kwh']]) {
      $(id).setAttribute('cx',px);
      $(id).setAttribute('cy',y(h[key]/h.durationHours));
    }
    $('energy-chart-reading').textContent=`${local(h.time-h.durationHours*3600)}–${local(h.time)} · DC ${(h.dcKwh/h.durationHours).toFixed(2)} kW · AC ${(h.kwh/h.durationHours).toFixed(2)} kW`;};
  slider.oninput=show;show();
  const rows=[['DC trước tổn thất',result.rawDcKwh],['Bóng che',result.shadeLossKwh],['Nhiệt độ',result.lossKwh.temperature],['Dây dẫn DC',result.lossKwh.wiring],['Bụi bẩn',result.lossKwh.soiling],['Khác',result.lossKwh.other],['Giới hạn MPPT',result.mpptLossKwh],['Chuyển đổi inverter',result.inverterLossKwh],['Clipping AC',result.clippingKwh],['AC đầu ra',result.kwh]];
  $('energy-loss-table').innerHTML=rows.map(([label,value])=>`<tr><th scope="row">${label}</th><td>${value.toFixed(2)}</td><td>${(result.rawDcKwh?value/result.rawDcKwh*100:0).toFixed(1)}%</td></tr>`).join('');
}
let profileLocationKey = '';
let predictionStarted = false;
let lastPredictionDay = '';
if (savedProfile) {
  if (savedProfile.watts) $('energy-watts').value=savedProfile.watts;
  if (savedProfile.count) $('panel-count').value=$('energy-count').value=savedProfile.count;
  if(savedProfile.system)globalThis.applyEnergySystem(savedProfile.system);
  for (const key of ['tilt', 'azimuth']) $('energy-' + key).value = savedProfile[key];
  $('profile-status').textContent = 'Đã đọc cấu hình lưu trên trình duyệt. Đang dùng dự báo mới cho hôm nay.';

}
profileLocationKey = `${lat},${lon},${offset}`;
lastPredictionDay = today();
globalThis.onSolarLocationChanged = () => {
  const key = `${lat},${lon},${offset}`;
  if (!locationReady || (predictionStarted && key === profileLocationKey && today() === lastPredictionDay && Date.now() - lastPredictionAt < 1800000)) return;
  predictionStarted = true;
  profileLocationKey = key;
  lastPredictionDay = today();
  // Persist only on explicit Calculate; background refresh must not save draft inputs.
  calculateEnergy();
};
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) globalThis.onSolarLocationChanged();
});
setInterval(() => {
  if (!document.hidden) globalThis.onSolarLocationChanged();
}, 60000);

$('energy-reserve').addEventListener('change', () => { globalThis.invalidateSolarPrediction();if (locationReady && energyForm.checkValidity()) calculateEnergy(); });

})();
