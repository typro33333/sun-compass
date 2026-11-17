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
  function recommend(samples) {
    let best = { bearing:180, tilt:0, score:-1 };
    for (let tilt=0;tilt<=90;tilt+=5) for (let bearing=0;bearing<360;bearing+=5) {
      // Weight direct incidence by solar elevation, reducing near-horizon influence.
      const score = samples.reduce((sum,sun)=>sum+incidence(sun,bearing,tilt)*Math.max(0,Math.sin(sun.altitude*rad)),0);
      if (score>best.score+1e-9) best={bearing,tilt,score};
    }
    return best;
  }
  root.PanelGeometry = { vector, angle, incidence, corners, shadow, recommend };
  if (typeof module !== 'undefined') module.exports = root.PanelGeometry;
})(typeof window !== 'undefined' ? window : globalThis);
