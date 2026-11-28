// Loaded only by the roof simulator when a GPU adapter is available.
import {WebGPURenderer, Scene, OrthographicCamera, BufferGeometry, Float32BufferAttribute,
  Mesh, MeshBasicMaterial, LineSegments, LineBasicMaterial, DoubleSide, Color, SRGBColorSpace} from 'three/webgpu';

function geometry(faces, outlines, colorOf) {
  const xyz=[], rgb=[];
  const tint=new Color();
  for(const face of faces){
    const css=outlines?face.stroke:face.color;
    if(!css || face.p.length<(outlines?2:3))continue;
    const [r,g,b]=colorOf(css);
    tint.setRGB(r/255,g/255,b/255,SRGBColorSpace);
    const vertex=p=>{xyz.push(...p);rgb.push(tint.r,tint.g,tint.b);};
    if(outlines){
      const n=face.p.length;
      for(let i=0;i<(n===2?1:n);i++){vertex(face.p[i]);vertex(face.p[(i+1)%n]);}
    }else{
      for(let i=1;i<face.p.length-1;i++){vertex(face.p[0]);vertex(face.p[i]);vertex(face.p[i+1]);}
    }
  }
  const result=new BufferGeometry();
  result.setAttribute('position',new Float32BufferAttribute(xyz,3));
  result.setAttribute('color',new Float32BufferAttribute(rgb,3));
  return result;
}

export async function createRoofRenderer(onLost) {
  const renderer=new WebGPURenderer({alpha:true,antialias:true});
  await renderer.init();
  renderer.onDeviceLost=onLost;
  renderer.setClearColor(0x000000,0);
  const scene=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,.1,600);
  const mesh=new Mesh(new BufferGeometry(),new MeshBasicMaterial({vertexColors:true,side:DoubleSide,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));
  const lines=new LineSegments(new BufferGeometry(),new LineBasicMaterial({vertexColors:true}));
  scene.add(mesh,lines);
  let previous;
  return {
    draw(faces,colorOf,{width,height,dpr,scale,yaw,pitch}){
      if(previous!==faces){
        mesh.geometry.dispose();lines.geometry.dispose();
        mesh.geometry=geometry(faces,false,colorOf);lines.geometry=geometry(faces,true,colorOf);
        previous=faces;
      }
      const w=Math.round(width*dpr),h=Math.round(height*dpr);
      if(renderer.domElement.width!==w || renderer.domElement.height!==h)renderer.setSize(w,h,false);
      camera.left=-width/(2*scale);camera.right=-camera.left;
      camera.top=.65*height/scale;camera.bottom=-.35*height/scale;camera.updateProjectionMatrix();
      const sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
      camera.position.set(-sy*cp*200,sp*200,cy*cp*200);
      camera.up.set(sy*sp,cp,-cy*sp);
      camera.lookAt(0,0,0);
      renderer.render(scene,camera);
      return renderer.domElement;
    },
    dispose(){mesh.geometry.dispose();lines.geometry.dispose();mesh.material.dispose();lines.material.dispose();renderer.dispose();}
  };
}
