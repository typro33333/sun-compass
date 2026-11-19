// East/up/south world axes. Bearings run clockwise from geographic north.
(function(root) {
  const rad = Math.PI / 180;
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
  function panelLayout(count, bearing, tilt, height, x, z, length) {
    const columns=Math.min(4,Math.ceil(Math.sqrt(count))), rows=Math.ceil(count/columns);
    let outline=corners(bearing,tilt,height,0,0,columns*1.2,rows*2);
    const extent=axis=>Math.max(...outline.map(p=>Math.abs(p[axis])));
    const limitX=Math.max(0,4-extent(0)), limitZ=Math.max(0,length/2-extent(2));
    x=Math.max(-limitX,Math.min(limitX,x));z=Math.max(-limitZ,Math.min(limitZ,z));
    outline=outline.map(p=>[p[0]+x,p[1],p[2]+z]);
    const at=(u,v)=>outline[0].map((p,i)=>p+(outline[1][i]-p)*u+(outline[3][i]-p)*v);
    const panels=Array.from({length:count},(_,i)=>{
      const col=i%columns,row=Math.floor(i/columns),u0=(col+.015)/columns,u1=(col+.985)/columns,v0=(row+.01)/rows,v1=(row+.99)/rows;
      return [at(u0,v0),at(u1,v0),at(u1,v1),at(u0,v1)];
    });
    return {outline,panels,x,z,limitX,limitZ};
  }
  function roofHeight(x, height, thai) {
    return height + (thai ? 3 * Math.max(0, 1 - Math.abs(x) / 4.5) : 0);
  }
  function supports(panel, height, thai, bearing) {
    return panel.map(top=>{
      const local=rotate(top,-bearing);
      return [[top[0],roofHeight(local[0],height,thai),top[2]],top];
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
  function neighbors(left, right, depth = 10, leftRoof = false, rightRoof = false) {
    // Two 8 m wide houses touch the 8 m wide central house at x = ±4.
    return [{x:-8,z:0,width:8,depth,height:left*3.2,thai:!!leftRoof},{x:8,z:0,width:8,depth,height:right*3.2,thai:!!rightRoof}].filter(b=>b.height>0);
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

  function individualPanels(positions,bearing,tilt,height) {
    return positions.map(({x,z})=>corners(bearing,tilt,height,x,z,1.18,1.96));
  }
  function validPlacement(positions,bearing,length) {
    const polygons=individualPanels(positions,bearing,0,0);
    if(polygons.some(p=>p.some(([x,,z])=>Math.abs(x)>4+1e-8 || Math.abs(z)>length/2+1e-8)))return false;
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
  function* recommendScene(samples,config,positions) {
    const c=config, height=(c.floors+1)*3.2+(c.roof?3:0);
    const volumes=occluders(neighbors(c.left,c.right,c.length,c.leftRoof,c.rightRoof));
    const rays=samples.filter(s=>s.altitude>0).map(s=>({world:vector(s.azimuth,s.altitude),local:rotate(vector(s.azimuth,s.altitude),-c.house),weight:s.weight??1}));
    function score(bearing,tilt,grid) {
      const normal=vector(bearing,90-tilt);
      const panels=individualPanels(positions,bearing-c.house,tilt,height);
      const points=panels.flatMap(p=>Array.from({length:grid*grid},(_,i)=>{
        const u=(i%grid+.5)/grid,v=(Math.floor(i/grid)+.5)/grid;
        return p[0].map((n,k)=>n+(p[1][k]-n)*u+(p[3][k]-n)*v+(k===0?c.x:k===2?-c.z:0));
      }));
      let total=0;
      for(const ray of rays) {
        const incidence=Math.max(0,normal.reduce((sum,n,i)=>sum+n*ray.world[i],0));
        if(!incidence)continue;
        let visible=points.length;
        if(volumes.length)for(const point of points)if(rayBlocked(point,ray.local,volumes))visible--;
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
      if(!validPlacement(positions,bearing-c.house,c.length))return;
      const shifted=positions.map(p=>({x:p.x+c.x,z:p.z-c.z}));
      if(!validPlacement(shifted,bearing-c.house,c.length))return;
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
    return {...best,baseline:current.score};
  }
  root.PanelGeometry = { vector, angle, incidence, corners, shadow, rotate, neighbors, blocked, recommend, recommendScene, annualSamples, roofHeight, supports, panelLayout, individualPanels, validPlacement };
  if (typeof module !== 'undefined') module.exports = root.PanelGeometry;
})(typeof window !== 'undefined' ? window : globalThis);
