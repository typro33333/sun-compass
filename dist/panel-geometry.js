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
  function neighbors(left, right, depth = 10) {
    // Two 8 m wide houses touch the 8 m wide central house at x = ±4.
    return [{x:-8,z:0,width:8,depth,height:left*3.2},{x:8,z:0,width:8,depth,height:right*3.2}].filter(b=>b.height>0);
  }
  function blocked(point, sun, buildings, bearing) {
    if (sun.altitude<=0) return false;
    const origin=rotate(point,-bearing), ray=rotate(vector(sun.azimuth,sun.altitude),-bearing);
    return buildings.some(({x,z,width,depth,height})=>{
      const min=[x-width/2,0,z-depth/2],max=[x+width/2,height,z+depth/2];
      let near=0.0001,far=Infinity;
      for(let i=0;i<3;i++) {
        if(Math.abs(ray[i])<1e-10) { if(origin[i]<min[i] || origin[i]>max[i])return false; }
        else { const a=(min[i]-origin[i])/ray[i],b=(max[i]-origin[i])/ray[i];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b)); }
      }
      return far>=near;
    });
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
  root.PanelGeometry = { vector, angle, incidence, corners, shadow, rotate, neighbors, blocked, recommend, annualSamples, roofHeight, supports, panelLayout };
  if (typeof module !== 'undefined') module.exports = root.PanelGeometry;
})(typeof window !== 'undefined' ? window : globalThis);
