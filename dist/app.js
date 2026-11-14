const $=id=>document.getElementById(id),R=Math.PI/180;
let locationReady=false;
let lat=10.8231,lon=106.6297,offset=7,minute=0,heading=0,playing=null,events;
try {
  const savedOffset = localStorage.getItem('sol-utc-offset');
  if (savedOffset !== null && savedOffset.trim() !== '') {
    const parsed = Number(savedOffset);
    if (Number.isFinite(parsed) && parsed >= -12 && parsed <= 14 && Number.isInteger(parsed * 4)) offset = parsed;
  }
} catch {}
const today=()=>new Date(Date.now()+offset*3600000).toISOString().slice(0,10);
function setCurrentTime() {
  const now = new Date(Date.now() + offset * 3600000);
  $('date').value = now.toISOString().slice(0, 10);
  minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  $('timezone').value = offset;
  $('time').value = minute;
  $('selected-time').textContent = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
}
setCurrentTime();
const fmt=m=>m===null?'—':`${String(Math.floor(Math.round(m)/60)%24).padStart(2,'0')}:${String(Math.round(m)%60).padStart(2,'0')}`;
const direction=a=>['B','ĐB','Đ','ĐN','N','TN','T','TB'][Math.round(a/45)%8];
const point=(a,r)=>[300+r*Math.sin((a-heading)*R),300-r*Math.cos((a-heading)*R)];
const line=(a,r1,r2,color,width=1)=>{const p=point(a,r1),q=point(a,r2);return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${color}" stroke-width="${width}"/>`;};
let dailyOrbitKey = '', dailyOrbit = [];
function draw(){
 if (!locationReady) return;
 const day=$('date').value,p=Solar.position(day,minute,lat,lon,offset);
 let dial='<circle cx="300" cy="300" r="210" fill="none" stroke="#e4e8dc"/><circle cx="300" cy="300" r="155" fill="none" stroke="#edf0e8" stroke-dasharray="3 6"/><circle cx="300" cy="300" r="85" fill="none" stroke="#edf0e8" stroke-dasharray="3 6"/>';
 for(let a=0;a<360;a+=3)dial+=line(a,a%30===0?218:224,232,a%30===0?'#98a58e':'#cfd6c5',a%30===0?1.5:1);
 for(let a=0;a<360;a+=30){const [x,y]=point(a,201);dial+=`<text x="${x}" y="${y+3}" text-anchor="middle" font-size="9" fill="#9da693">${a}°</text>`;}
 ['B','Đ','N','T'].forEach((d,i)=>{const [x,y]=point(i*90,260);dial+=`<text x="${x}" y="${y+6}" text-anchor="middle" font-size="19" font-weight="500" fill="${i===0?'#c18d53':'#687e6a'}">${d}</text>`;});$('dial').innerHTML=dial;
 const orbitKey = `${day},${lat},${lon},${offset}`;
 if (orbitKey !== dailyOrbitKey) {
   dailyOrbitKey = orbitKey;
   dailyOrbit = Array.from({ length: 361 }, (_, i) => Solar.position(day,i*4,lat,lon,offset));
 }
 let path='',pen=false;for(const s of dailyOrbit){if(s.altitude<-.833){pen=false;continue;}const [x,y]=point(s.azimuth,210*(90-Math.max(0,s.altitude))/90);path+=`${pen?'L':'M'}${x},${y} `;pen=true;}
 let plot=`<path d="${path}" fill="none" stroke="#c2ae72" stroke-width="1.6" stroke-dasharray="4 5"/>`;
 [[events.rise,'#6b977d','MỌC'],[events.set,'#cb8564','LẶN']].forEach(([m,c,t])=>{if(m===null)return;const s=Solar.position(day,m,lat,lon,offset),[x,y]=point(s.azimuth,210),label=point(s.azimuth,177);plot+=line(s.azimuth,20,210,c,.7)+`<circle cx="${x}" cy="${y}" r="5" fill="${c}"/><text x="${label[0]}" y="${label[1]-9}" font-size="9" text-anchor="middle" fill="${c}">${t}</text>`;});
 const [x,y]=point(p.azimuth,210*(90-Math.max(0,p.altitude))/90);plot+=line(p.azimuth,17,210,'#d2aa4f',1);plot+=`<circle cx="${x}" cy="${y}" r="25" fill="#f3cb66" opacity=".15"/><circle cx="${x}" cy="${y}" r="14" fill="${p.altitude>=-.833?'#efc15b':'#a4b0b7'}" stroke="white" stroke-width="4" filter="url(#shadow)"/>`;$('plot').innerHTML=plot;
 $('selected-time').textContent=fmt(minute);$('azimuth').textContent=`${p.azimuth.toFixed(1)}° ${direction(p.azimuth)}`;$('altitude').textContent=`${p.altitude.toFixed(1)}°`;
 $('day-status').textContent=p.altitude>=-.833?'Ban ngày':'Ban đêm';$('phase').textContent=p.altitude<-.833?'Dưới đường chân trời':p.altitude<6?'Ánh nắng sát chân trời':'Nắng ban ngày';$('time').value=minute;$('time').setAttribute('aria-valuetext',fmt(minute));
 updateWeatherVisibility();
 globalThis.renderSolarScene?.();
}
function refresh(){if (!locationReady) return;globalThis.onSolarLocationChanged?.();syncMonth();loadWeather();events=Solar.events($('date').value,lat,lon,offset);for(const [key,m] of [['rise',events.rise],['set',events.set]]){$(key+'-time').textContent=fmt(m);$(key+'-dir').textContent=m===null?'Không xảy ra':(()=>{const a=Solar.position($('date').value,m,lat,lon,offset).azimuth;return `${Math.round(a)}° ${direction(a)}`;})();}$('daylength').textContent=`${Math.floor(events.daylight/60)} giờ ${events.daylight%60} phút`;draw();}
function stop(){clearInterval(playing);playing=null;$('play').textContent='Tự chạy';$('play').dataset.playing='false';}
$('time').addEventListener('input',e=>{stop();minute=+e.target.value;draw();});
$('date').addEventListener('change',()=>{if(!$('date').value){$('date').value=today();}refresh();});
$('timezone').addEventListener('change', () => {
  if ($('timezone').value === '' || !$('timezone').checkValidity()) {
    $('timezone').reportValidity();
    return;
  }
  offset = Number($('timezone').value);
  try { localStorage.setItem('sol-utc-offset', String(offset)); } catch {}
  refresh();
});
$('now').onclick=()=>{stop();setCurrentTime();refresh();};
$('play').onclick=()=>{if(playing){stop();return;}$('play').textContent='Tạm dừng';$('play').dataset.playing='true';playing=setInterval(()=>{minute=(minute+3)%1440;draw();},100);};
function syncMonth() {
  const [year, month] = $('date').value.split('-');
  $('month').value = Number(month);
  $('month-label').textContent = `Tháng ${Number(month)} / ${year}`;
  $('month').setAttribute('aria-valuetext', `Tháng ${Number(month)} năm ${year}`);
}
$('month').addEventListener('input', () => {
  stop();
  const [year, , day] = $('date').value.split('-').map(Number);
  const month = Number($('month').value);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  $('date').value = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(Math.min(day, maxDay)).padStart(2, '0')}`;
  refresh();
});
let weatherKey = '', weatherUpdated = 0, weatherRequest = 0, weatherController;
let weatherAvailable = false;
function updateWeatherVisibility() {
  const now = new Date(Date.now() + offset * 3600000);
  const nearNow = $('date').value === today() && Math.abs(minute - (now.getUTCHours() * 60 + now.getUTCMinutes())) <= 30;
  $('clouds').style.display = weatherAvailable && nearNow ? '' : 'none';
}
function renderWeather(cloudCover, raining) {
  const count = Math.round(cloudCover / 100 * 9);
  $('clouds').innerHTML = Array.from({ length: count }, (_, i) => {
    const x = 105 + (i * 107) % 320, y = 135 + (i * 83) % 320;
    return `<g class="cloud-drift" style="animation-delay:-${i * 7}s;animation-duration:${28 + i * 3}s"><g transform="translate(${x} ${y}) scale(${0.65 + (i % 3) * 0.2})"><path d="M-48 15 C-67 15-67-12-47-15 C-48-42-8-51 5-27 C25-43 50-25 46-8 C72-4 67 22 45 22 H-45Z" fill="#b6c3cd" opacity=".55"/></g></g>`;
  }).join('') + (raining ? Array.from({ length: 22 }, (_, i) => {
    const x = 130 + (i * 73) % 340, y = 150 + (i * 53) % 300;
    return `<line class="rain-drop" x1="${x}" y1="${y}" x2="${x - 5}" y2="${y + 13}" stroke="#729ab1" stroke-width="2" opacity=".5" style="animation-delay:-${i / 9}s"/>`;
  }).join('') : '');
  updateWeatherVisibility();
}
async function loadWeather(force = false) {
  if (!locationReady) return;
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (!force && key === weatherKey && Date.now() - weatherUpdated < 600000) return;
  weatherKey = key;
  weatherUpdated = Date.now();
  const request = ++weatherRequest;
  weatherController?.abort();
  weatherController = new AbortController();
  const controller = weatherController;
  const timeout = setTimeout(() => controller.abort(), 12000);
  weatherAvailable = false;
  $('clouds').innerHTML = '';
  $('weather-status').textContent = 'Đang tải thời tiết…';
  $('weather-cloud').textContent = 'Mây: —';
  $('weather-rain').textContent = 'Mưa: —';
  $('weather-time').textContent = '';
  try {
    const params = new URLSearchParams({ latitude: lat.toFixed(4), longitude: lon.toFixed(4), current: 'cloud_cover,rain,showers,weather_code', timeformat: 'unixtime', timezone: 'UTC' });
    const response = await ForecastClient.fetch(params, { signal: controller.signal });
    if (!response.ok) throw new Error('Weather unavailable');
    const data = await response.json(), current = data.current;
    if (!current || !['cloud_cover', 'rain', 'showers', 'weather_code', 'time', 'interval'].every(k => Number.isFinite(current[k])) || current.cloud_cover < 0 || current.cloud_cover > 100 || current.rain < 0 || current.showers < 0 || current.interval <= 0) throw new Error('Invalid weather');
    if (request !== weatherRequest) return;
    if (Math.abs(Date.now() - current.time * 1000) > 7200000) throw new Error('Stale weather');
    const rain = current.rain + current.showers;
    const rainyCodes = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
    const raining = rain > 0 || rainyCodes.includes(current.weather_code);
    const cloudLabel = current.cloud_cover < 10 ? 'Trời quang' : current.cloud_cover < 50 ? 'Ít mây' : current.cloud_cover < 85 ? 'Nhiều mây' : 'U ám';
    $('weather-cloud').textContent = `${cloudLabel} · ${current.cloud_cover}% mây`;
    $('weather-rain').textContent = `${raining ? 'Có mưa' : 'Không mưa'} · ${rain.toFixed(2)} mm / ${Math.round(current.interval / 60)} phút`;
    const stamp = new Date(current.time * 1000).toLocaleString(globalThis.solLocale?.() || 'vi-VN', { timeZone: 'UTC' });
    $('weather-time').textContent = `Dữ liệu lúc ${stamp} UTC · Tọa độ ${key} · ô thời tiết ~2 km`;
    $('weather-status').textContent = data._cache?.stale ? 'Đang dùng dữ liệu đã lưu do dịch vụ thời tiết tạm lỗi.' : 'Đã cập nhật dữ liệu thời tiết hiện tại.';
    weatherAvailable = true;
    renderWeather(current.cloud_cover, raining);
  } catch {
    if (request !== weatherRequest) return;
    weatherAvailable = false;
    $('clouds').innerHTML = '';
    $('weather-status').textContent = 'Không lấy được thời tiết mới. Kiểm tra kết nối và bấm cập nhật; chưa xác định được mây hoặc mưa.';
  } finally {
    clearTimeout(timeout);
  }
}
$('weather-retry').onclick = () => loadWeather(true);
setInterval(() => { if (!document.hidden) loadWeather(); }, 60000);
refresh();
