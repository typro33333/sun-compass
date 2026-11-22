// East/up/south world axes. Bearings run clockwise from geographic north.
(function(root) {
  const rad = Math.PI / 180;
  // Representative manufacturer models, checked 2026-11-22; not market averages.
  const moduleCatalog = [
    {min:550,max:565,length:2.278,width:1.134,model:'Jinko Tiger Pro 72HL4 (550–570 W)',source:'https://jinkosolarcdn.shwebspace.com/uploads/JKM550-570M-72HL4-(V)-F5-EN.pdf'},
    {min:570,max:605,length:2.384,width:1.134,model:'Trina NEG19RC.20 (2023)',source:'https://static.trinasolar.com/sites/default/files/Datasheet_Vertex_NEG19RC.20.pdf'},
    {min:610,max:630,length:2.382,width:1.134,model:'Jinko 66HL4M-BDV (605–630 W)',source:'https://jinkosolarcdn.shwebspace.com/uploads/JKM605-630N-66HL4M-BDV-F5-EN.pdf'},
    {min:635,max:650,length:2.382,width:1.134,model:'Trina NEG19RC.20 (2025)',source:'https://pages.trinasolar.com/rs/567-KJK-096/images/Datasheet_Vertex_NEG19RC.20_2025_PD1M.pdf'},
    {min:655,max:670,length:2.382,width:1.134,model:'Jinko 66QL6-BDV (650–670 W)',source:'https://www.jinkosolar.com/uploads/JKM650-670N-66QL6-BDV-F3-EN.pdf'},
    {min:675,max:700,length:2.384,width:1.303,model:'Trina NEG21C.20 (2023)',source:'https://pages.trinasolar.com/rs/567-KJK-096/images/NEG21C.20_EN_2023_POWER_700W.pdf'}
  ];
  function moduleFor(watts) {
    if(!Number.isInteger(watts) || watts%5 || watts<550 || watts>700)return null;
    const row=moduleCatalog.find(r=>watts>=r.min && watts<=r.max);
    return row?{...row,watts}:null;
  }
  const legacyModule={width:1.18,length:1.96};
  function packPanels(count,bearing,length,width,module) {
    let best=[];
    for(const rotation of [0,90])for(let cols=1;cols<=count;cols++) {
      const w=rotation?module.length:module.width,d=rotation?module.width:module.length;
      const rows=Math.ceil(count/cols),next=[];
      for(let i=0;i<count;i++) {
        const center=rotate([(i%cols-(cols-1)/2)*(w+.02),0,(Math.floor(i/cols)-(rows-1)/2)*(d+.02)],bearing);
        const point={x:center[0],z:center[2],rotation};
        if(validPlacement([...next,point],bearing,length,width,module))next.push(point);
      }
      if(next.length>best.length)best=next;
      if(best.length===count)return best;
    }
    return best;
  }
  function vector(azimuth, altitude) {
    const a = azimuth * rad, h = altitude * rad;
    return [Math.sin(a) * Math.cos(h), Math.sin(h), -Math.cos(a) * Math.cos(h)];
  }
  function angle(sun, bearing, tilt) {
    const s = vector(sun.azimuth, sun.altitude), n = vector(bearing, 90 - tilt);
    const dot = s.reduce((sum,v,i) => sum + v*n[i], 0);
    return Math.acos(Math.max(-1,Math.min(1,dot))) / rad;
  }
  function incidence(sun, bearing, tilt) {
    return sun.altitude <= 0 ? 0 : Math.max(0,Math.cos(angle(sun,bearing,tilt)*rad));
  }
  function corners(bearing, tilt, height, x = 0, z = 0, width = 3.6, depth = 4) {
    const a = bearing * rad, t = tilt * rad;
    const right = [Math.cos(a),0,Math.sin(a)];
    const uphill = [-Math.sin(a)*Math.cos(t),Math.sin(t),Math.cos(a)*Math.cos(t)];
    const center = [x,height + .35 + depth/2*Math.sin(t),z];
    return [[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([u,v]) => center.map((c,i)=>c+u*right[i]+v*uphill[i]));
  }
  function panelLayout(count, bearing, tilt, height, x, z, length, width = 8) {
    let columns=Math.min(4,Math.ceil(Math.sqrt(count))), rows=Math.ceil(count/columns);
    // Pick a full-size grid that fits narrow roofs; never shrink the modules.
    const options=[];
    for(let cols=1;cols<=count;cols++) {
      const rs=Math.ceil(count/cols), shape=corners(bearing,0,0,0,0,cols*1.2,rs*2);
      if(shape.every(p=>Math.abs(p[0])<=width/2+1e-8 && Math.abs(p[2])<=length/2+1e-8))options.push({cols,rs});
    }
    options.sort((a,b)=>a.cols*a.rs-b.cols*b.rs || Math.abs(a.cols-a.rs)-Math.abs(b.cols-b.rs));
    if(options.length){columns=options[0].cols;rows=options[0].rs;}
    let outline=corners(bearing,tilt,height,0,0,columns*1.2,rows*2);
    const extent=axis=>Math.max(...outline.map(p=>Math.abs(p[axis])));
    const limitX=Math.max(0,width/2-extent(0)), limitZ=Math.max(0,length/2-extent(2));
    x=Math.max(-limitX,Math.min(limitX,x));z=Math.max(-limitZ,Math.min(limitZ,z));
    outline=outline.map(p=>[p[0]+x,p[1],p[2]+z]);
    const at=(u,v)=>outline[0].map((p,i)=>p+(outline[1][i]-p)*u+(outline[3][i]-p)*v);
    const panels=Array.from({length:count},(_,i)=>{
      const col=i%columns,row=Math.floor(i/columns),u0=(col+.015)/columns,u1=(col+.985)/columns,v0=(row+.01)/rows,v1=(row+.99)/rows;
      return [at(u0,v0),at(u1,v0),at(u1,v1),at(u0,v1)];
    });
    return {outline,panels,x,z,limitX,limitZ};
  }
  function roofHeight(x, height, thai, width = 8) {
    return height + (thai ? 3 * Math.max(0, 1 - Math.abs(x) / (width/2+.5)) : 0);
  }
  function supports(panel, height, thai, bearing, width = 8) {
    return panel.map(top=>{
      const local=rotate(top,-bearing);
      return [[top[0],roofHeight(local[0],height,thai,width),top[2]],top];
    });
  }
  function shadow(points, sun) {
    if (sun.altitude <= 0) return [];
    const s = vector(sun.azimuth, sun.altitude);
    return points.map(([x,y,z]) => [x-y*s[0]/s[1],0,z-y*s[2]/s[1]]);
  }
  function rotate([x,y,z], bearing) {
    const a=bearing*rad;
    return [x*Math.cos(a)-z*Math.sin(a),y,x*Math.sin(a)+z*Math.cos(a)];
  }
  function neighbors(left, right, depth = 10, leftRoof = false, rightRoof = false, centralWidth = 8) {
    // Neighbor houses remain 8 m wide and touch the central house.
    return [{x:-(centralWidth/2+4),z:0,width:8,depth,height:left*3.2,thai:!!leftRoof},{x:centralWidth/2+4,z:0,width:8,depth,height:right*3.2,thai:!!rightRoof}].filter(b=>b.height>0);
  }
  function occluders(buildings) {
    return buildings.flatMap(({x,z,width,depth,height,thai})=>{
      const box=[[1,0,0,x+width/2],[-1,0,0,-x+width/2],[0,-1,0,0],[0,1,0,height],[0,0,1,z+depth/2],[0,0,-1,-z+depth/2]];
      if(!thai)return [box];
      const half=width/2+.5,end=depth/2+.5;
      return [box,[[0,-1,0,-height],[0,0,1,z+end],[0,0,-1,-z+end],[3/half,1,0,height+3+3*x/half],[-3/half,1,0,height+3-3*x/half]]];
    });
  }
  function rayBlocked(origin,ray,volumes) {
    return volumes.some(planes=>{
      let near=.0001, far=Infinity;
      for(const [a,b,c,d] of planes) {
        const distance=d-a*origin[0]-b*origin[1]-c*origin[2], slope=a*ray[0]+b*ray[1]+c*ray[2];
        if(Math.abs(slope)<1e-10) { if(distance<0)return false; }
        else if(slope>0) far=Math.min(far,distance/slope);
        else near=Math.max(near,distance/slope);
        if(far<near)return false;
      }
      return far>=near;
    });
  }
  function blocked(point, sun, buildings, bearing) {
    return sun.altitude>0 && rayBlocked(rotate(point,-bearing),rotate(vector(sun.azimuth,sun.altitude),-bearing),occluders(buildings));
  }

  function individualPanels(positions,bearing,tilt,height,module = legacyModule) {
    return positions.map(({x,z,rotation=0})=>corners(bearing,tilt,height,x,z,rotation%180===90?module.length:module.width,rotation%180===90?module.width:module.length));
  }
  function validPlacement(positions,bearing,length,width = 8,module = legacyModule) {
    const polygons=individualPanels(positions,bearing,0,0,module);
    if(polygons.some(p=>p.some(([x,,z])=>Math.abs(x)>width/2+1e-8 || Math.abs(z)>length/2+1e-8)))return false;
    for(let i=0;i<polygons.length;i++)for(let j=0;j<i;j++) {
      const a=polygons[i],b=polygons[j];
      const separate=[...a,...b].some((p,k,all)=>{
        const q=all[k<4?(k+1)%4:4+(k-3)%4],axis=[q[2]-p[2],p[0]-q[0]];
        const projection=poly=>poly.map(v=>v[0]*axis[0]+v[2]*axis[1]);
        const u=projection(a),v=projection(b);
        return Math.max(...u)<=Math.min(...v)+1e-8 || Math.max(...v)<=Math.min(...u)+1e-8;
      });
      if(!separate)return false;
    }
    return true;
  }

  function scene(config,positions) {
    const c={width:8,x:0,z:0,...config}, module=moduleFor(c.watts);
    if(!module || !positions?.length || positions.length!==c.count || !validPlacement(positions.map(p=>({...p,x:p.x+c.x,z:p.z-c.z})),c.bearing-c.house,c.length,c.width,module))throw Error('Bố trí pin không hợp lệ.');
    const height=(c.floors+1)*3.2,rotateHouse=p=>rotate(p,c.house);
    // Exact same module dimensions, rotation, shifts and mounting height for render and energy.
    const surfaces=individualPanels(positions,c.bearing-c.house,c.tilt,height+(c.roof?3:0),module).map(face=>face.map(([x,y,z])=>rotateHouse([x+c.x,y,z-c.z])));
    const adjacent=neighbors(c.left,c.right,c.length,c.leftRoof,c.rightRoof,c.width);
    const buildings=[{x:0,z:0,width:c.width,depth:c.length,height,main:true,thai:c.roof},...adjacent];
    const roofs=buildings.map(b=>[[b.x-b.width/2,b.height,-b.depth/2],[b.x+b.width/2,b.height,-b.depth/2],[b.x+b.width/2,b.height,b.depth/2],[b.x-b.width/2,b.height,b.depth/2]].map(rotateHouse));
    const roofFaces=buildings.filter(b=>b.thai).flatMap(b=>{
      const l=b.x-b.width/2-.5,r=b.x+b.width/2+.5,d=b.depth/2+.5,h=b.height;
      return [[[l,h,-d],[b.x,h+3,-d],[b.x,h+3,d],[l,h,d]],[[b.x,h+3,-d],[r,h,-d],[r,h,d],[b.x,h+3,d]],[[l,h,-d],[r,h,-d],[b.x,h+3,-d]],[[l,h,d],[b.x,h+3,d],[r,h,d]]].map(f=>f.map(rotateHouse));
    });
    return {config:{...c},positions:positions.map(p=>({...p})),module,modules:surfaces,neighbors:adjacent,buildings,roofs,roofFaces,volumes:occluders(buildings)};
  }
  function exposure(scene,sun,grid=6) {
    if(!Number.isInteger(grid)||grid<1||grid>30)throw Error('Lưới bóng che không hợp lệ.');
    const c=scene.config,ray=rotate(vector(sun.azimuth,sun.altitude),-c.house);
    const facing=incidence(sun,c.bearing,c.tilt);
    const panels=scene.modules.map(face=>{
      const cells=Array.from({length:grid*grid},(_,i)=>{
        if(sun.altitude<=0 || facing<=1e-12)return false;
        const u=(i%grid+.5)/grid,v=(Math.floor(i/grid)+.5)/grid;
        const p=face[0].map((n,k)=>n+(face[1][k]-n)*u+(face[3][k]-n)*v);
        return !rayBlocked(rotate(p,-c.house),ray,scene.volumes);
      });
      const litFraction=cells.filter(Boolean).length/cells.length,area=scene.module.width*scene.module.length;
      return {cells,litFraction,area,litArea:area*litFraction};
    });
    return {incidence:facing,panels};
  }
  function annualSamples(year, latitude, longitude, offset, position) {
    const samples = [];
    for (let date = new Date(Date.UTC(year,0,1)); date.getUTCFullYear() === year; date.setUTCDate(date.getUTCDate()+1)) {
      const day = date.toISOString().slice(0,10);
      for (let minute=15;minute<1440;minute+=30) samples.push(position(day,minute,latitude,longitude,offset));
    }
    return samples;
  }
  function recommend(samples) {
    const rays = samples.filter(s=>s.altitude>0).map(s=>{
      const v=vector(s.azimuth,s.altitude);
      return v.map(x=>x*v[1]);
    });
    let best = { bearing:180, tilt:0, score:0 };
    for (let tilt=0;tilt<=90;tilt+=5) for (let bearing=0;bearing<360;bearing+=5) {
      const n=vector(bearing,90-tilt);
      let score=0;
      for(const v of rays) score+=Math.max(0,v[0]*n[0]+v[1]*n[1]+v[2]*n[2]);
      if (score>best.score+1e-9) best={bearing,tilt,score};
    }
    return best;
  }
  // Incremental search lets the UI yield while evaluating the current scene.
  // Keep each panel's center fixed; reject rotations that break the layout.
  function* recommendScene(samples,config,positions,layout = false) {
    const c={width:8,...config}, module=moduleFor(config.watts) || legacyModule, height=(c.floors+1)*3.2+(c.roof?3:0);
    const volumes=occluders(neighbors(c.left,c.right,c.length,c.leftRoof,c.rightRoof,c.width));
    const rays=samples.filter(s=>s.altitude>0).map(s=>({world:vector(s.azimuth,s.altitude),local:rotate(vector(s.azimuth,s.altitude),-c.house),weight:s.weight??1}));
    function score(bearing,tilt,grid,placement = positions,ignoreShade = false) {
      const normal=vector(bearing,90-tilt);
      const panels=individualPanels(placement,bearing-c.house,tilt,height,module);
      const points=panels.flatMap(p=>Array.from({length:grid*grid},(_,i)=>{
        const u=(i%grid+.5)/grid,v=(Math.floor(i/grid)+.5)/grid;
        return p[0].map((n,k)=>n+(p[1][k]-n)*u+(p[3][k]-n)*v+(k===0?c.x:k===2?-c.z:0));
      }));
      let total=0;
      for(const ray of rays) {
        const incidence=Math.max(0,normal.reduce((sum,n,i)=>sum+n*ray.world[i],0));
        if(!incidence)continue;
        let visible=points.length;
        if(!ignoreShade && volumes.length)for(const point of points)if(rayBlocked(point,ray.local,volumes))visible--;
        total+=incidence*ray.world[1]*ray.weight*visible/points.length;
      }
      return total;
    }
    const candidates=[],seen=new Set();
    const current={bearing:c.bearing,tilt:c.tilt,score:score(c.bearing,c.tilt,6)};
    function candidate(bearing,tilt) {
      bearing=(bearing+360)%360;tilt=Math.max(0,Math.min(90,tilt));
      const key=bearing+','+tilt;
      if(seen.has(key))return;seen.add(key);
      if(!validPlacement(positions,bearing-c.house,c.length,c.width,module))return;
      const shifted=positions.map(p=>({...p,x:p.x+c.x,z:p.z-c.z}));
      if(!validPlacement(shifted,bearing-c.house,c.length,c.width,module))return;
      candidates.push({bearing,tilt,score:score(bearing,tilt,2)});
    }
    candidate(c.bearing,c.tilt);
    for(let bearing=0;bearing<360;bearing+=15)for(let tilt=0;tilt<=90;tilt+=10){candidate(bearing,tilt);yield;}
    candidates.sort((a,b)=>b.score-a.score);
    const coarse=candidates.slice(0,3);
    // Refine several promising regions, including the user's current bearing.
    coarse.push({bearing:c.bearing,tilt:c.tilt});
    for(const best of coarse)for(let a=-10;a<=10;a+=5)for(let t=-5;t<=5;t+=5){candidate(best.bearing+a,best.tilt+t);yield;}
    candidates.sort((a,b)=>b.score-a.score);
    let best=current;
    for(const option of candidates.slice(0,8)) {
      const result={...option,score:score(option.bearing,option.tilt,6)};
      if(result.score>best.score+1e-9)best=result;
      yield;
    }
    if (layout) {
      best={...best,positions:positions.map(p=>({...p}))};
      const automatic=packPanels(positions.length,best.bearing-c.house,c.length,c.width,module);
      // Compare the current pattern and a regular grid across the available roof.
      for (const base of [positions,automatic].filter(p=>p.length===positions.length)) {
        const corners=individualPanels(base,best.bearing-c.house,0,0,module).flat();
        const minX=-c.width/2-Math.min(...corners.map(p=>p[0]))-c.x,maxX=c.width/2-Math.max(...corners.map(p=>p[0]))-c.x;
        const minZ=-c.length/2-Math.min(...corners.map(p=>p[2]))+c.z,maxZ=c.length/2-Math.max(...corners.map(p=>p[2]))+c.z;
        for(let ix=0;ix<=4;ix++)for(let iz=0;iz<=4;iz++) {
          const next=base.map(p=>({...p,x:p.x+minX+(maxX-minX)*ix/4,z:p.z+minZ+(maxZ-minZ)*iz/4}));
          if(validPlacement(next,best.bearing-c.house,c.length,c.width,module) && validPlacement(next.map(p=>({...p,x:p.x+c.x,z:p.z-c.z})),best.bearing-c.house,c.length,c.width,module)) {
            const value=score(best.bearing,best.tilt,6,next);
            if(value>best.score+1e-9)best={...best,positions:next,score:value};
          }
          yield;
        }
      }
    }
    if (layout && rays.length) {
      const bearing=best.bearing,tilt=best.tilt;
      const footprint=individualPanels([{x:0,z:0}],bearing-c.house,0,0,module)[0];
      const ex=Math.max(...footprint.map(p=>Math.abs(p[0]))),ez=Math.max(...footprint.map(p=>Math.abs(p[2])));
      const spots=[];
      const step=.5;
      for(let x=-c.width/2+ex;x<=c.width/2-ex+1e-8;x+=step) {
        for(let z=-c.length/2+ez;z<=c.length/2-ez+1e-8;z+=step) {
          const p={x:x-c.x,z:z+c.z};
          if(!validPlacement([p],bearing-c.house,c.length,c.width,module))continue;
          spots.push({p,value:score(bearing,tilt,3,[p])});
        }
        yield;
      }
      spots.sort((a,b)=>b.value-a.value || Math.hypot(a.p.x,a.p.z)-Math.hypot(b.p.x,b.p.z));
      // Try multiple seeds so the first panel does not force a single cluster.
      for(let seed=0;seed<Math.min(8,spots.length);seed++) {
        const next=[spots[seed].p];
        for(const spot of spots) {
          if(next.length===positions.length)break;
          if(validPlacement([...next,spot.p],bearing-c.house,c.length,c.width,module))next.push(spot.p);
        }
        if(next.length===positions.length) {
          const value=score(bearing,tilt,6,next);
          if(value>best.score+1e-9)best={...best,positions:next.map(p=>({...p})),score:value};
        }
        yield;
      }
      // Also relocate individual panels from the best complete layout; keep improvements only.
      for(let i=0;i<positions.length;i++) {
        const rest=best.positions.filter((_,j)=>j!==i);
        for(const spot of spots) {
          if(!validPlacement([...rest,spot.p],bearing-c.house,c.length,c.width,module))continue;
          const next=best.positions.map((p,j)=>j===i?spot.p:p);
          const value=score(bearing,tilt,6,next);
          if(value>best.score+1e-9)best={...best,positions:next.map(p=>({...p})),score:value};
          break;
        }
        yield;
      }
    }
    const baselineClear=score(c.bearing,c.tilt,6,positions,true);
    const bestClear=score(best.bearing,best.tilt,6,best.positions || positions,true);
    return {...best,baseline:current.score,explanation:{
      beforeShade:baselineClear>0?1-current.score/baselineClear:0,
      afterShade:bestClear>0?1-best.score/bestClear:0,
      samples:samples.length, neighbors:volumes.length>0,
      moved:(best.positions || positions).filter((p,i)=>Math.hypot(p.x-positions[i].x,p.z-positions[i].z)>.05).length
    }};
  }
  root.PanelGeometry = { scene, exposure, moduleCatalog, moduleFor, packPanels, vector, angle, incidence, corners, shadow, rotate, neighbors, blocked, recommend, recommendScene, annualSamples, roofHeight, supports, panelLayout, individualPanels, validPlacement };
  if (typeof module !== 'undefined') module.exports = root.PanelGeometry;
})(typeof window !== 'undefined' ? window : globalThis);
