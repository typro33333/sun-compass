// A rotatable 3D celestial hemisphere, projected onto a high-DPI canvas.
(() => {
  const canvas = $('sun-canvas'), ctx = canvas.getContext('2d');
  const panel = $('solar-3d'), compass = document.querySelector('.compass-wrap');
  let yaw = -0.35, pitch = 0.55, active = false, drag = null, follow = true;
  let lastMode = '';
  function manual() { follow = false; $('scene-follow').setAttribute('aria-pressed', 'false'); }
  let pathKey = '', orbit = [];
  const radians = Math.PI / 180;
  function vector(azimuth, altitude, radius = 1) {
    const a = azimuth * radians, h = altitude * radians;
    return [radius * Math.cos(h) * Math.sin(a), radius * Math.sin(h), -radius * Math.cos(h) * Math.cos(a)];
  }
  function render() {
    if (!active || !ctx) return;
    if (follow && globalThis.compassState?.ready) yaw = heading * radians;
    const mode = follow ? (globalThis.compassState?.ready ? '3D đang xoay theo la bàn thiết bị.' : '3D sẽ xoay theo điện thoại khi bật la bàn.') : '3D đang xoay bằng tay.';
    if (mode !== lastMode) { lastMode = mode; $('scene-mode').textContent = mode; }
    if (!locationReady) { $('scene-status').textContent = 'Đang chờ vị trí'; return; }
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const dark = document.documentElement.dataset.theme === 'dark';
    const ink = dark ? '#c9ded4' : '#466656', grid = dark ? '#3f5c62' : '#cedacf';
    const scale = Math.min(width * 0.35, height * 0.37);
    function project([x, y, z]) {
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw);
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw);
      return [width / 2 + rx * scale, height * 0.6 + (rz * Math.sin(pitch) - y * Math.cos(pitch)) * scale];
    }
    function stroke(points, color, lineWidth = 1, dashed = false, fill = null) {
      ctx.beginPath(); points.forEach((p, i) => { const [x,y] = project(p); if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y); });
      if (fill) { ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash(dashed ? [4,5] : []); ctx.stroke(); ctx.setLineDash([]);
    }
    const ring = radius => Array.from({length: 73}, (_, i) => vector(i * 5, 0, radius));
    stroke(ring(1), grid, 1.4, false, dark ? '#213b3b' : '#eaf1e5');
    [0.33,0.66].forEach(r => stroke(ring(r), grid));
    for (let a = 0; a < 360; a += 45) stroke([[0,0,0],vector(a,0)], grid);
    for (let a = 0; a < 180; a += 45) stroke(Array.from({length:37}, (_,i) => vector(a,i*5)), grid, 0.7, true);
    const key = `${$('date').value},${lat},${lon},${offset}`;
    if (key !== pathKey) {
      pathKey = key;
      orbit = Array.from({length: 241}, (_,i) => Solar.position($('date').value,i*6,lat,lon,offset));
    }
    let segment = [];
    for (const p of orbit) {
      if (p.altitude >= 0) segment.push(vector(p.azimuth,p.altitude));
      else if (segment.length) { stroke(segment,'#c99b40',2.3); segment=[]; }
    }
    if (segment.length) stroke(segment,'#c99b40',2.3);
    ctx.font = '600 13px sans-serif'; ctx.textAlign = 'center';
    ['Bắc','Đông','Nam','Tây'].forEach((label,i) => {
      const [x,y] = project(vector(i*90,0,1.14)); ctx.fillStyle = i===0 ? '#c18b38' : ink; ctx.fillText(globalThis.solText?.(label) || label,x,y+4);
    });
    for (const [time,color,label] of [[events.rise,'#6b977d','Mọc'],[events.set,'#cb8564','Lặn']]) {
      if (time === null) continue;
      const p = Solar.position($('date').value,time,lat,lon,offset);
      const [x,y] = project(vector(p.azimuth,0));
      ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.fillText(globalThis.solText?.(label) || label,x,y-10);
    }
    const p = Solar.position($('date').value,minute,lat,lon,offset), sun = vector(p.azimuth,p.altitude);
    // Below-horizon positions remain below the plane and use a dashed ray.
    stroke([[0,0,0],sun],p.altitude>=0 ? '#d8ad4a' : '#84979d',1.7,p.altitude<0);
    stroke([sun,[sun[0],0,sun[2]]],grid,1,true);
    const [sx,sy] = project(sun);
    const halo = ctx.createRadialGradient(sx,sy,3,sx,sy,27);
    halo.addColorStop(0,p.altitude>=0 ? '#efc15b99' : '#9babba55');halo.addColorStop(1,'transparent');
    ctx.fillStyle=halo;ctx.beginPath();ctx.arc(sx,sy,27,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.altitude>=0 ? '#efc15b' : '#9babba';ctx.beginPath();ctx.arc(sx,sy,9,0,Math.PI*2);ctx.fill();
    const [ox,oy]=project([0,0,0]),[hx,hy]=project([0,.14,0]);
    ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(hx,hy+4);ctx.stroke();
    ctx.fillStyle=ink;ctx.beginPath();ctx.arc(hx,hy,4,0,Math.PI*2);ctx.fill();
    ctx.font='11px sans-serif';ctx.fillText(globalThis.solText?.('Bạn') || 'Bạn',ox,oy+20);
    $('scene-status').textContent=`${fmt(minute)} · Phương vị ${p.azimuth.toFixed(1)}° · Độ cao ${p.altitude.toFixed(1)}°${p.altitude<0 ? ' · Dưới đường chân trời' : ''}`;
  }
  function select(threeD) {
    active = threeD;
    panel.hidden = !threeD; compass.hidden = threeD;
    $('view-2d').setAttribute('aria-pressed',String(!threeD));
    $('view-3d').setAttribute('aria-pressed',String(threeD));
    render();
  }
  $('view-2d').onclick=()=>select(false);
  $('view-3d').onclick=()=>select(true);
  if (!ctx) { $('view-3d').disabled=true; $('view-3d').title='Trình duyệt không hỗ trợ canvas';return; }
  canvas.addEventListener('pointerdown', e => {
    if (drag || (e.pointerType==='mouse' && e.button!==0)) return;
    manual();
    drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if (!drag || drag.id!==e.pointerId) return;
    yaw+=(e.clientX-drag.x)*.008;pitch=Math.max(.15,Math.min(1.3,pitch+(e.clientY-drag.y)*.006));
    drag.x=e.clientX;drag.y=e.clientY;render();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event,()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();manual();yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;
    pitch=Math.max(.15,Math.min(1.3,pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));render();
  });
  $('rotate-left').onclick=()=>{manual();yaw-=.25;render();};
  $('rotate-right').onclick=()=>{manual();yaw+=.25;render();};
  $('scene-reset').onclick=()=>{manual();yaw=-.35;pitch=.55;render();};
  $('scene-follow').onclick = () => {
    follow = true; $('scene-follow').setAttribute('aria-pressed', 'true');
    if (!globalThis.compassState?.active) $('sensor').click();
    render();
  };
  new ResizeObserver(render).observe(canvas);
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  globalThis.renderSolarScene=render;
})();
