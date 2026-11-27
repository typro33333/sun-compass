(() => {
  if (!globalThis.isSolarCalculator) return;
  const canvas = $('panel-canvas'), ctx = canvas.getContext('2d'), G = PanelGeometry;
  let yaw = Math.PI-.6, pitch = .55, orbitKey = '', orbit = [], follow = false, previousHouse = 0, zoom = 1;
  const controls = { watts:$('energy-watts'), width:$('house-width'), length:$('house-length'), count:$('panel-count'), roof:$('roof-type'), bearing:$('panel-bearing'), tilt:$('panel-slope'), floors:$('panel-floors'), x:$('panel-x'), z:$('panel-z'), house:$('house-bearing'), left:$('neighbor-left'), right:$('neighbor-right'), leftRoof:$('neighbor-left-roof'), rightRoof:$('neighbor-right-roof') };
  let lastEnergyScene='',capacityKey='',capacity=0;
  let placedPanels=null, initialized=false, lastSaved='', recommendationKey='';
  let positionCacheKey='',positionCache=null,sceneCacheKey='',sceneCache=null,lightingCache=null,normalizationKey='';
  const rasterWorkspace={};
  let pendingFrame=false;
  function scheduleRender() {
    if(!globalThis.requestAnimationFrame){render();return;}
    if(pendingFrame)return;
    pendingFrame=true;
    requestAnimationFrame(()=>{pendingFrame=false;render();});
  }
  let savedState=null;
  try {savedState=PlannerState.load(localStorage);} catch {}
  function snapshot() {
    return {version:1,config:configuration(),positions:getPositions(Number(controls.count.value)),view:{yaw,pitch,zoom},
      location:locationReady?{lat,lon,offset}:savedState?.location,
      energy:{kwp:Number($('energy-kwp').value),loss:0,reserve:$('energy-reserve').checked,system:globalThis.getStoredEnergySystem()}};
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
    if(!colors.has(color)) {if(colors.size>=128)colors.clear();colorContext.clearRect(0,0,1,1);colorContext.fillStyle=color;colorContext.fillRect(0,0,1,1);colors.set(color,[...colorContext.getImageData(0,0,1,1).data]);}
    return colors.get(color);
  }
  function getPositions(count,automatic=false) {
    const c=configuration();
    const key=JSON.stringify([count,automatic,c.bearing-c.house,c.length,c.width,c.watts,placedPanels]);
    if(key===positionCacheKey)return positionCache;
    const module=G.moduleFor(c.watts);
    const positions=!automatic && placedPanels && placedPanels.length===count && G.validPlacement(placedPanels,c.bearing-c.house,c.length,c.width,module)
      ? placedPanels : G.packPanels(count,c.bearing-c.house,c.length,c.width,module);
    positionCacheKey=key;positionCache=positions;return positions;
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
  function sharedScene() {
    const c=configuration(),positions=getPositions(c.count),key=JSON.stringify([c,positions]);
    if(key!==sceneCacheKey){sceneCache=G.scene(c,positions);sceneCacheKey=key;}
    return sceneCache;
  }
  globalThis.getEnergyScene=sharedScene;
  function normalizePanels() {
    const key=JSON.stringify([configuration(),placedPanels,$('energy-count').value,$('energy-kwp').value]);
    if(key===normalizationKey)return;
    const c=configuration(),module=G.moduleFor(c.watts);
    if(!module)return;
    if(!placedPanels || placedPanels.length!==c.count || !G.validPlacement(placedPanels,c.bearing-c.house,c.length,c.width,module)) {
      placedPanels=G.packPanels(c.count,c.bearing-c.house,c.length,c.width,module);
      controls.count.value=placedPanels.length;controls.x.value=controls.z.value=0;
    }
    const count=placedPanels.length,kwp=count*c.watts/1000;
    const nextCapacityKey=JSON.stringify([c.width,c.length,c.bearing-c.house,c.watts]);
    if(nextCapacityKey!==capacityKey){capacityKey=nextCapacityKey;capacity=G.packPanels(30,c.bearing-c.house,c.length,c.width,module).length;}
    $('energy-count').max=controls.count.max=30;
    if(initialized && Math.abs(Number($('energy-kwp').value)-kwp)>1e-9)globalThis.invalidateSolarPrediction?.();
    $('energy-count').value=count;$('energy-kwp').value=kwp.toFixed(3);
    $('module-description').textContent=`${count} tấm × ${c.watts} W = ${kwp.toFixed(3)} kWp · Dài ${Math.round(module.length*1000)} × rộng ${Math.round(module.width*1000)} mm · ${module.model}`;
    $('module-source').href=module.source;
    $('roof-capacity').textContent=`Đã đặt ${count} tấm · Bố trí tự động tìm được chỗ cho ${capacity} tấm trên mái ${c.width} × ${c.length} m. Có thể sắp xếp thủ công; chỉ nhận vị trí không chồng lấn, không vượt mái, tối đa 30 tấm.`;
    if(count<c.count) {
      const reason=`Không xếp được ${c.count} tấm: bố trí tự động hiện tìm được ${count} tấm trên mái ${c.width} × ${c.length} m, với tấm ${module.length} × ${module.width} m và hướng tương đối ${Math.round(c.bearing-c.house)}°. Đã giữ ${count} tấm để không chồng lấn hoặc vượt mái. Hãy tăng chiều rộng/dài nhà, đổi hướng hoặc sắp xếp thủ công.`;
      $('panel-advice').textContent=reason;
      if(initialized)globalThis.showSolarNotice?.(reason,true);
    }
    normalizationKey=JSON.stringify([configuration(),placedPanels,$('energy-count').value,$('energy-kwp').value]);
  }
  $('energy-count').addEventListener('change',()=>{
    const n=Number($('energy-count').value);
    if(!Number.isInteger(n)||n<1||n>30){$('energy-count').value=controls.count.value;return;}
    controls.count.value=n;normalizePanels();labels();render();globalThis.invalidateSolarPrediction?.();
  });
  function labels() {
    normalizePanels();
    const c = configuration();
    $('house-width-label').textContent=`${c.width} m`;
    $('house-length-label').textContent=`${c.length} m`;
    $('panel-count-label').textContent=`${c.count} tấm`;
    $('panel-add').disabled=c.count>=30;
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
    if (!['energy-azimuth','energy-tilt'].every(id=>$(id).value!=='' && $(id).checkValidity())) return;
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
    if (key==='watts') globalThis.invalidateSolarPrediction?.();
    if (key==='bearing' || key==='tilt') {
      $(key==='bearing' ? 'energy-azimuth' : 'energy-tilt').value = node.value;
      globalThis.invalidateSolarPrediction?.();
      $('energy-result').hidden = true;
      $('energy-status').textContent = 'Thông số tấm pin đã đổi. Bấm tính để cập nhật sản lượng.';
      $('energy-preview').hidden = true;
    }
    if(['count','bearing','length','width','watts'].includes(key) && placedPanels) {
      if(placedPanels.length!==Number(controls.count.value) || !G.validPlacement(placedPanels,configuration().bearing-configuration().house,configuration().length,configuration().width,G.moduleFor(configuration().watts))) {placedPanels=null;$('panel-advice').textContent='Đã xếp lại pin để phù hợp kích thước hoặc hướng mới. Mở Sắp xếp từng tấm pin để chỉnh.';}
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
  let pendingPlacement=null,placementRun=0;
  const previewDialog=$('placement-preview');
  const placementKey=()=>simulationKey()+JSON.stringify(['inverter-ac','inverter-pv','inverter-efficiency','mppt-count','mppt-min','mppt-max','mppt-current','mppt-operating','loss-temperature','loss-wiring','loss-soiling','loss-other','placement-poa','placement-gap'].map(id=>$(id).value));
  function planSvg(c,positions) {
    const polygons=G.individualPanels(positions.map(p=>({...p,x:p.x+c.x,z:p.z-c.z})),c.bearing-c.house,0,0,G.moduleFor(c.watts));
    return `<svg viewBox="${-c.width/2-.3} ${-c.length/2-.3} ${c.width+.6} ${c.length+.6}" role="img" aria-label="Bố trí trên mái"><rect x="${-c.width/2}" y="${-c.length/2}" width="${c.width}" height="${c.length}" fill="#dde8df"/>${polygons.map((p,i)=>`<polygon points="${p.map(v=>v[0]+','+v[2]).join(' ')}" fill="#235878" stroke="#99c9d2" stroke-width=".03"/><text x="${positions[i].x+c.x}" y="${positions[i].z-c.z}" text-anchor="middle" fill="white" font-size=".28">${i+1}</text>`).join('')}</svg>`;
  }
  function previewPlacement(c,positions,message,apply) {
    pendingPlacement={key:placementKey(),apply};
    $('placement-manual').innerHTML=planSvg(configuration(),getPositions(configuration().count));
    $('placement-proposed').innerHTML=planSvg(c,positions);
    $('placement-comparison').hidden=false;
    $('placement-preview-status').textContent=message;
    $('placement-confirm').disabled=false;
    if(!previewDialog.open)previewDialog.showModal();
  }
  function cancelPlacement(){placementRun++;pendingPlacement=null;previewDialog.close();}
  $('placement-cancel').onclick=cancelPlacement;
  previewDialog.addEventListener('cancel',()=>{placementRun++;pendingPlacement=null;});
  $('placement-confirm').onclick=()=>{
    if(!pendingPlacement)return;
    if(pendingPlacement.key!==placementKey()){$('placement-preview-status').textContent='Cấu hình đã thay đổi. Hãy tạo đề xuất mới.';$('placement-confirm').disabled=true;pendingPlacement=null;return;}
    const apply=pendingPlacement.apply;pendingPlacement=null;previewDialog.close();apply();
  };
  $('panel-suggestion-annual').onclick=async()=>{
    const run=++placementRun,key=placementKey(),c=configuration(),positions=getPositions(c.count).map(p=>({...p}));
    $('panel-suggestion-dialog').close();pendingPlacement=null;
    $('placement-confirm').disabled=true;$('placement-comparison').hidden=true;
    $('placement-ranking').innerHTML='';$('placement-preview-status').textContent='Đang đánh giá kịch bản bức xạ năm…';previewDialog.showModal();
    try {
      if(!locationReady)throw Error('Cần vị trí trước khi đánh giá năm.');
      const annualPoa=Number($('placement-poa').value),spacing=Number($('placement-gap').value),year=Number($('date').value.slice(0,4));
      const climate=AnnualPlacement.scenario({year,location:{lat,lon,offset},config:c,annualPoa});
      const iterator=AnnualPlacement.propose({config:c,positions,system:globalThis.readEnergySystem(),scenario:climate,spacing,step:1});
      let next;
      do {
        next=iterator.next();
        if(!next.done){$('placement-preview-status').textContent=`Đang xếp hạng ${next.value.completed}/${next.value.total} vị trí…`;await new Promise(resolve=>setTimeout(resolve,0));}
        if(run!==placementRun)return;
        if(key!==placementKey())throw Error('Cấu hình đã thay đổi. Hãy tạo đề xuất mới.');
      }while(!next.done);
      const result=next.value,fmt=v=>v.toFixed(1);
      previewPlacement(result.config,result.positions,`Kịch bản ${year}: ${annualPoa} kWh/m²/năm trên mặt pin, không phải dự báo thời tiết năm. Hiện tại: AC ${fmt(result.manual.acKwh)} kWh/năm, tổn thất bóng che ${fmt(result.manual.shadeLossKwh)} kWh DC. Đề xuất: AC ${fmt(result.proposed.acKwh)} kWh/năm, tổn thất bóng che ${fmt(result.proposed.shadeLossKwh)} kWh DC. Chênh lệch AC ${fmt(result.proposed.acKwh-result.manual.acKwh)} kWh/năm. Khoảng cách tối thiểu ${spacing} m. Giữ hướng/nghiêng hiện tại; 12 ngày đại diện, lưới ứng viên 1 m.`,()=>{
        placedPanels=result.positions.map(p=>({...p}));controls.x.value=controls.z.value=0;manual();labels();render();globalThis.invalidateSolarPrediction?.();
        $('panel-advice').textContent='Đã áp dụng bố trí từ kịch bản năm sau khi xác nhận. Bấm tính để cập nhật dự báo hôm nay.';
      });
      $('placement-ranking').innerHTML=`<summary>Xếp hạng vị trí (10 vị trí đầu / ${result.ranking.length})</summary><p>kWh DC/năm của một tấm trước MPPT/inverter. % là năng lượng mất do bóng che / DC ban đầu, không phải diện tích che tức thời.</p><table><thead><tr><th>Vị trí x, z (m)</th><th>DC kWh/năm</th><th>Mất do che</th></tr></thead><tbody>${result.ranking.slice(0,10).map(r=>`<tr><td>${r.position.x.toFixed(1)}, ${r.position.z.toFixed(1)} · ${r.position.rotation||0}°</td><td>${fmt(r.dcKwh)}</td><td>${fmt(r.shadeFraction*100)}%</td></tr>`).join('')}</tbody></table>`;
    }catch(error){if(run===placementRun)$('placement-preview-status').textContent=error.message;}
  };
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
      $('placement-ranking').innerHTML='';
      previewPlacement({...c,bearing:best.bearing,tilt:best.tilt},best.positions||positions,`Đề xuất ${annual?'năm '+year:'trong ngày'}: hướng ${best.bearing}°, nghiêng ${best.tilt}°. Chỉ số đón nắng ${best.baseline.toFixed(3)} → ${best.score.toFixed(3)} (điểm hình học, không phải kWh). Bố trí hiện tại chưa thay đổi.`,()=>{
      globalThis.invalidateSolarPrediction?.();
      placedPanels=best.positions || positions;
      controls.bearing.value = $('energy-azimuth').value = best.bearing;
      controls.tilt.value = $('energy-tilt').value = best.tilt;
      $('energy-result').hidden=true; $('energy-preview').hidden=true;
      $('energy-status').textContent='Đã áp dụng gợi ý theo mô phỏng. Bấm tính để cập nhật sản lượng.';
      const gain=best.baseline>0?`Chỉ số đón nắng hình học tăng khoảng ${Math.max(0,(best.score/best.baseline-1)*100).toFixed(1)}% so với cấu hình trước. `:'';
      $('panel-advice').textContent=`Đã áp dụng gợi ý ${annual?'năm '+year:'ngày '+$('date').value}: hướng ${best.bearing}° từ Bắc, nghiêng ${best.tilt}°. ${layout?'Đã tự xếp từng tấm trên mái, so sánh bố trí gom cụm và rời rạc để tránh bóng che; áp dụng phương án tốt nhất tìm được.':'Giữ vị trí từng tấm;'} đã xét hướng nhà và bóng che nhà bên, gồm mái Thái. ${gain}${annual?'Lấy mẫu 12 ngày giữa tháng, gia quyền theo số ngày từng tháng; ':''}Bước thời gian 30 phút, tìm góc thô rồi tinh chỉnh 5°, kiểm tra 36 ô/tấm. Đây là ước tính hình học, chưa xét thời tiết hoặc bóng che giữa các tấm; không phải mức tăng kWh.`;
      const why=best.explanation;
      const improvement=best.baseline>0?`${Math.max(0,(best.score/best.baseline-1)*100).toFixed(1)}%`:'từ mức không đón được nắng trực tiếp';
      $('panel-explanation-text').textContent=`Với mái ${c.width} × ${c.length} m và ${c.count} tấm, phương án chọn hướng ${best.bearing}° và nghiêng ${best.tilt}° vì đạt chỉ số đón nắng tốt nhất trong các phương án đã thử ${annual?'qua 12 ngày đại diện cho các tháng trong năm':'trong ngày đang chọn'}. ${why.moved?`Đã chuyển ${why.moved} tấm để sử dụng các vùng mái thuận lợi hơn.`:'Giữ vị trí các tấm vì chưa tìm thấy cách dịch chuyển tốt hơn.'} ${why.neighbors?`Phần đón nắng bị nhà bên che (có gia quyền theo góc nắng) thay đổi từ ${(why.beforeShade*100).toFixed(1)}% thành ${(why.afterShade*100).toFixed(1)}%.`:'Mô hình hiện tại không có nhà bên gây bóng che; lựa chọn chủ yếu dựa vào hướng và độ nghiêng.'} ${best.score>best.baseline+1e-9?`Chỉ số đón nắng tăng ${improvement}.`:'Chưa tìm được phương án có chỉ số cao hơn cấu hình hiện tại.'} Các tấm được giữ trong mép mái và không chồng nhau. Đây là so sánh hình học, không phải mức tăng điện năng; chưa tính thời tiết, bóng giữa các tấm và lối đi bảo trì.`;
      $('panel-explanation').hidden=false;$('panel-explanation').open=true;
      recommendationKey=simulationKey();
      labels();render();
      });
    } catch {
      $('panel-advice').textContent='Không tính được gợi ý. Bố trí hiện tại được giữ nguyên; hãy thử lại.';
    } finally {
      $('panel-optimize').disabled=$('panel-optimize-year').disabled=$('panel-layout-year').disabled=false;
    }
  }
  let suggestionMode={annual:false,layout:false};
  const suggestionDialog=$('panel-suggestion-dialog');
  function chooseSuggestion(annual=false,layout=false) {
    suggestionMode={annual,layout};$('panel-suggestion-status').textContent='';suggestionDialog.showModal();
  }
  $('panel-suggestion-cancel').onclick=()=>suggestionDialog.close();
  $('panel-suggestion-auto').onclick=()=>{suggestionDialog.close();return optimize(suggestionMode.annual,suggestionMode.layout);};
  $('panel-suggestion-rows').onclick=()=>{
    const c=configuration();
    let system;
    try {system=globalThis.readEnergySystem();}catch(error){$('panel-suggestion-status').textContent=error.message;return;}
    const positions=G.packPanels(c.count,0,c.length,c.width,G.moduleFor(c.watts)).sort((a,b)=>a.z-b.z || a.x-b.x);
    if(positions.length!==c.count){$('panel-suggestion-status').textContent=`Chỉ xếp được ${positions.length}/${c.count} tấm thành hàng. Hãy tăng kích thước mái hoặc chọn gợi ý tối ưu.`;return;}
    // Keep the existing round-robin tracker assignment, but interleave spatial
    // groups so panels sharing a tracker occupy consecutive roof rows.
    const trackers=system.inverter.mpptCount,groups=[];
    let cursor=0;
    for(let m=0;m<trackers;m++) {
      const size=Math.floor(c.count/trackers)+(m<c.count%trackers?1:0);
      groups.push(positions.slice(cursor,cursor+size));cursor+=size;
    }
    const rowPositions=Array.from({length:c.count},(_,i)=>groups[i%trackers][Math.floor(i/trackers)]);
    suggestionDialog.close();$('placement-ranking').innerHTML='';
    previewPlacement({...c,bearing:c.house,x:0,z:0},rowPositions,`Xếp ${c.count} tấm thẳng theo ${trackers} nhóm MPPT. Đổi hướng pin thành ${c.house}°, giữ nghiêng ${c.tilt}°. Bấm Áp dụng nếu đồng ý.`,()=>{
    placedPanels=rowPositions;
    controls.x.value=controls.z.value=0;
    controls.bearing.value=$('energy-azimuth').value=c.house;
    suggestionDialog.close();manual();labels();render();
    globalThis.invalidateSolarPrediction?.();
    $('panel-explanation-text').textContent=`Đã xếp ${c.count} tấm thành hàng song song mép mái, hướng pin ${c.house}°, giữ độ nghiêng ${c.tilt}°. Các nhóm MPPT nằm liền nhau theo thứ tự hàng: ${groups.map((g,i)=>`MPPT ${i+1}: ${g.length} tấm`).join('; ')}. Cách xếp ưu tiên hàng thẳng và gom nhóm, không tối ưu sản lượng theo nắng. Nhóm này dùng trong mô hình dự báo, chưa phải thiết kế đấu chuỗi điện.`;
    $('panel-explanation').hidden=false;$('panel-explanation').open=true;
    $('panel-advice').textContent='Đã xếp hàng theo nhóm MPPT. Bấm tính sản lượng để cập nhật dự báo.';
    });
  };
  $('panel-optimize').onclick=()=>chooseSuggestion();
  $('panel-optimize-year').onclick=()=>chooseSuggestion(true);
  $('panel-layout-year').onclick=()=>chooseSuggestion(true,true);
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
    $('panel-explanation').hidden=true;
    stop();
    const {start,end}=bounds();
    if (!yearAdvancing) minute=Math.max(start,Math.min(end,minute));
    $('time').min=0;$('time').max=1439;
    $('play').disabled=!events?.daylight;
    document.querySelector('.time-ticks').textContent=events?.daylight===0 ? 'Không có ánh sáng ban ngày' : events?.daylight===1440 ? 'Mặt trời không lặn · 00:00 — 23:59' : `Mọc ${fmt(events.rise)} — Lặn ${fmt(events.set)}`;
    $('panel-advice').textContent='Gợi ý áp dụng cho ngày và vị trí đang chọn. Bấm gợi ý để tính lại.';
  };
  function render() {
    normalizePanels();
    const sceneKey=JSON.stringify([configuration(),getPositions(Number(controls.count.value)),lat,lon,offset]);
    if(initialized && lastEnergyScene && lastEnergyScene!==sceneKey)globalThis.invalidateSolarPrediction?.();
    lastEnergyScene=sceneKey;
    saveState();
    if(recommendationKey && recommendationKey!==simulationKey()) {
      recommendationKey='';
      $('panel-explanation').hidden=true;
      $('panel-advice').textContent='Mô phỏng đã thay đổi. Bấm gợi ý để tính lại theo cấu hình mới.';
    }
    if (!ctx || document.hidden) return;
    if(follow && globalThis.compassState?.ready) yaw=heading*R;
    $('panel-view-status').textContent=follow ? (globalThis.compassState?.ready ? '3D đang xoay theo la bàn thiết bị.' : 'Bấm Theo la bàn thiết bị để bật; xem trạng thái ở nhóm La bàn thiết bị.') : '3D đang xoay bằng tay. Hướng nhà không đổi khi xoay góc nhìn.';
    const c=configuration(), width=canvas.clientWidth, height=canvas.clientHeight;
    if (!width || !height) return;
    const dpr=Math.min(window.devicePixelRatio||1,globalThis.lowRenderQuality?1:2);
    if(canvas.width!==Math.round(width*dpr))canvas.width=Math.round(width*dpr);
    if(canvas.height!==Math.round(height*dpr))canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const dark=document.documentElement.dataset.theme==='dark';
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,dark?'#142c3e':'#e4eff2');sky.addColorStop(1,dark?'#253d38':'#f7f7ed');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const cosYaw=Math.cos(yaw),sinYaw=Math.sin(yaw),cosPitch=Math.cos(pitch),sinPitch=Math.sin(pitch);
    const scale=zoom*Math.min(width/86,height*.30/(34*Math.sin(pitch)+2),height*.55/32), buildingHeight=(c.floors+1)*3.2;
    function project([x,y,z]) {
      const rx=x*cosYaw+z*sinYaw, rz=-x*sinYaw+z*cosYaw;
      return [width/2+rx*scale,height*.65+(rz*sinPitch-y*cosPitch)*scale,rz*cosPitch+y*sinPitch];
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
    ['BẮC · 0°','ĐÔNG · 90°','NAM · 180°','TÂY · 270°'].forEach((text,i)=>{const p=G.vector(i*90,0).map(v=>v*34);const [x,y]=project(p);ctx.fillText(globalThis.solText?.(text)||text,x,y);});
    const rotate=p=>G.rotate(p,c.house);
    const shared=sharedScene();
    const {modules,neighbors,buildings,roofFaces}=shared,panel=modules[0];
    const buildingRoof=b=>shared.roofs[buildings.indexOf(b)];
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
    const lightSun=sun||{azimuth:0,altitude:-90};
    if(lightingCache?.scene!==shared || lightingCache.azimuth!==lightSun.azimuth || lightingCache.altitude!==lightSun.altitude)
      lightingCache={scene:shared,...lightSun,frame:G.renderCells(shared,lightSun)};
    const frame=lightingCache.frame;
    for(const cell of frame.cells) {
      if(!cell.lit)shaded++;
      faces.push({p:cell.p,color:cell.lit?`hsl(204 43% ${24+light*24}%)`:'#142c3b',stroke:'#81b1c2'});
    }
    for(const module of modules)for(const post of G.supports(module,buildingHeight,c.roof,c.house,c.width))faces.push({p:post,stroke:'#738887'});
    if(surface.width!==canvas.width)surface.width=canvas.width;
    if(surface.height!==canvas.height)surface.height=canvas.height;
    const pixels=DepthRenderer.rasterize(surface.width,surface.height,faces,p=>{const v=project(p);return [v[0]*dpr,v[1]*dpr,v[2]];},colorOf,rasterWorkspace);
    surfaceContext.putImageData(new ImageData(pixels,surface.width,surface.height),0,0);
    ctx.drawImage(surface,0,0,width,height);
    $('panel-shade').textContent=sun && sun.altitude>0 && light<=1e-12 ? 'Quay khỏi nắng' : sun && sun.altitude>0 ? `≈ ${Math.round(shaded/(36*c.count)*100)}%` : '—';
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
    scheduleRender();
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
    yaw+=(e.clientX-old.x)*.008;pitch=Math.max(.05,Math.min(Math.PI/2,pitch+(e.clientY-old.y)*.006));scheduleRender();
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
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else scheduleRender();});
  new ResizeObserver(scheduleRender).observe(canvas);
  new MutationObserver(scheduleRender).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  globalThis.renderPanelPlanner=scheduleRender;
  function applyProfile(state) {
    controls.watts.value=state.config.watts || 600;
    for(const [name,value] of Object.entries(state.config))controls[name].value=value;
    placedPanels=state.positions;
    previousHouse=Number(controls.house.value);
    $('energy-azimuth').value=controls.bearing.value;
    $('energy-tilt').value=controls.tilt.value;
    if(state.energy) {
      if(state.energy.system)globalThis.applyEnergySystem(state.energy.system);
      $('energy-reserve').checked=state.energy.system ? state.energy.reserve : false;
    }
    if(state.view)({yaw,pitch,zoom}=state.view);
  }
  if(savedState)applyProfile(savedState);
  globalThis.restorePlannerLocation=()=>{
    if(!savedState?.location)return false;
    ({lat,lon}=savedState.location);
    if (!automaticTimezone) offset=savedState.location.offset;
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
  normalizePanels();syncFromForm();initialized=true;labels();setZoom(zoom);
})();
