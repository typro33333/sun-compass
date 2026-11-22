(() => {
if (!globalThis.isSolarCalculator) return;
const energyDialog = document.getElementById('energy-dialog');
const energyForm = document.getElementById('energy-form');
let energyRequest = 0, energyController, lastPredictionAt = 0;
globalThis.invalidateSolarPrediction = () => {
  energyRequest++;
  energyController?.abort();
  $('energy-calculate').disabled = false;
  $('energy-result').hidden = true;
  $('energy-preview').hidden = true;
  $('energy-status').textContent = 'Thông số đã đổi. Bấm tính để cập nhật sản lượng.';
};
energyForm.addEventListener('input', globalThis.invalidateSolarPrediction);
$('energy-preview-open').onclick = () => {
  energyDialog.scrollIntoView({ behavior: 'smooth', block: 'start' });
  $('energy-location').textContent = `${$('location-name').textContent} · ${lat.toFixed(4)}, ${lon.toFixed(4)} · UTC${offset >= 0 ? '+' : ''}${offset}`;
  if (!$('energy-status').textContent) $('energy-status').textContent = 'Nhập thông số hệ thống để dự đoán tổng điện năng hôm nay.';
};
$('energy-close').hidden = true;
let savedProfile = null;
try { savedProfile = SolarProfile.migrate(localStorage, document); } catch {}
function saveProfile() {
  savedProfile = { version: 1, kwp: Number($('energy-count').value)*Number($('energy-watts').value)/1000, count:Number($('energy-count').value), watts:Number($('energy-watts').value), loss: Number($('energy-loss').value), tilt: Number($('energy-tilt').value), azimuth: Number($('energy-azimuth').value), lat, lon, offset };
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
  saveProfile();
  calculateEnergy();
});
async function calculateEnergy() {
  if (!energyForm.checkValidity()) {
    $('energy-status').textContent = 'Thông số hệ thống không hợp lệ.';
    return;
  }
  if (!locationReady) {
    $('energy-status').textContent = 'Cần cấp quyền GPS trước khi dự đoán điện mặt trời.';
    return;
  }
  const kwp = Number($('energy-count').value)*Number($('energy-watts').value)/1000, loss = Number($('energy-loss').value);
  if (!Number.isInteger(Number($('energy-count').value)) || Number($('energy-count').value)<1 || Number($('energy-count').value)>30 || !PanelGeometry.moduleFor(Number($('energy-watts').value))) return;
  const tilt = Number($('energy-tilt').value), azimuth = Number($('energy-azimuth').value);
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
    const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), hourly: 'global_tilted_irradiance,cloud_cover,rain,showers', tilt: String(tilt), azimuth: String(azimuth - 180), timezone: 'UTC', timeformat: 'unixtime', start_date: from, end_date: to });
    const response = await ForecastClient.fetch(params, { signal: controller.signal });
    if (!response.ok) throw new Error('Không tải được dự báo. Hãy kiểm tra mạng và thử lại.');
    const data = await response.json();
    if (request !== energyRequest) return;
    if (data.hourly_units?.global_tilted_irradiance !== 'W/m²') throw new Error('Đơn vị bức xạ không hợp lệ.');
    const result = Energy.estimate(data.hourly, start, end, kwp, loss);
    const reserve = Energy.weatherReserve(data.hourly, result);
    const useReserve = $('energy-reserve').checked && reserve !== null;
    const output = useReserve ? reserve.kwh : result.kwh;
    const reduction = useReserve ? reserve.percent : 0;
    const weatherLabel = reserve === null ? 'Thiếu dự báo mây/mưa; giữ sản lượng gốc' : result.kwh === 0 ? 'Không có bức xạ tạo điện' : `${reserve.cloudCover >= 50 ? 'Nhiều mây' : 'Ít mây'}${reserve.rain ? ' · Có mưa' : ' · Không mưa'}`;
    $('energy-weather').textContent = `${weatherLabel} · Giảm dự phòng ${reduction.toFixed(1)}% · Gốc ${result.kwh.toFixed(1)} kWh → ${output.toFixed(1)} kWh`;
    lastPredictionAt = Date.now();
    $('energy-kwh').textContent = output.toLocaleString(globalThis.solLocale?.() || 'vi-VN', { maximumFractionDigits: 1 });
    $('energy-summary').textContent = `Tổng cả ngày ${day} · hệ ${kwp} kWp · UTC${offset >= 0 ? '+' : ''}${offset}`;
    $('energy-formula').textContent = `Gốc ${kwp} kWp × ${result.irradiation.toFixed(2)} giờ nắng tương đương × ${(1 - loss / 100).toFixed(2)} = ${result.kwh.toFixed(1)} kWh`;
    $('energy-detail').textContent = `Tấm pin nghiêng ${tilt}°, hướng ${azimuth}° (Bắc = 0°). Hao hụt giả định ${loss}%. Lấy dữ liệu lúc ${new Date(data._cache?.fetched_at || Date.now()).toLocaleTimeString(globalThis.solLocale?.() || 'vi-VN')}. Ô thời tiết ~2 km.`;
    $('energy-status').textContent = data._cache?.stale ? 'Đang dùng dữ liệu đã lưu do dịch vụ thời tiết tạm lỗi.' : 'Đã tính theo dự báo bức xạ có xét điều kiện mây của mô hình thời tiết.';
    $('energy-result').hidden = false;
    $('energy-preview-text').textContent = `☀ Hôm nay ${day}: khoảng ${output.toLocaleString(globalThis.solLocale?.() || 'vi-VN', { maximumFractionDigits: 1 })} kWh · hệ ${kwp} kWp${savedProfile ? '' : ' (mẫu, hãy chỉnh công suất)'} · ${weatherLabel} · Giảm dự phòng ${reduction.toFixed(1)}%${data._cache?.stale ? ' · Dữ liệu lưu tạm' : ''} · dự báo, không phải số điện đã đo`;
  } catch (error) {
    if (request === energyRequest) {
      $('energy-preview-text').textContent = 'Chưa tải được dự báo điện hôm nay. Mở hệ thống để thử lại.';
      $('energy-status').textContent = error.name === 'AbortError' ? 'Yêu cầu quá thời gian. Hãy thử lại.' : error.message;
    }
  } finally {
    clearTimeout(timeout);
    if (request === energyRequest) $('energy-calculate').disabled = false;
  }
}
let profileLocationKey = '';
let predictionStarted = false;
let lastPredictionDay = '';
if (savedProfile) {
  if (savedProfile.watts) $('energy-watts').value=savedProfile.watts;
  if (savedProfile.count) $('panel-count').value=$('energy-count').value=savedProfile.count;
  for (const key of ['loss', 'tilt', 'azimuth']) $('energy-' + key).value = savedProfile[key];
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
  lastPredictionAt = Date.now();
  calculateEnergy();
};
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) globalThis.onSolarLocationChanged();
});
setInterval(() => {
  if (!document.hidden) globalThis.onSolarLocationChanged();
}, 60000);

$('energy-reserve').addEventListener('change', () => { if (locationReady && energyForm.checkValidity()) calculateEnergy(); });

})();
