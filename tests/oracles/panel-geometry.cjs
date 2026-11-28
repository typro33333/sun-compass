// Legacy calculations used for regression comparisons. All scene geometry and
// drawing surfaces come from the production editor.
const G=require('../../dist/panel-geometry.js');
const {vector,rotate,incidence,moduleFor,occluders,neighbors,obstacleGeometry,individualPanels,validPlacement,packPanels}=G;
const legacyModule={width:1.18,length:1.96};
  function prepareRay(ray,volumes) {
    return volumes.map(planes=>planes.map(([a,b,c,d])=>[a,b,c,d,a*ray[0]+b*ray[1]+c*ray[2]]));
  }
  function preparedRayBlocked(origin,volumes) {
    for(const planes of volumes) {
      let near=.0001, far=Infinity,miss=false;
      for(const [a,b,c,d,slope] of planes) {
        const distance=d-a*origin[0]-b*origin[1]-c*origin[2];
        if(Math.abs(slope)<1e-10) { if(distance<0){miss=true;break;} }
        else if(slope>0) far=Math.min(far,distance/slope);
        else near=Math.max(near,distance/slope);
        if(far<near){miss=true;break;}
      }
      if(!miss && far>=near)return true;
    }
    return false;
  }
  function rayBlocked(origin,ray,volumes) {
    return preparedRayBlocked(origin,prepareRay(ray,volumes));
  }
  function blocked(point, sun, buildings, bearing) {
    return sun.altitude>0 && rayBlocked(rotate(point,-bearing),rotate(vector(sun.azimuth,sun.altitude),-bearing),occluders(buildings));
  }

  // Scenes are geometry snapshots. Keep only the latest sampling grid per scene;
  // WeakMap entries disappear when a scene is replaced by new geometry.
  const sampleCache=new WeakMap();
  function sampledGeometry(scene,grid) {
    let cached=sampleCache.get(scene);
    if(cached?.grid===grid)return cached;
    const points=scene.panels.map(({vertices:face})=>Array.from({length:grid*grid},(_,i)=>{
      const u=(i%grid+.5)/grid,v=(Math.floor(i/grid)+.5)/grid;
      return rotate(face[0].map((n,k)=>n+(face[1][k]-n)*u+(face[3][k]-n)*v),-scene.config.house);
    }));
    cached={grid,points};sampleCache.set(scene,cached);return cached;
  }
  function exposure(scene,sun,grid=6) {
    if(!Number.isFinite(sun?.azimuth)||!Number.isFinite(sun?.altitude))throw Error('Góc mặt trời không hợp lệ.');
    if(!Number.isInteger(grid)||grid<1||grid>30)throw Error('Lưới bóng che không hợp lệ.');
    const c=scene.config,ray=rotate(vector(sun.azimuth,sun.altitude),-c.house);
    const facing=incidence(sun,c.bearing,c.tilt),direct=sun.altitude>0 && facing>1e-12;
    const sampled=direct?sampledGeometry(scene,grid):null,volumes=direct?prepareRay(ray,scene.volumes):null;
    const panels=scene.panels.map(({id},index)=>{
      const cells=direct?sampled.points[index].map(p=>!preparedRayBlocked(p,volumes)):Array(grid*grid).fill(false);
      const litFraction=cells.filter(Boolean).length/cells.length,area=scene.module.width*scene.module.length;
      return {id,cells,litFraction,shadeFraction:direct ? 1-litFraction : null,area,litArea:area*litFraction};
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
    const volumes=occluders(neighbors(c.left,c.right,c.length,c.leftRoof,c.rightRoof,c.width)).concat(obstacleGeometry(c).volumes);
    const rays=samples.filter(s=>s.altitude>0).map(s=>({world:vector(s.azimuth,s.altitude),local:prepareRay(rotate(vector(s.azimuth,s.altitude),-c.house),volumes),weight:s.weight??1}));
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
        if(!ignoreShade && volumes.length)for(const point of points)if(preparedRayBlocked(point,ray.local))visible--;
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
      if(!validPlacement(positions,bearing-c.house,c.length,c.width,module,c.outline))return;
      const shifted=positions.map(p=>({...p,x:p.x+c.x,z:p.z-c.z}));
      if(!validPlacement(shifted,bearing-c.house,c.length,c.width,module,c.outline))return;
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
    // Thin objects can fall between coarse samples. Recheck nearby angles
    // with the forecast's 6-by-6 mask before recommending an orientation.
    if(c.obstacles?.length) {
      const center=best;
      for(const da of [-5,0,5])for(const dt of [-5,0,5]) {
        const bearing=(center.bearing+da+360)%360,tilt=Math.min(90,Math.max(0,center.tilt+dt));
        const shifted=positions.map(p=>({...p,x:p.x+c.x,z:p.z-c.z}));
        if(!validPlacement(positions,bearing-c.house,c.length,c.width,module,c.outline) ||
           !validPlacement(shifted,bearing-c.house,c.length,c.width,module,c.outline))continue;
        const value=score(bearing,tilt,6);
        if(value>best.score+1e-9)best={bearing,tilt,score:value};
        yield;
      }
    }
    if (layout) {
      best={...best,positions:positions.map(p=>({...p}))};
      const automatic=packPanels(positions.length,best.bearing-c.house,c.length,c.width,module,c.outline);
      // Compare the current pattern and a regular grid across the available roof.
      for (const base of [positions,automatic].filter(p=>p.length===positions.length)) {
        const corners=individualPanels(base,best.bearing-c.house,0,0,module).flat();
        const minX=-c.width/2-Math.min(...corners.map(p=>p[0]))-c.x,maxX=c.width/2-Math.max(...corners.map(p=>p[0]))-c.x;
        const minZ=-c.length/2-Math.min(...corners.map(p=>p[2]))+c.z,maxZ=c.length/2-Math.max(...corners.map(p=>p[2]))+c.z;
        for(let ix=0;ix<=4;ix++)for(let iz=0;iz<=4;iz++) {
          const next=base.map(p=>({...p,x:p.x+minX+(maxX-minX)*ix/4,z:p.z+minZ+(maxZ-minZ)*iz/4}));
          if(validPlacement(next,best.bearing-c.house,c.length,c.width,module,c.outline) && validPlacement(next.map(p=>({...p,x:p.x+c.x,z:p.z-c.z})),best.bearing-c.house,c.length,c.width,module,c.outline)) {
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
          if(!validPlacement([p],bearing-c.house,c.length,c.width,module,c.outline))continue;
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
          if(validPlacement([...next,spot.p],bearing-c.house,c.length,c.width,module,c.outline))next.push(spot.p);
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
          if(!validPlacement([...rest,spot.p],bearing-c.house,c.length,c.width,module,c.outline))continue;
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

const oracle={...G,exposure,blocked,recommend,recommendScene,annualSamples,
  renderCells:(scene,sun,grid=6)=>G.renderCells(scene,exposure(scene,sun,grid),grid)};
globalThis.PanelGeometry=oracle;
module.exports=oracle;
