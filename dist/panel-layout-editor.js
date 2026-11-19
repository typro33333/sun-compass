(function(root) {
  root.createPanelLayoutEditor=function({getConfiguration,getPositions,apply}) {
    const dialog=document.createElement('dialog');
    dialog.id='panel-layout-dialog';
    dialog.setAttribute('aria-labelledby','panel-layout-title');
    dialog.innerHTML=`<form method="dialog"><div class="energy-heading"><h2 id="panel-layout-title">Sắp xếp tấm pin</h2><button aria-label="Đóng bố trí">✕</button></div></form>
      <p>Kéo từng tấm trên mặt phẳng mái. Chọn tấm rồi dùng phím mũi tên để dịch 10 cm. Pin không được chồng nhau hoặc vượt mép mái.</p>
      <div class="layout-actions"><button type="button" id="layout-add">Thêm tấm</button><button type="button" id="layout-remove">Xóa tấm đã chọn</button><button type="button" id="layout-auto">Xếp tự động</button></div>
      <svg id="layout-plane" role="group" aria-label="Mặt phẳng sắp xếp pin, cửa chính ở phía trên"></svg>
      <p id="layout-status" role="status"></p><div class="layout-actions"><button type="button" id="layout-apply" class="primary">Áp dụng lên 3D</button><button type="button" id="layout-cancel">Hủy</button></div>`;
    document.body.append(dialog);
    const find=id=>dialog.querySelector('#'+id),svg=find('layout-plane');
    let draft=[],selected=0,c,drag=null;
    const bearing=()=>c.bearing-c.house;
    function message(text){find('layout-status').textContent=text;}
    function draw(focus=false) {
      const polygons=PanelGeometry.individualPanels(draft,bearing(),0,0);
      svg.setAttribute('viewBox',`-4.4 ${-c.length/2-.8} 8.8 ${c.length+1.2}`);
      svg.innerHTML=`<rect x="-4" y="${-c.length/2}" width="8" height="${c.length}" fill="var(--layout-roof, #e1ebe3)" stroke="#718b7b" stroke-width=".04"/><text x="0" y="${-c.length/2-.25}" text-anchor="middle" font-size=".3" fill="#466456">CỬA CHÍNH · HƯỚNG NHÀ</text>`;
      polygons.forEach((p,i)=>{
        const node=document.createElementNS('http://www.w3.org/2000/svg','polygon');
        node.setAttribute('points',p.map(v=>`${v[0]},${v[2]}`).join(' '));
        node.setAttribute('fill',i===selected?'#2689a6':'#214d70');node.setAttribute('stroke',i===selected?'#f2ae37':'#b9dce7');node.setAttribute('stroke-width','.06');
        node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`Tấm pin ${i+1}`);node.setAttribute('aria-pressed',String(i===selected));node.dataset.index=i;svg.append(node);
      });
      find('layout-add').disabled=draft.length>=12;find('layout-remove').disabled=draft.length<=1;
      if(focus)svg.querySelector(`[data-index="${selected}"]`)?.focus();
    }
    function move(x,z) {
      const next=draft.map((p,i)=>i===selected?{x,z}:p);
      if(!PanelGeometry.validPlacement(next,bearing(),c.length)){message('Vị trí này chồng lên tấm khác hoặc vượt mép mái.');return;}
      draft=next;draw();message(`${draft.length} tấm · Tấm ${selected+1}: ngang ${x.toFixed(1)} m, dọc ${z.toFixed(1)} m.`);
    }
    const point=e=>new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    svg.addEventListener('pointerdown',e=>{
      const index=e.target.dataset.index;if(index===undefined)return;
      e.preventDefault();selected=Number(index);const p=point(e);drag={id:e.pointerId,x:p.x-draft[selected].x,z:p.y-draft[selected].z};svg.setPointerCapture(e.pointerId);draw(true);
    });
    svg.addEventListener('pointermove',e=>{if(!drag || drag.id!==e.pointerId)return;const p=point(e);move(Math.round((p.x-drag.x)*10)/10,Math.round((p.y-drag.z)*10)/10);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,()=>{if(drag){drag=null;draw(true);}});
    svg.addEventListener('keydown',e=>{
      if(e.target.dataset.index===undefined)return;selected=Number(e.target.dataset.index);
      if(e.key===' ' || e.key==='Enter'){e.preventDefault();draw(true);return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const p=draft[selected];move(p.x+(e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0),p.z+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0));draw(true);
    });
    find('layout-add').onclick=()=>{
      if(draft.length>=12)return;
      for(let z=-c.length/2+1;z<=c.length/2;z+=.2)for(let x=-3.4;x<=4;x+=.2) {
        const next=[...draft,{x,z}];if(PanelGeometry.validPlacement(next,bearing(),c.length)){draft=next;selected=draft.length-1;draw(true);message(`${draft.length} tấm`);return;}
      }
      message('Không còn vị trí trống. Hãy di chuyển các tấm hoặc xếp tự động.');
    };
    find('layout-remove').onclick=()=>{if(draft.length<=1)return;draft.splice(selected,1);selected=Math.min(selected,draft.length-1);draw(true);message(`${draft.length} tấm`);};
    find('layout-auto').onclick=()=>{draft=getPositions(draft.length,true).map(p=>({...p}));draw();message('Đã xếp tự động.');};
    find('layout-apply').onclick=()=>{if(!PanelGeometry.validPlacement(draft,bearing(),c.length)){message('Bố trí chưa hợp lệ.');return;}apply(draft);dialog.close();};
    find('layout-cancel').onclick=()=>dialog.close();
    return action=>{c=getConfiguration();draft=getPositions(c.count).map(p=>({...p}));selected=0;draw();message(`${draft.length} tấm · Mái rộng 8 m × dài ${c.length} m. Các tấm 1,18 × 1,96 m; 3D áp dụng thêm độ nghiêng đã chọn.`);dialog.showModal();if(action==='add')find('layout-add').click();};
  };
})(globalThis);
