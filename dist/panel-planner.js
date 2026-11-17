(() => {
  if (!globalThis.isSolarCalculator) return;
  const canvas = $('panel-canvas'), ctx = canvas.getContext('2d'), G = PanelGeometry;
  let yaw = -.6, pitch = .55, drag, orbitKey = '', orbit = [], follow = true, previousHouse = 0;
  const controls = { bearing:$('panel-bearing'), tilt:$('panel-slope'), floors:$('panel-floors'), x:$('panel-x'), z:$('panel-z'), house:$('house-bearing'), left:$('neighbor-left'), right:$('neighbor-right') };
  function configuration() {
    return Object.fromEntries(Object.entries(controls).map(([k,node])=>[k,Number(node.value)]));
  }
  function labels() {
    const c = configuration();
    $('floor-label').textContent = c.floors ? `${c.floors} lầu + tầng trệt` : 'Chỉ tầng trệt';
    $('floor-add').disabled = c.floors >= 3;
    $('panel-bearing-label').textContent = `${c.bearing}° · ${['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc'][Math.round(c.bearing/45)%8]}`;
    $('house-bearing-label').textContent = `${c.house}° · ${['Bắc','Đông Bắc','Đông','Đông Nam','Nam','Tây Nam','Tây','Tây Bắc'][Math.round(c.house/45)%8]}`;
    for(const side of ['left','right']) {
      $('neighbor-'+side+'-label').textContent=c[side] ? `${c[side]} tầng · ${(c[side]*3.2).toFixed(1)} m` : 'Không có';
      $('neighbor-'+side+'-add').disabled=c[side]>=5;
    }
    $('panel-slope-label').textContent = `${c.tilt}°`;
  }
  function syncFromForm() {
    if (!$('energy-form').checkValidity()) return;
    controls.bearing.value = $('energy-azimuth').value;
    controls.tilt.value = $('energy-tilt').value;
    labels(); render();
  }
  for (const [key,node] of Object.entries(controls)) node.addEventListener('input',()=>{
    if (key==='house') {
      const next=Number(node.value);
      controls.bearing.value=(Number(controls.bearing.value)+next-previousHouse+360)%360;
      previousHouse=next;
      $('energy-azimuth').value=controls.bearing.value;
      globalThis.invalidateSolarPrediction?.();
    }
    if (key==='bearing' || key==='tilt') {
      $(key==='bearing' ? 'energy-azimuth' : 'energy-tilt').value = node.value;
      globalThis.invalidateSolarPrediction?.();
      $('energy-result').hidden = true;
      $('energy-status').textContent = 'Thông số tấm pin đã đổi. Bấm tính để cập nhật sản lượng.';
      $('energy-preview').hidden = true;
    }
    labels();render();
  });
  for (const id of ['energy-azimuth','energy-tilt']) $(id).addEventListener('input',syncFromForm);
  $('energy-form').addEventListener('input',()=>{
    $('energy-result').hidden = true;
    $('energy-preview').hidden = true;
  });
  for(const side of ['left','right']) $('neighbor-'+side+'-add').onclick=()=>{controls[side].value=Math.min(5,Number(controls[side].value)+1);labels();render();};
  function manual() {follow=false;$('panel-follow').setAttribute('aria-pressed','false');}
  $('panel-follow').onclick=()=>{follow=true;$('panel-follow').setAttribute('aria-pressed','true');if(!globalThis.compassState?.active)$('sensor').click();render();};
  $('floor-add').onclick = () => { controls.floors.value = Math.min(3,Number(controls.floors.value)+1); labels();render(); };
  $('panel-optimize').onclick = () => {
    if (!locationReady) { $('panel-advice').textContent='Cần GPS hoặc nhập tọa độ trước khi gợi ý.';return; }
    const samples = Array.from({length:144},(_,i)=>Solar.position($('date').value,i*10,lat,lon,offset));
    const best = G.recommend(samples);
    if (best.score<=0) { $('panel-advice').textContent='Ngày này không có mặt trời trên đường chân trời tại vị trí đã chọn.';return; }
    globalThis.invalidateSolarPrediction?.();
    controls.bearing.value = $('energy-azimuth').value = best.bearing;
    controls.tilt.value = $('energy-tilt').value = best.tilt;
    $('energy-result').hidden=true; $('energy-preview').hidden=true;
    $('energy-status').textContent='Đã áp dụng gợi ý. Bấm tính để cập nhật sản lượng.';
    $('panel-advice').textContent=`Gợi ý ngày ${$('date').value}: hướng ${best.bearing}°, nghiêng ${best.tilt}° (bước tìm 5°). Đây là tối ưu hình học trong ngày, chưa phải tối ưu cả năm.`;
    labels();render();
  };
  // Manual coordinates keep the planner useful when GPS is denied.
  for (const id of ['lat','lon']) $(id).addEventListener('change',()=>{
    if (!['lat','lon'].every(key=>$(key).value!=='' && $(key).checkValidity())) return;
    lat=Number($('lat').value);lon=Number($('lon').value);locationReady=true;
    $('location-name').textContent='Tọa độ đã chọn';
    $('location-status').textContent='Đang sử dụng tọa độ nhập thủ công.';
    refresh();
  });
  function bounds() {
    return { start:events?.rise ?? 0, end:events?.set ?? 1439 };
  }
  $('play').onclick = () => {
    if (playing) {stop();return;}
    if (!locationReady || !events?.daylight) return;
    const {start,end}=bounds();
    if (minute<start || minute>=end) minute=start;
    $('play').textContent='Tạm dừng';$('play').dataset.playing='true';
    playing=setInterval(()=>{const b=bounds();minute=Math.min(b.end,minute+3);draw();if(minute>=b.end)stop();},100);
  };
  globalThis.onSolarDayChanged = () => {
    stop();
    const {start,end}=bounds();
    minute=Math.max(start,Math.min(end,minute));
    $('time').min=Math.floor(start);$('time').max=Math.ceil(end);
    $('play').disabled=!events?.daylight;
    document.querySelector('.time-ticks').textContent=events?.daylight===0 ? 'Không có ánh sáng ban ngày' : events?.daylight===1440 ? 'Mặt trời không lặn · 00:00 — 23:59' : `Mọc ${fmt(events.rise)} — Lặn ${fmt(events.set)}`;
    $('panel-advice').textContent='Gợi ý áp dụng cho ngày và vị trí đang chọn. Bấm gợi ý để tính lại.';
  };
  function render() {
    if (!ctx) return;
    if(follow && globalThis.compassState?.ready) yaw=heading*R;
    $('panel-view-status').textContent=follow ? (globalThis.compassState?.ready ? '3D đang xoay theo la bàn thiết bị.' : 'Bật la bàn thiết bị ở phần la bàn hoặc bấm Theo la bàn thiết bị.') : '3D đang xoay bằng tay. Hướng nhà không đổi khi xoay góc nhìn.';
    const c=configuration(), width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const dark=document.documentElement.dataset.theme==='dark';
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,dark?'#142c3e':'#e4eff2');sky.addColorStop(1,dark?'#253d38':'#f7f7ed');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const scale=Math.min(width/86,height*.30/(34*Math.sin(pitch)+2),height*.55/32), buildingHeight=(c.floors+1)*3.2;
    function project([x,y,z]) {
      const rx=x*Math.cos(yaw)+z*Math.sin(yaw), rz=-x*Math.sin(yaw)+z*Math.cos(yaw);
      return [width/2+rx*scale,height*.65+(rz*Math.sin(pitch)-y*Math.cos(pitch))*scale,rz*Math.cos(pitch)+y*Math.sin(pitch)];
    }
    function polygon(points,fill,stroke='#879b96',lineWidth=1) {
      ctx.beginPath();points.forEach((p,i)=>{const [x,y]=project(p);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
      if(fill){ctx.closePath();ctx.fillStyle=fill;ctx.fill();}ctx.strokeStyle=stroke;ctx.lineWidth=lineWidth;ctx.stroke();
    }
    polygon([[-18,0,-18],[18,0,-18],[18,0,18],[-18,0,18]],dark?'#30473f':'#e0e8d9');
    for(let v=-16;v<=16;v+=4){polygon([[v,0,-18],[v,0,18]],null,dark?'#41564d':'#c7d4c2');polygon([[-18,0,v],[18,0,v]],null,dark?'#41564d':'#c7d4c2');}
    ctx.font='600 12px system-ui';ctx.textAlign='center';ctx.fillStyle=dark?'#ecdfb8':'#405c4e';
    polygon(Array.from({length:73},(_,i)=>G.vector(i*5,0).map(v=>v*32)),null,dark?'#9daea1':'#8c9f8c');
    for(let a=0;a<360;a+=10)polygon([G.vector(a,0).map(v=>v*31),G.vector(a,0).map(v=>v*32)],null,'#8c9f8c',a%30===0?2:1);
    ['BẮC · 0°','ĐÔNG · 90°','NAM · 180°','TÂY · 270°'].forEach((text,i)=>{const p=G.vector(i*90,0).map(v=>v*34);const [x,y]=project(p);ctx.fillText(text,x,y);});
    const rotate=p=>G.rotate(p,c.house);
    const panel=G.corners(c.bearing-c.house,c.tilt,buildingHeight,c.x,-c.z).map(rotate);
    const neighbors=[{x:-11,z:0,width:8,depth:10,height:c.left*3.2},{x:11,z:0,width:8,depth:10,height:c.right*3.2}].filter(b=>b.height>0);
    const buildings=[{x:0,z:0,width:8,depth:10,height:buildingHeight,main:true},...neighbors];
    const buildingRoof=b=>[[b.x-4,b.height,-5],[b.x+4,b.height,-5],[b.x+4,b.height,5],[b.x-4,b.height,5]].map(rotate);
    let sun=null;
    if(locationReady) {
      sun=Solar.position($('date').value,minute,lat,lon,offset);

      const key=`${$('date').value},${lat},${lon},${offset}`;
      if(key!==orbitKey){orbitKey=key;orbit=Array.from({length:145},(_,i)=>Solar.position($('date').value,i*10,lat,lon,offset)).filter(s=>s.altitude>=0).map(s=>G.vector(s.azimuth,s.altitude).map(v=>v*30));}

      if(sun.altitude>1){buildings.forEach(b=>polygon(G.shadow(buildingRoof(b),sun),'#23382c22','transparent'));polygon(G.shadow(panel,sun),'#183c3640','transparent');}
      const incidence=G.incidence(sun,c.bearing,c.tilt);
      $('panel-incidence').textContent=`${Math.round(incidence*100)}%`;
      $('panel-angle').textContent=sun.altitude>0?`${G.angle(sun,c.bearing,c.tilt).toFixed(1)}°`:'Dưới chân trời';
    } else {
      $('panel-incidence').textContent='Chờ vị trí';$('panel-angle').textContent='—';
    }
    const faces=[];
    for(const building of buildings) {
      const top=buildingRoof(building);
      for(let floor=0;floor<Math.round(building.height/3.2);floor++) {
        const y0=floor*3.2,y1=y0+3.2;
        for(let i=0;i<4;i++) {
          const a=top[i],b=top[(i+1)%4];
          faces.push({p:[[a[0],y0,a[2]],[b[0],y0,b[2]],[b[0],y1,b[2]],[a[0],y1,a[2]]],color:building.main?['#c9d4cf','#b3c3bd','#e5e8dd','#d5ded4'][i]:['#c7b9ac','#b1a599','#ded0bf','#cec0af'][i]});
        }
      }
      faces.push({p:top,color:building.main?'#f1eee0':'#e4d4be'});
    }

    const front=[rotate([0,.1,0]),rotate([0,.1,-8])];
    polygon(front,null,'#b96a3c',3);
    const arrow=project(front[1]);ctx.fillStyle=dark?'#f4c6a0':'#8c452a';ctx.fillText('Mặt tiền',arrow[0],arrow[1]-8);
    function drawPanel() {
      panel.forEach(p=>polygon([[p[0],buildingHeight,p[2]],p],null,'#738887',2));
      const light=sun?G.incidence(sun,c.bearing,c.tilt):0;
      polygon(panel,`hsl(204 43% ${24+light*24}%)`,'#173e52',2);
      const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
      for(let i=1;i<6;i++)polygon([mix(panel[0],panel[1],i/6),mix(panel[3],panel[2],i/6)],null,'#b8dfeb88');
      for(let i=1;i<4;i++)polygon([mix(panel[0],panel[3],i/4),mix(panel[1],panel[2],i/4)],null,'#b8dfeb88');
      for(let i=1;i<3;i++)polygon([mix(panel[0],panel[1],i/3),mix(panel[3],panel[2],i/3)],null,'#d6e8eb',2);
      polygon([mix(panel[0],panel[3],.5),mix(panel[1],panel[2],.5)],null,'#d6e8eb',2);
      // Sample 36 cells on the panel plane; cast rays toward the physical sun.
      let shaded=0;
      for(let row=0;row<6;row++)for(let col=0;col<6;col++) {
        const at=(u,v)=>mix(mix(panel[0],panel[1],u),mix(panel[3],panel[2],u),v);
        if(sun && G.blocked(at((col+.5)/6,(row+.5)/6),sun,neighbors,c.house)) {
          shaded++;
          polygon([at(col/6,row/6),at((col+1)/6,row/6),at((col+1)/6,(row+1)/6),at(col/6,(row+1)/6)],'#102432aa','transparent');
        }
      }
      $('panel-shade').textContent=sun && sun.altitude>0 ? `≈ ${Math.round(shaded/36*100)}%` : '—';
    }
    faces.push({p:panel,draw:drawPanel});
    faces.sort((a,b)=>a.p.reduce((s,p)=>s+project(p)[2],0)/a.p.length-b.p.reduce((s,p)=>s+project(p)[2],0)/b.p.length);
    faces.forEach(f=>f.draw?f.draw():polygon(f.p,f.color));
    // Draw the enlarged celestial arc over geometry so tall houses cannot hide it.
    if(orbit.length && locationReady) {ctx.setLineDash([5,4]);polygon(orbit,null,'#bd8a23',2.5);ctx.setLineDash([]);}
    if(locationReady) {
      for(const [time,label,color] of [[events.rise,'Mọc','#397c58'],[events.set,'Lặn','#ba7247']]) {
        if(time===null)continue;
        const position=Solar.position($('date').value,time,lat,lon,offset);
        const [x,y]=project(G.vector(position.azimuth,0).map(v=>v*30));
        ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        ctx.fillText(`${globalThis.solText?.(label)||label} ${fmt(time)}`,x,y-10);
      }
    }
    const normal=G.vector(c.bearing,90-c.tilt),center=panel[0].map((v,i)=>(v+panel[2][i])/2);
    polygon([center,center.map((v,i)=>v+normal[i]*4)],null,'#efaa3d',2);
    if(sun && sun.altitude>=0){
      const s=G.vector(sun.azimuth,sun.altitude).map(v=>v*30);
      ctx.setLineDash([5,6]);polygon([s,center],null,'#dca63e',2);ctx.setLineDash([]);
      const [x,y]=project(s);ctx.beginPath();ctx.arc(x,y,12,0,Math.PI*2);ctx.fillStyle='#efbd55';ctx.fill();
      ctx.beginPath();ctx.arc(x,y,21,0,Math.PI*2);ctx.fillStyle='#efbd5533';ctx.fill();
    }
  }
  if(!ctx) $('panel-advice').textContent='Trình duyệt không hỗ trợ canvas. Bạn vẫn có thể chỉnh thông số và tính sản lượng.';
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;manual();drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw+=(e.clientX-drag.x)*.008;pitch=Math.max(.2,Math.min(1.2,pitch+(e.clientY-drag.y)*.006));drag={id:e.pointerId,x:e.clientX,y:e.clientY};render();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
  canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();manual();yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;pitch=Math.max(.2,Math.min(1.2,pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));render();});
  $('panel-reset').onclick=()=>{manual();yaw=-.6;pitch=.55;render();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new ResizeObserver(render).observe(canvas);
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  globalThis.renderPanelPlanner=render;
  syncFromForm();labels();render();
})();
