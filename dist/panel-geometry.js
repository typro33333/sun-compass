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
  function corners(bearing, tilt, height, x = 0, z = 0) {
    const a = bearing * rad, t = tilt * rad;
    const right = [Math.cos(a),0,Math.sin(a)];
    const uphill = [-Math.sin(a)*Math.cos(t),Math.sin(t),Math.cos(a)*Math.cos(t)];
    const center = [x,height + .35 + 2*Math.sin(t),z];
    return [[-1.8,-2],[1.8,-2],[1.8,2],[-1.8,2]].map(([u,v]) => center.map((c,i)=>c+u*right[i]+v*uphill[i]));
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
  function neighbors(left, right) {
    // Two 8 m wide houses touch the 8 m wide central house at x = ±4.
    return [{x:-8,z:0,width:8,depth:10,height:left*3.2},{x:8,z:0,width:8,depth:10,height:right*3.2}].filter(b=>b.height>0);
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
  function recommend(samples) {
    let best = { bearing:180, tilt:0, score:-1 };
    for (let tilt=0;tilt<=90;tilt+=5) for (let bearing=0;bearing<360;bearing+=5) {
      // Weight direct incidence by solar elevation, reducing near-horizon influence.
      const score = samples.reduce((sum,sun)=>sum+incidence(sun,bearing,tilt)*Math.max(0,Math.sin(sun.altitude*rad)),0);
      if (score>best.score+1e-9) best={bearing,tilt,score};
    }
    return best;
  }
  root.PanelGeometry = { vector, angle, incidence, corners, shadow, rotate, neighbors, blocked, recommend };
  if (typeof module !== 'undefined') module.exports = root.PanelGeometry;
})(typeof window !== 'undefined' ? window : globalThis);
