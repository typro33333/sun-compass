// Orthographic software depth buffer: every visible pixel belongs to the nearest
// surface, independent of face size, winding, camera angle or insertion order.
(function(root) {
  function rasterize(width, height, faces, project, colorOf, workspace) {
    const size=width*height;
    const pixels=workspace?.pixels?.length===size*4?workspace.pixels:new Uint8ClampedArray(size*4);
    const depth=workspace?.depth?.length===size?workspace.depth:new Float32Array(size);
    pixels.fill(0);depth.fill(-Infinity);
    if(workspace){workspace.pixels=pixels;workspace.depth=depth;}
    function pixel(x,y,z,color,bias=0) {
      if(x<0 || y<0 || x>=width || y>=height)return;
      const index=y*width+x;
      if(z+bias<depth[index])return;
      depth[index]=z+bias;
      pixels.set(color,index*4);
    }
    function line(a,b,color) {
      const steps=Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1])));
      for(let i=0;i<=steps;i++) {
        const t=steps?i/steps:0;
        pixel(Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),a[2]+(b[2]-a[2])*t,color,.015);
      }
    }
    function triangle(a,b,c,color) {
      const area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(area)<1e-8)return;
      const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0])));
      const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
        const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area;
        const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area,w=1-u-v;
        if(u>=-1e-8 && v>=-1e-8 && w>=-1e-8)pixel(x,y,u*a[2]+v*b[2]+w*c[2],color);
      }
    }
    for(const face of faces) {
      const p=face.p.map(project);
      if(face.color)for(let i=1;i<p.length-1;i++)triangle(p[0],p[i],p[i+1],colorOf(face.color));
      if(face.stroke || p.length===2)for(let i=0;i<(p.length===2?1:p.length);i++)line(p[i],p[(i+1)%p.length],colorOf(face.stroke||'#738887'));
    }
    return pixels;
  }
  root.DepthRenderer={rasterize};
  if (typeof module !== 'undefined') module.exports = root.DepthRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
