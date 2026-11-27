(function(root) {
  root.createPanelLayoutEditor=function({getConfiguration,getPositions,apply}) {
    const dialog=document.createElement('dialog');
    dialog.id='panel-layout-dialog';
    dialog.setAttribute('aria-labelledby','panel-layout-title');
    dialog.innerHTML=`<form method="dialog"><div class="energy-heading"><h2 id="panel-layout-title">Sắp xếp tấm pin</h2><button aria-label="Đóng bố trí">✕</button></div></form>
      <div class="layout-actions layout-toolbar"><button type="button" id="layout-add">+ Tấm pin</button><button type="button" id="layout-rotate">Xoay 90°</button><button type="button" id="layout-auto">Xếp tự động</button><button type="button" id="layout-remove">Xóa tấm</button><button type="button" id="layout-delete-object">Xóa vật cản</button></div>
      <button type="button" id="layout-shape" aria-pressed="false">Chỉnh góc mái</button>
      <details class="layout-extras"><summary>Thêm vật cản</summary><div class="layout-actions"><button type="button" id="layout-tree">Thêm cây lớn (10 m)</button><button type="button" id="layout-tank">Thêm bồn nước (2 m)</button><button type="button" id="layout-antenna">Thêm ăng-ten (3 m)</button></div></details>
      <svg id="layout-plane" role="group" aria-label="Mặt phẳng sắp xếp pin, cửa chính ở phía dưới"></svg>
      <p id="layout-status" role="status"></p><div class="layout-actions"><button type="button" id="layout-apply" class="primary">Áp dụng lên 3D</button><button type="button" id="layout-cancel">Hủy</button></div>`;
    document.body.append(dialog);
    const find=id=>dialog.querySelector('#'+id),svg=find('layout-plane');
    let objects=[],objectIndex=-1,draft=[],selected=0,c,buildings,editingRoof=false,drag=null;
    const module=()=>PanelGeometry.moduleFor(c.watts);
    const bearing=()=>c.bearing-c.house;
    function message(text){find('layout-status').textContent=text;}
    function draw(focus=false) {
      const corners=PanelGeometry.roofOutline(c);
      const polygons=PanelGeometry.individualPanels(draft,bearing(),0,0,module());
      const pad=objects.length?6:editingRoof?2:1;
      const left=Math.min(...buildings.map(b=>b.x-b.width/2))-pad;
      const right=Math.max(...buildings.map(b=>b.x+b.width/2))+pad;
      svg.setAttribute('viewBox',`${-right} ${-c.length/2-pad} ${right-left} ${c.length+pad*2}`);
      svg.innerHTML=buildings.map(b=>{
        const label=b.main?'Nhà chính · Cửa chính':b.x<0?'Nhà bên trái':'Nhà bên phải';
        const ridge=b.thai?`<path d="M ${-b.x} ${-b.depth/2} v ${b.depth}" stroke="#897965" stroke-width=".09"/>`:'';
        if(b.main){
          const [a,f]=corners;
          const midX=-(a[0]+f[0])/2,midZ=-(a[1]+f[1])/2;
          return `<polygon points="${corners.map(([x,z])=>[-x,-z].join(',')).join(' ')}" fill="#e1ebe3" stroke="#718b7b" stroke-width=".08"/>
            <defs><clipPath id="layout-main-roof"><polygon points="${corners.map(([x,z])=>[-x,-z].join(',')).join(' ')}"/></clipPath></defs><g clip-path="url(#layout-main-roof)">${ridge}</g><path d="M ${midX+(f[0]-a[0])*.08} ${midZ+(f[1]-a[1])*.08} L ${midX-(f[0]-a[0])*.08} ${midZ-(f[1]-a[1])*.08}" stroke="#c98213" stroke-width=".16"/><text x="${midX}" y="${midZ+.65}" text-anchor="middle" font-size=".48" fill="currentColor">${label}</text>`;
        }
        return `<rect x="${-b.x-b.width/2}" y="${-b.depth/2}" width="${b.width}" height="${b.depth}" fill="#cfbeb0" stroke="#718b7b" stroke-width=".08"/>${ridge}<text x="${-b.x}" y="${b.depth/2+.65}" text-anchor="middle" font-size=".48" fill="currentColor">${label}</text>`;
      }).join('');
      polygons.forEach((p,i)=>{
        const node=document.createElementNS('http://www.w3.org/2000/svg','polygon');
        node.setAttribute('points',p.map(v=>`${-v[0]},${-v[2]}`).join(' '));
        node.setAttribute('fill',i===selected?'#2689a6':'#214d70');node.setAttribute('stroke',i===selected?'#f2ae37':'#b9dce7');node.setAttribute('stroke-width','.06');
        node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`Tấm pin ${i+1}`);node.setAttribute('aria-pressed',String(i===selected));node.dataset.index=i;svg.append(node);
      });
      objects.forEach(({type,x,z},i)=>{
        const marker=document.createElementNS('http://www.w3.org/2000/svg','g');
        for(const [key,value] of Object.entries({transform:`translate(${-x} ${-z})`,tabindex:0,role:'button','aria-label':type==='tree'?'Cây lớn':type==='tank'?'Bồn nước':'Ăng-ten'}))marker.setAttribute(key,value);
        const icon=type==='tree'?'<circle r="1.95" fill="#476f45"/><circle cx="-.58" cy="-.4" r="1.18" fill="#85a86a"/><circle cx=".65" cy=".2" r="1" fill="#649157"/>':type==='tank'?'<circle r=".7" fill="#9cbac6" stroke="#526e7c" stroke-width=".09"/><circle r=".45" fill="none" stroke="#dbe5ea" stroke-width=".09"/><circle r=".18" fill="#597b88"/>':'<path d="M0 -.82V.82 M-.6 -.5H.6 M-.45 0H.45 M-.3 .5H.3" stroke="#344c59" stroke-width=".12"/>';
        const radius=type==='tree'?2.1:.85;
        marker.innerHTML=`<circle r="${radius}" fill="transparent" stroke="${i===objectIndex?'#c98213':'none'}" stroke-width=".1"/><g pointer-events="none">${icon}</g>`;
        if(marker.firstElementChild)marker.firstElementChild.dataset.object=i;
        marker.setAttribute('pointer-events','bounding-box');
        marker.dataset.object=i;svg.append(marker);
      });
      if(editingRoof)corners.forEach(([x,z],i)=>{
        const [u,v]=corners[(i+1)%4];
        const ns='http://www.w3.org/2000/svg',label=document.createElementNS(ns,'text'),handle=document.createElementNS(ns,'circle');
        label.setAttribute('x',-(x+u)/2);label.setAttribute('y',-(z+v)/2-.2);
        label.setAttribute('class','roof-edge-length');label.textContent=Math.hypot(u-x,v-z).toFixed(2)+' m';
        svg.append(label);
        for(const [k,value] of Object.entries({cx:-x,cy:-z,r:.38,fill:'#eebc52',stroke:'#41371c','stroke-width':.08,tabindex:0,role:'button','aria-label':'Góc mái '+(i+1)}))handle.setAttribute(k,value);
        handle.dataset.corner=i;svg.append(handle);
      });
      find('layout-delete-object').disabled=objectIndex<0;
      find('layout-tree').disabled=find('layout-tank').disabled=find('layout-antenna').disabled=objects.length>=20;
      find('layout-remove').hidden=objectIndex>=0;
      find('layout-rotate').hidden=objectIndex>=0;
      find('layout-delete-object').hidden=objectIndex<0;
      find('layout-add').disabled=draft.length>=30;find('layout-remove').disabled=draft.length<=1;
      if(focus && objectIndex>=0)svg.querySelector(`[data-object="${objectIndex}"]`)?.focus();
      else if(focus)svg.querySelector(`[data-index="${selected}"]`)?.focus();
    }
    function move(x,z) {
      const next=draft.map((p,i)=>i===selected?{...p,x,z}:p);
      if(!PanelGeometry.validPlacement(next,bearing(),c.length,c.width,module(),c.outline)){message('Vị trí này chồng lên tấm khác hoặc vượt mép mái.');return;}
      draft=next;draw();message(`${draft.length} tấm · Tấm ${selected+1}: ngang ${x.toFixed(1)} m, dọc ${z.toFixed(1)} m.`);
    }
    function rotateSelected() {
      const next=draft.map((p,i)=>i===selected?{...p,rotation:((p.rotation||0)+90)%360}:p);
      if(!PanelGeometry.validPlacement(next,bearing(),c.length,c.width,module(),c.outline)){message('Không thể xoay ở đây: tấm pin sẽ chồng lên tấm khác hoặc vượt mép mái. Hãy dịch tấm ra chỗ trống rồi xoay.');return;}
      draft=next;draw();message(`Đã xoay tấm ${selected+1} 90°. Bấm Áp dụng lên 3D để lưu.`);
    }
    find('layout-rotate').onclick=rotateSelected;
    const point=e=>{
      const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      return {x:-p.x,y:-p.y};
    };
    for(const type of ['tree','tank','antenna'])find('layout-'+type).onclick=()=>{
      if(objects.length>=20)return;
      objectIndex=objects.push({type,x:0,z:type==='tree'?c.length/2+3:0})-1;draw();
    };
    find('layout-delete-object').onclick=()=>{if(objectIndex>=0)objects.splice(objectIndex,1);objectIndex=-1;draw();};
    function moveObject(x,z) {
      const object=objects[objectIndex];
      if(object.type==='tree'){
        object.x=Math.max(buildings[0].x-c.width/2-(c.left?8:0)-4,Math.min(c.width/2+(c.right?8:0)+4,x));
        object.z=Math.max(-c.length/2-4,Math.min(c.length/2+4,z));
      } else {
        const roof=buildings.find(b=>Math.abs(x-b.x)<=b.width/2 && Math.abs(z-b.z)<=b.depth/2);
        if(!roof)return;
        const inset=object.type==='tank'?.73:.65;
        if(roof.footprint&&!PanelGeometry.fitsOutline(roof.footprint,x,z,inset))return;
        object.x=Math.max(roof.x-roof.width/2+inset,Math.min(roof.x+roof.width/2-inset,x));
        object.z=Math.max(-roof.depth/2+inset,Math.min(roof.depth/2-inset,z));
      }
      draw();
    }
    find('layout-shape').onclick=()=>{
      editingRoof=!editingRoof;
      find('layout-shape').setAttribute('aria-pressed',String(editingRoof));draw();
    };
    function moveCorner(i,x,z){
      const boundary=PanelGeometry.roofOutline(c);
      boundary[i]=[Math.max(-c.width/2,Math.min(c.width/2,Math.round(x*10)/10)),Math.max(-c.length/2,Math.min(c.length/2,Math.round(z*10)/10))];
      const normalized=boundary.map(([u,v])=>[u/c.width,v/c.length]);
      if(!PanelGeometry.validOutline(normalized))return;
      c.outline=normalized;buildings=PanelGeometry.siteBuildings(c);draw();
      message(boundary.map(([u,v],j)=>Math.hypot(u-boundary[(j+1)%4][0],v-boundary[(j+1)%4][1]).toFixed(2)+' m').join(' · '));
    }
    svg.addEventListener('pointerdown',e=>{
      if(e.target.dataset.corner!==undefined){
        e.preventDefault();drag={id:e.pointerId,corner:Number(e.target.dataset.corner)};
        svg.setPointerCapture(e.pointerId);return;
      }
      if(e.target.dataset.object!==undefined){
        e.preventDefault();objectIndex=Number(e.target.dataset.object);
        const p=point(e),o=objects[objectIndex];drag={object:true,id:e.pointerId,x:p.x-o.x,z:p.y-o.z};
        svg.setPointerCapture(e.pointerId);draw();return;
      }
      objectIndex=-1;
      const index=e.target.dataset.index;if(index===undefined)return;
      e.preventDefault();selected=Number(index);const p=point(e);drag={id:e.pointerId,x:p.x-draft[selected].x,z:p.y-draft[selected].z};svg.setPointerCapture(e.pointerId);draw(true);
    });
    svg.addEventListener('pointermove',e=>{if(!drag || drag.id!==e.pointerId)return;const p=point(e);if(drag.corner!==undefined){moveCorner(drag.corner,p.x,p.y);return;}(drag.object?moveObject:move)(Math.round((p.x-drag.x)*10)/10,Math.round((p.y-drag.z)*10)/10);});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])svg.addEventListener(name,()=>{if(drag){drag=null;draw(true);}});
    svg.addEventListener('keydown',e=>{
      if(e.target.dataset.corner!==undefined && e.key.startsWith('Arrow')){
        e.preventDefault();
        const i=Number(e.target.dataset.corner),[x,z]=PanelGeometry.roofOutline(c)[i];
        moveCorner(i,x+(e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0),z+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0));
        svg.querySelector('[data-corner="'+i+'"]')?.focus();
        return;
      }
      if(e.target.dataset.object!==undefined){
        objectIndex=Number(e.target.dataset.object);const o=objects[objectIndex];
        if(e.key==='Delete'){e.preventDefault();find('layout-delete-object').onclick();return;}
        if(e.key.startsWith('Arrow')){e.preventDefault();moveObject(o.x+(e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0),o.z+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0));svg.querySelector('[data-object="'+objectIndex+'"]')?.focus();}
        return;
      }
      if(e.target.dataset.index===undefined)return;objectIndex=-1;selected=Number(e.target.dataset.index);
      if(e.key.toLowerCase()==='r'){e.preventDefault();rotateSelected();return;}
      if(e.key===' ' || e.key==='Enter'){e.preventDefault();draw(true);return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const p=draft[selected];move(p.x+(e.key==='ArrowLeft'?.1:e.key==='ArrowRight'?-.1:0),p.z+(e.key==='ArrowUp'?.1:e.key==='ArrowDown'?-.1:0));draw(true);
    });
    find('layout-add').onclick=()=>{
      if(draft.length>=30)return;
      for(const rotation of [0,90])for(let z=-c.length/2;z<=c.length/2;z+=.2)for(let x=-c.width/2;x<=c.width/2;x+=.2) {
        const next=[...draft,{x,z,rotation}];if(PanelGeometry.validPlacement(next,bearing(),c.length,c.width,module(),c.outline)){draft=next;objectIndex=-1;selected=draft.length-1;draw(true);message(`${draft.length} tấm`);return;}
      }
      message('Không còn vị trí trống. Hãy di chuyển các tấm hoặc xếp tự động.');
    };
    find('layout-remove').onclick=()=>{if(draft.length<=1)return;draft.splice(selected,1);selected=Math.min(selected,draft.length-1);draw(true);message(`${draft.length} tấm`);};
    find('layout-auto').onclick=()=>{const next=PanelGeometry.packPanels(draft.length,bearing(),c.length,c.width,module(),c.outline);if(!next.length){message('Bố trí chưa hợp lệ.');return;}draft=next.map(p=>({...p}));selected=Math.min(selected,draft.length-1);draw();message('Đã xếp tự động.');};
    find('layout-apply').onclick=()=>{if(!PanelGeometry.validPlacement(draft,bearing(),c.length,c.width,module(),c.outline)){message('Tấm pin vượt đường bao mái. Hãy di chuyển hoặc xếp lại pin.');return;}apply(draft,objects,c.outline);dialog.close();};
    find('layout-cancel').onclick=()=>dialog.close();
    return action=>{c={...getConfiguration()};editingRoof=false;find('layout-shape').setAttribute('aria-pressed','false');buildings=PanelGeometry.siteBuildings(c);objects=(c.obstacles||[]).map(o=>({...o}));objectIndex=-1;draft=getPositions(c.count).map(p=>({...p,x:p.x+c.x,z:p.z-c.z}));selected=0;draw();message(`${draft.length} tấm · Mái rộng ${c.width} m × dài ${c.length} m. Tấm ${c.watts} W: ${module().length} × ${module().width} m; 3D áp dụng thêm độ nghiêng đã chọn.`);dialog.showModal();if(action==='add')find('layout-add').click();};
  };
})(globalThis);
