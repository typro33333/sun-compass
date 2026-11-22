(() => {
  if (!globalThis.isSolarCalculator) return;
  const canvas = $('panel-canvas'), ctx = canvas.getContext('2d'), G = PanelGeometry;
  let yaw = Math.PI-.6, pitch = .55, orbitKey = '', orbit = [], follow = false, previousHouse = 0, zoom = 1;
  const controls = { width:$('house-width'), length:$('house-length'), count:$('panel-count'), roof:$('roof-type'), bearing:$('panel-bearing'), tilt:$('panel-slope'), floors:$('panel-floors'), x:$('panel-x'), z:$('panel-z'), house:$('house-bearing'), left:$('neighbor-left'), right:$('neighbor-right'), leftRoof:$('neighbor-left-roof'), rightRoof:$('neighbor-right-roof') };
  let placedPanels=null, initialized=false, lastSaved='', recommendationKey='';
  let savedState=null;
  try {savedState=PlannerState.load(localStorage);} catch {}
  function snapshot() {
    return {version:1,config:configuration(),positions:getPositions(Number(controls.count.value)),view:{yaw,pitch,zoom},
      location:locationReady?{lat,lon,offset}:savedState?.location,
      energy:{kwp:Number($('energy-kwp').value),loss:Number($('energy-loss').value),reserve:$('energy-reserve').checked}};
  }
  function saveState() {
    if(!initialized)return;
    const state=snapshot();
    const serialized=JSON.stringify(state);
    if(serialized===lastSaved)return;
    let saved=false;
    try {saved=PlannerState.save(localStorage,state);} catch {}
    $('planner-save-status').hidden=saved;
    $('planner-save-status').textContent=saved?'':'Không lưu được mô phỏng trên trình duyệt này. Cấu hình hiện tại chỉ giữ đến khi đóng trang.';
    if(saved)lastSaved=serialized;
  }
  function simulationKey() {
    return JSON.stringify([globalThis.plannerLocationRevision,configuration(),getPositions(Number(controls.count.value)),$('date').value,lat,lon,offset]);
  }
  const surface=document.createElement('canvas'), surfaceContext=surface.getContext('2d');
  const colorCanvas=document.createElement('canvas');colorCanvas.width=colorCanvas.height=1;
  const colorContext=colorCanvas.getContext('2d'),colors=new Map();
  function colorOf(color) {
    if(!colors.has(color)) {colorContext.clearRect(0,0,1,1);colorContext.fillStyle=color;colorContext.fillRect(0,0,1,1);colors.set(color,[...colorContext.getImageData(0,0,1,1).data]);}
    return colors.get(color);
  }
  function getPositions(count,automatic=false) {
    const c=configuration();
    if(!automatic && placedPanels && placedPanels.length===count && G.validPlacement(placedPanels,c.bearing-c.house,c.length,c.width))return placedPanels;
    const layout=G.panelLayout(count,c.bearing-c.house,0,0,0,0,c.length,c.width);
    return layout.panels.map(p=>({x:(p[0][0]+p[2][0])/2,z:(p[0][2]+p[2][2])/2}));
  }
  const openLayout=createPanelLayoutEditor({getConfiguration:configuration,getPositions,apply:positions=>{
    placedPanels=positions.map(p=>({...p}));controls.count.value=positions.length;
    controls.x.value=controls.z.value=0;labels();render();
  }});
  $('panel-layout-open').onclick=openLayout;
  $('panel-arrange').onclick=openLayout;
  $('planner-setting-group').addEventListener('change',()=>{
    for(const id of ['planner-house','planner-neighbors','planner-panels','planner-device','planner-location']) {
      $(id).hidden=id!==$('planner-setting-group').value;
      $(id).open=true;
    }
  });
  $('planner-settings').addEventListener('keydown',e=>{
    if(e.key==='Escape') { $('planner-settings').open=false; }
  });
  function configuration() {
    return Object.fromEntries(Object.entries(controls).map(([k,node])=>[k,Number(node.value)]));
  }
  function labels() {
    const c = configuration();
    $('house-width-label').textContent=`${c.width} m`;
    $('house-length-label').textContent=`${c.length} m`;
    $('panel-count-label').textContent=`${c.count} tấm`;
    $('panel-add').disabled=c.count>=12;
    $('panel-remove').disabled=c.count<=1;
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
    if(['count','bearing','length','width'].includes(key) && placedPanels) {
      if(placedPanels.length!==Number(controls.count.value) || !G.validPlacement(placedPanels,configuration().bearing-configuration().house,configuration().length,configuration().width)) {placedPanels=null;$('panel-advice').textContent='Đã xếp lại pin để phù hợp kích thước hoặc hướng mới. Mở Sắp xếp từng tấm pin để chỉnh.';}
    }
    labels();render();
  });
  for (const id of ['energy-azimuth','energy-tilt']) $(id).addEventListener('input',syncFromForm);
  $('energy-form').addEventListener('input',()=>{
    $('energy-result').hidden = true;
    $('energy-preview').hidden = true;
    saveState();
  });
  $('energy-reserve').addEventListener('change',saveState);
  for(const side of ['left','right']) $('neighbor-'+side+'-add').onclick=()=>{controls[side].value=Math.min(5,Number(controls[side].value)+1);labels();render();};
  $('panel-add').onclick=()=>openLayout('add');
  $('panel-remove').onclick=()=>openLayout();
  function manual() {follow=false;$('panel-follow').setAttribute('aria-pressed','false');}
  $('panel-follow').onclick=()=>{follow=true;$('panel-follow').setAttribute('aria-pressed','true');if(!globalThis.compassState?.active)$('sensor').click();render();};
  $('floor-add').onclick = () => { controls.floors.value = Math.min(3,Number(controls.floors.value)+1); labels();render(); };
  async function optimize(annual = false, layout = false) {
    if (!locationReady) { $('panel-advice').textContent='Cần GPS hoặc nhập tọa độ trước khi gợi ý.';return; }
    const year=Number($('date').value.slice(0,4));
    if (!Number.isInteger(year) || year<1) return;
    if($('panel-optimize').disabled)return;
    const c=configuration(),positions=getPositions(c.count).map(p=>({...p})),key=simulationKey();
    const samples=[];
    if(annual) {
      for(let month=0;month<12;month++) {
        const date=`${year}-${String(month+1).padStart(2,'0')}-15`,weight=new Date(Date.UTC(year,month+1,0)).getUTCDate();
        for(let time=15;time<1440;time+=30)samples.push({...Solar.position(date,time,lat,lon,offset),weight});
      }
    } else for(let time=15;time<1440;time+=30)samples.push(Solar.position($('date').value,time,lat,lon,offset));
    $('panel-optimize').disabled=$('panel-optimize-year').disabled=$('panel-layout-year').disabled=true;
    recommendationKey='';
    $('panel-advice').textContent='Đang so sánh góc pin theo vị trí từng tấm, hướng nhà và bóng che nhà bên…';
    try {
      const search=G.recommendScene(samples,c,positions,layout);
      let result;
      do {
        for(let i=0;i<8;i++){result=search.next();if(result.done)break;}
        if(!result.done)await new Promise(resolve=>setTimeout(resolve,0));
        if(key!==simulationKey()) {$('panel-advice').textContent='Mô phỏng đã thay đổi. Bấm gợi ý để tính lại theo cấu hình mới.';return;}
      } while(!result.done);
      const best=result.value;
      if(best.score<=0) {$('panel-advice').textContent='Không tìm thấy ánh nắng trực tiếp đến pin trong khoảng mô phỏng này. Kiểm tra bóng che hoặc vị trí.';return;}
      globalThis.invalidateSolarPrediction?.();
      placedPanels=best.positions || positions;
      controls.bearing.value = $('energy-azimuth').value = best.bearing;
      controls.tilt.value = $('energy-tilt').value = best.tilt;
      $('energy-result').hidden=true; $('energy-preview').hidden=true;
      $('energy-status').textContent='Đã áp dụng gợi ý theo mô phỏng. Bấm tính để cập nhật sản lượng.';
      const gain=best.baseline>0?`Chỉ số đón nắng hình học tăng khoảng ${Math.max(0,(best.score/best.baseline-1)*100).toFixed(1)}% so với cấu hình trước. `:'';
      $('panel-advice').textContent=`Đã áp dụng gợi ý ${annual?'năm '+year:'ngày '+$('date').value}: hướng ${best.bearing}° từ Bắc, nghiêng ${best.tilt}°. ${layout?'Đã tự xếp từng tấm trên mái, so sánh bố trí gom cụm và rời rạc để tránh bóng che; áp dụng phương án tốt nhất tìm được.':'Giữ vị trí từng tấm;'} đã xét hướng nhà và bóng che nhà bên, gồm mái Thái. ${gain}${annual?'Lấy mẫu 12 ngày giữa tháng, gia quyền theo số ngày từng tháng; ':''}Bước thời gian 30 phút, tìm góc thô rồi tinh chỉnh 5°, kiểm tra 36 ô/tấm. Đây là ước tính hình học, chưa xét thời tiết hoặc bóng che giữa các tấm; không phải mức tăng kWh.`;
      recommendationKey=simulationKey();
      labels();render();
    } catch {
      $('panel-advice').textContent='Không tính được gợi ý. Bố trí hiện tại được giữ nguyên; hãy thử lại.';
    } finally {
      $('panel-optimize').disabled=$('panel-optimize-year').disabled=$('panel-layout-year').disabled=false;
    }
  }
  $('panel-optimize').onclick=()=>optimize();
  $('panel-optimize-year').onclick=()=>optimize(true);
  $('panel-layout-year').onclick=()=>optimize(true,true);
  // Manual coordinates keep the planner useful when GPS is denied.
  for (const id of ['lat','lon']) $(id).addEventListener('change',()=>{
    if (!['lat','lon'].every(key=>$(key).value!=='' && $(key).checkValidity())) return;
    lat=Number($('lat').value);lon=Number($('lon').value);locationReady=true;
    $('location-name').textContent='Tọa độ đã chọn';
    $('location-status').textContent='Đang sử dụng tọa độ nhập thủ công.';
    globalThis.setGPSStatus?.('saved','Đang dùng tọa độ nhập thủ công. Bấm để lấy GPS.');
    refresh();
  });
  function bounds() {
    return { start:events?.rise ?? 0, end:events?.set ?? 1439 };
  }
  $('play').onclick = () => {
    stopYear();
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
    if (!yearAdvancing) minute=Math.max(start,Math.min(end,minute));
    $('time').min=0;$('time').max=1439;
    $('play').disabled=!events?.daylight;
    document.querySelector('.time-ticks').textContent=events?.daylight===0 ? 'Không có ánh sáng ban ngày' : events?.daylight===1440 ? 'Mặt trời không lặn · 00:00 — 23:59' : `Mọc ${fmt(events.rise)} — Lặn ${fmt(events.set)}`;
    $('panel-advice').textContent='Gợi ý áp dụng cho ngày và vị trí đang chọn. Bấm gợi ý để tính lại.';
  };
  function render() {
    saveState();
    if(recommendationKey && recommendationKey!==simulationKey()) {
      recommendationKey='';
      $('panel-advice').textContent='Mô phỏng đã thay đổi. Bấm gợi ý để tính lại theo cấu hình mới.';
    }
    if (!ctx) return;
    if(follow && globalThis.compassState?.ready) yaw=heading*R;
    $('panel-view-status').textContent=follow ? (globalThis.compassState?.ready ? '3D đang xoay theo la bàn thiết bị.' : 'Bấm Theo la bàn thiết bị để bật; xem trạng thái ở nhóm La bàn thiết bị.') : '3D đang xoay bằng tay. Hướng nhà không đổi khi xoay góc nhìn.';
    const c=configuration(), width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const dpr=Math.min(window.devicePixelRatio||1,globalThis.lowRenderQuality?1:2);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const dark=document.documentElement.dataset.theme==='dark';
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,dark?'#142c3e':'#e4eff2');sky.addColorStop(1,dark?'#253d38':'#f7f7ed');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const scale=zoom*Math.min(width/86,height*.30/(34*Math.sin(pitch)+2),height*.55/32), buildingHeight=(c.floors+1)*3.2;
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
    const mountingHeight=buildingHeight+(c.roof ? 3 : 0);
    const positions=getPositions(c.count);
    const localModules=G.individualPanels(positions,c.bearing-c.house,c.tilt,mountingHeight);
    const points=localModules.flat();
    const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0]));
    const minZ=Math.min(...points.map(p=>p[2])),maxZ=Math.max(...points.map(p=>p[2]));
    controls.x.min=-c.width/2-minX;controls.x.max=c.width/2-maxX;
    controls.z.min=maxZ-c.length/2;controls.z.max=minZ+c.length/2;
    const shiftX=Math.max(Number(controls.x.min),Math.min(Number(controls.x.max),c.x));
    const shiftZ=-Math.max(Number(controls.z.min),Math.min(Number(controls.z.max),c.z));
    controls.x.value=shiftX;controls.z.value=-shiftZ;
    const modules=localModules.map(p=>p.map(([x,y,z])=>rotate([x+shiftX,y,z+shiftZ]))),panel=modules[0];
    const neighbors=G.neighbors(c.left,c.right,c.length,c.leftRoof,c.rightRoof,c.width);
    const buildings=[{x:0,z:0,width:c.width,depth:c.length,height:buildingHeight,main:true,thai:c.roof},...neighbors];
    const buildingRoof=b=>[[b.x-b.width/2,b.height,-b.depth/2],[b.x+b.width/2,b.height,-b.depth/2],[b.x+b.width/2,b.height,b.depth/2],[b.x-b.width/2,b.height,b.depth/2]].map(rotate);
    const roofFaces=buildings.filter(b=>b.thai).flatMap(b=>{
      const left=b.x-b.width/2-.5,right=b.x+b.width/2+.5,end=b.depth/2+.5,h=b.height;
      return [
        [[left,h,-end],[b.x,h+3,-end],[b.x,h+3,end],[left,h,end]],
        [[b.x,h+3,-end],[right,h,-end],[right,h,end],[b.x,h+3,end]],
        [[left,h,-end],[right,h,-end],[b.x,h+3,-end]],
        [[left,h,end],[b.x,h+3,end],[right,h,end]]
      ].map(face=>face.map(rotate));
    });
    let sun=null;
    if(locationReady) {
      sun=Solar.position($('date').value,minute,lat,lon,offset);

      const key=`${$('date').value},${lat},${lon},${offset}`;
      if(key!==orbitKey){orbitKey=key;orbit=Array.from({length:145},(_,i)=>Solar.position($('date').value,i*10,lat,lon,offset)).filter(s=>s.altitude>=0).map(s=>G.vector(s.azimuth,s.altitude).map(v=>v*30));}

      if(sun.altitude>0) {
        ctx.beginPath();
        for (const face of [...buildings.map(buildingRoof), ...roofFaces, ...modules]) {
          const points=G.shadow(face,sun).map(project);
          // Consistent winding keeps overlapping silhouettes filled as a union.
          const area=points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
          if(area<0)points.reverse();
          points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
        }
        ctx.fillStyle=dark?'#071911b3':'#1a302b80';ctx.fill();
      }
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

    roofFaces.forEach((p,i)=>faces.push({p,color:['#aa654c','#cc8760','#d9b89b','#d9b89b'][i%4]}));
    // Two door leaves on the north-facing wall identify the actual house bearing.
    for(const [left,right] of [[-1.1,0],[0,1.1]]) {
      faces.push({p:[[left,.05,-c.length/2-.025],[right,.05,-c.length/2-.025],[right,2.55,-c.length/2-.025],[left,2.55,-c.length/2-.025]].map(rotate),color:'#805234',stroke:'#d2b486'});
      const handle=left===0?.14:-.14;
      faces.push({p:[[handle,1.1,-c.length/2-.05],[handle,1.5,-c.length/2-.05]].map(rotate),stroke:'#f5dd94'});
    }
    faces.forEach(face=>{face.stroke ||= '#879b96';});
    let shaded=0;
    const light=sun?G.incidence(sun,c.bearing,c.tilt):0;
    const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
    for(const module of modules) {
      const at=(u,v)=>mix(mix(module[0],module[1],u),mix(module[3],module[2],u),v);
      // Each photovoltaic cell participates in the same depth buffer as the roof.
      for(let row=0;row<6;row++)for(let col=0;col<6;col++) {
        const blocked=sun && G.blocked(at((col+.5)/6,(row+.5)/6),sun,neighbors,c.house);
        if(blocked)shaded++;
        faces.push({p:[at(col/6,row/6),at((col+1)/6,row/6),at((col+1)/6,(row+1)/6),at(col/6,(row+1)/6)],color:blocked?'#142c3b':`hsl(204 43% ${24+light*24}%)`,stroke:'#81b1c2'});
      }
      for(const post of G.supports(module,buildingHeight,c.roof,c.house,c.width))faces.push({p:post,stroke:'#738887'});
    }
    surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);
    const pixels=DepthRenderer.rasterize(surface.width,surface.height,faces,p=>{const v=project(p);return [v[0]*dpr,v[1]*dpr,v[2]];},colorOf);
    surfaceContext.putImageData(new ImageData(pixels,surface.width,surface.height),0,0);
    ctx.drawImage(surface,0,0,width,height);
    $('panel-shade').textContent=sun && sun.altitude>0 ? `≈ ${Math.round(shaded/(36*c.count)*100)}%` : '—';
    if(sun)$('panel-incidence').textContent=`${Math.round(light*(1-shaded/(36*c.count))*100)}%`;
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
  const pointers=new Map();
  function setZoom(value) {
    zoom=Math.max(.5,Math.min(4,value));
    $('panel-zoom-label').textContent=`${Math.round(zoom*100)}%`;
    $('panel-zoom-out').disabled=zoom<=.5;
    $('panel-zoom-in').disabled=zoom>=4;
    render();
  }
  const distance=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' && ![0,2].includes(e.button))return;
    manual();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    const old=pointers.get(e.pointerId);if(!old)return;
    const before=pointers.size===2?distance():0;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){if(before>0)setZoom(zoom*distance()/before);return;}
    yaw+=(e.clientX-old.x)*.008;pitch=Math.max(.05,Math.min(Math.PI/2,pitch+(e.clientY-old.y)*.006));render();
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*Math.exp(-Math.max(-100,Math.min(100,e.deltaY))*.003));},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(['+','=','-'].includes(e.key)){e.preventDefault();setZoom(zoom*(e.key==='-'?1/1.2:1.2));return;}
    if(!e.key.startsWith('Arrow'))return;e.preventDefault();manual();yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;pitch=Math.max(.05,Math.min(Math.PI/2,pitch+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0)));render();
  });
  $('panel-zoom-in').onclick=()=>setZoom(zoom*1.2);
  $('panel-zoom-out').onclick=()=>setZoom(zoom/1.2);
  $('panel-view-front').onclick=()=>{manual();yaw=Math.PI+Number(controls.house.value)*R;pitch=.15;render();};
  manual();
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new ResizeObserver(render).observe(canvas);
  new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  globalThis.renderPanelPlanner=render;
  function applyProfile(state) {
    for(const [name,value] of Object.entries(state.config))controls[name].value=value;
    placedPanels=state.positions;
    previousHouse=Number(controls.house.value);
    $('energy-azimuth').value=controls.bearing.value;
    $('energy-tilt').value=controls.tilt.value;
    if(state.energy) {
      $('energy-kwp').value=state.energy.kwp;$('energy-loss').value=state.energy.loss;
      $('energy-reserve').checked=state.energy.reserve;
    }
    if(state.view)({yaw,pitch,zoom}=state.view);
  }
  if(savedState)applyProfile(savedState);
  globalThis.restorePlannerLocation=()=>{
    if(!savedState?.location)return false;
    ({lat,lon,offset}=savedState.location);
    $('lat').value=lat;$('lon').value=lon;
    setCurrentTime();locationReady=true;
    $('location-name').textContent='Vị trí mô phỏng đã lưu';
    $('location-status').textContent='Đã khôi phục vị trí và cấu hình mô phỏng trên trình duyệt này.';
    globalThis.setGPSStatus?.('saved','Đang dùng vị trí đã lưu. Bấm để lấy GPS hiện tại.');
    $('feedback').textContent='Có thể chỉnh tọa độ trong cài đặt hoặc dùng GPS để cập nhật vị trí.';
    $('location-retry').hidden=false;$('location-retry').textContent='Dùng vị trí hiện tại';
    refresh();return true;
  };
  $('planner-export').onclick=()=>{
    const status=$('planner-backup-status');
    try {
      const json=PlannerState.exportBackup(snapshot());
      const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
      const link=document.createElement('a');
      link.href=url;link.download=`sol-profile-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;
      document.body.append(link);
      try {link.click();status.textContent='Đã tạo file sao lưu profile. Bạn có thể dùng file này để khôi phục trên thiết bị khác.';}
      finally {link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    } catch(error) {status.textContent='Không tạo được bản sao lưu. '+error.message;}
  };
  $('planner-import').onclick=()=>$('planner-import-file').click();
  $('planner-import-file').addEventListener('change',async()=>{
    const input=$('planner-import-file'),file=input.files?.[0],status=$('planner-backup-status');
    if(!file)return;
    $('planner-import').disabled=input.disabled=true;
    status.textContent='Đang đọc profile…';
    try {
      if(file.size>PlannerState.maxBackupBytes)throw Error('File sao lưu vượt giới hạn 64 KB.');
      const state=PlannerState.importBackup(await file.text());
      stop();globalThis.invalidateSolarPrediction?.();
      globalThis.plannerLocationRevision=(globalThis.plannerLocationRevision||0)+1;
      recommendationKey='';lastSaved='';savedState=state;
      applyProfile(state);manual();
      $('energy-result').hidden=$('energy-preview').hidden=true;
      $('energy-status').textContent='Đã khôi phục profile. Bấm tính để cập nhật sản lượng.';
      $('panel-advice').textContent='Đã khôi phục mô phỏng. Bấm gợi ý để tính góc pin cho profile này.';
      globalThis.restorePlannerLocation();
      labels();setZoom(zoom);
      status.textContent='Đã khôi phục profile và cập nhật mô hình 3D. '+(state.location?'Đã áp dụng vị trí trong file.':'File không có vị trí; giữ vị trí đang dùng.');
    } catch(error) {status.textContent='Không khôi phục được profile. '+error.message;}
    finally {input.value='';$('planner-import').disabled=input.disabled=false;}
  });
  syncFromForm();initialized=true;labels();setZoom(zoom);
})();
