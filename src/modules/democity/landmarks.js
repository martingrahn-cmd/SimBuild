import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function createMaterials(ctx){
 const map=ctx.assets.procedural.noiseTexture({size:256,seed:9081,scale:26,octaves:3,lo:205,hi:246,srgb:true});
 const normal=ctx.assets.procedural.noiseNormal({size:256,seed:9073,scale:34,strength:.12});
 const m=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88,metalness:.08,map,normalMap:normal,normalScale:new THREE.Vector2(.18,.18)});
 ctx.modules.environment?.setupMaterial?.(m);return m;
}
export function clearLandmarks(ctx){for(const o of [...ctx.group.children]){o.geometry?.dispose();ctx.group.remove(o);}}
export function buildLandmarks(ctx,plan,material){
 clearLandmarks(ctx);const chunks=new Map(),T=ctx.world.terrain;
 for(const l of plan.landmarks){
  let y=-Infinity;for(const a of[-.5,0,.5])for(const b of[-.5,0,.5])y=Math.max(y,T.getHeight(l.x+a*l.w,l.z+b*l.d));l.y=y+.045;
  const key=`${Math.floor(l.x/128)},${Math.floor(l.z/128)}`,parts=chunks.get(key)||[];chunks.set(key,parts);
  const put=(g,x,h,z,color)=>{g.translate(l.x+x,l.y+h,l.z+z);const c=new THREE.Color(color),arr=new Float32Array(g.attributes.position.count*3);for(let i=0;i<arr.length;i+=3){arr[i]=c.r;arr[i+1]=c.g;arr[i+2]=c.b;}g.setAttribute('color',new THREE.BufferAttribute(arr,3));parts.push(g);};
  const box=(x,h,z,w,d,H,c)=>put(new THREE.BoxGeometry(w,H,d),x,h+H/2,z,c);
  const cyl=(x,h,z,r,H,c,top=r)=>put(new THREE.CylinderGeometry(top,r,H,18),x,h+H/2,z,c);
  box(0,-.4,0,l.w,l.d,.4,0x92958e);
  if(l.kind==='clock tower'){
   box(0,0,0,13,13,8,0x9c7560);box(0,8,0,8,8,28,0xb6a082);box(0,34,0,11,11,6,0xddd4ba);cyl(0,40,0,7,10,0x445956,0);cyl(0,50,0,.45,7,0xb5b8a5);
   for(const a of[-1,1]){box(0,35,a*5.55,4,.08,3.4,0xeee6ce);box(a*5.55,35,0,.08,4,3.4,0xeee6ce);box(0,35.5,a*5.61,.25,.06,2,0x353d3d);}
  }else if(l.kind==='arena'){
   const bowl=new THREE.CylinderGeometry(23,26,8,32);bowl.scale(1,1,.88);put(bowl,0,0,0,0x858d8d);
   const upper=new THREE.CylinderGeometry(21.5,23,4,32,1,true);upper.scale(1,1,.88);put(upper,0,8,0,0xaab0ad);
   const roof=new THREE.RingGeometry(14.3,22.4,48);roof.rotateX(-Math.PI/2);roof.scale(1,1,.88);put(roof,0,12.2,0,0xc5c8c1);
   const roofEdge=new THREE.CylinderGeometry(22.4,22.4,1,48,1,true);roofEdge.scale(1,1,.88);put(roofEdge,0,11.2,0,0x778482);
   const innerLip=new THREE.TorusGeometry(14.3,.25,4,48);innerLip.rotateX(Math.PI/2);innerLip.scale(1,1,.88);put(innerLip,0,12.2,0,0x6f7d7c);
   const field=new THREE.CylinderGeometry(14.5,14.5,.22,32);field.scale(1,1,.72);put(field,0,9.6,0,0x334b43);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,x=Math.sin(a)*18.3,z=Math.cos(a)*16.1,g=new THREE.BoxGeometry(.30,.10,8.1);g.rotateY(a);put(g,x,12.24,z,0x87918f);}
   box(0,9.72,0,20,.14,.04,0xd7d8cb);box(0,9.72,-7.5,10,.14,.04,0xd7d8cb);box(0,9.72,7.5,10,.14,.04,0xd7d8cb);
   for(let i=0;i<20;i++){const a=i*Math.PI*2/20,x=Math.sin(a)*24.2,z=Math.cos(a)*21.3,g=new THREE.BoxGeometry(.48,6.2,1.1);g.rotateY(a);put(g,x,2.2,z,i%2?0x697779:0x53696d);}
   for(let i=-3;i<=3;i++){box(i*5.4,1,22.1,4.1,1.5,4.2,0x29434d);box(i*5.4,5.6,22.5,4.3,.35,3.2,0xb9b8a8);}box(0,5.95,23.6,32,1.0,3.0,0x596b6d);
  }else if(l.kind==='hospital'){
   box(0,0,0,48,24,14,0xc2c7c0);box(-16,0,7,13,30,21,0x939c9b);box(16,0,7,13,30,21,0xa4afaa);
   // The suburban camera sees the north/east elevations. Give those real facade rhythm rather
   // than leaving two full-height blank blocks while the original south ribbons face away.
   for(let h=2;h<13;h+=3){box(0,h,-12.08,46,.1,1.3,0x334c53);box(0,h,12.08,46,.12,1.3,0x334c53);}
   for(const x of[-16,16])for(let h=2;h<20;h+=3.2)box(x,h,22.08,11,.12,1.45,0x29464f);
   for(const x of[-22.58,22.58])for(let h=2;h<20;h+=3.2)box(x,h,7,.12,28,1.45,0x35535a);
   for(const x of[-20,-12,12,20])box(x,1.6,22.16,.22,.18,18.2,0xd4d7cf);
   // Public entrance, sheltered drop-off and a restrained medical mark make the programme legible.
   box(0,0,13.4,12,3.2,5.2,0x31545d);box(0,4.9,15.0,18,5.8,.45,0x657f7e);
   for(const x of[-3.6,0,3.6])box(x,.35,15.08,.14,.12,4.35,0xbfc9c4);
   box(0,8.7,12.18,1.25,.16,4.8,0xc9504d);box(0,10.45,12.2,4.5,.18,1.25,0xc9504d);
   // Connected roof plant and safety parapets remain inside the existing authored footprint.
   box(0,14,0,18,18,.4,0x465e5c);box(0,14.4,-1,11,7,2.7,0x71817f);
   for(const x of[-3.7,3.7])cyl(x,17.1,-1,1.1,1.5,0x526764,.85);
   box(-16,21,7,12.5,29,.35,0x657673);box(16,21,7,12.5,29,.35,0x657673);
   box(-4,14.41,0,1.2,9,.05,0xe5ddbd);box(4,14.41,0,1.2,9,.05,0xe5ddbd);box(0,14.41,0,8,1.2,.05,0xe5ddbd);
  }else if(l.kind==='university'){
   for(const x of[-20,20])box(x,0,0,10,46,13,0x9c6c56);box(0,0,20,50,10,13,0xb69577);box(0,0,-20,50,8,8,0x9a765e);box(0,.02,0,23,23,.04,0x547253);for(let x=-21;x<=21;x+=6)box(x,3,-24.05,2,.1,3,0x293e43);
  }else if(l.kind==='water tower'){
   const beam=(a,b,w,c)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),g=new THREE.BoxGeometry(w,d.length(),w);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));const m=A.add(B).multiplyScalar(.5);put(g,m.x,m.y,m.z,c);};
   for(const x of[-5,5])for(const z of[-5,5])box(x,0,z,1.15,1.15,23,0x66797b);
   // Real cross-bracing and a central riser give the support frame depth from the suburb camera.
   for(const z of[-5,5]){beam([-5,2,z],[5,11,z],.42,0x52676a);beam([5,2,z],[-5,11,z],.42,0x52676a);beam([-5,12,z],[5,21,z],.42,0x52676a);beam([5,12,z],[-5,21,z],.42,0x52676a);}
   for(const x of[-5,5]){beam([x,2,-5],[x,11,5],.38,0x52676a);beam([x,2,5],[x,11,-5],.38,0x52676a);}
   cyl(0,0,0,1.05,23,0x50686b);
   // Flared bowl, banded tank, catwalk and roof replace the single blank cylinder.
   cyl(0,21,0,6.2,3.2,0x91a7a7,9.6);cyl(0,24.2,0,9.6,7.1,0xb8c7c6);cyl(0,27.5,0,9.72,1.0,0x54777a);
   const ring=new THREE.TorusGeometry(10.2,.22,4,28);ring.rotateX(Math.PI/2);put(ring,0,27.2,0,0x415b5f);
   for(let i=0;i<12;i++){const a=i*Math.PI/6;box(Math.sin(a)*10.15,27.1,Math.cos(a)*10.15,.22,.22,1.45,0x415b5f);}
   cyl(0,32.3,0,9.55,3.3,0x6f898c,.75);cyl(0,35.6,0,.7,1.1,0x435a5d,.5);
   // Ladder and maintenance landing face the public road/camera side.
   for(const x of[-.7,.7])box(x,1,6.25,.18,.24,26.5,0x364d52);
   for(let h=2;h<27;h+=1.6)box(0,h,6.22,1.55,.2,.14,0x51696d);
   box(0,22.2,7.25,3.7,2.4,.32,0x50666a);
  }else if(l.kind==='power plant'){
   box(0,0,15,50,19,10,0x9a9790);for(const x of[-13,13]){cyl(x,0,-8,10,14,0xaeb3ac,7);cyl(x,14,-8,7,15,0xb9bdb3,10);cyl(x,29,-8,10,.5,0x525c59);}
  }else if(l.kind==='silo'){
   cyl(0,0,0,6,23,0xbfc6bf);cyl(0,23,0,6,4,0x819395,0);
   for(let h=3;h<22;h+=5)cyl(0,h,0,6.12,.2,0x7f9394);
   // Fixed seams, access ladder, landing and roof vent articulate the existing saved vessel.
   // Every part stays inside its 14x18m landmark footprint and the same merged owner chunk.
   for(const a of[-1,1]){box(a*6.08,.5,0,.16,.2,21.8,0x738889);box(0,.5,a*6.08,.2,.16,21.8,0x738889);}
   for(const x of[-.58,.58])box(x,.6,6.16,.16,.22,22.6,0x465b5e);
   for(let h=1.2;h<23;h+=1.45)box(0,h,6.22,1.35,.18,.12,0x526a6d);
   box(0,22.4,6.65,2.9,1.35,.26,0x526a6d);
   for(const x of[-1.25,1.25])box(x,22.65,6.8,.14,.14,1.15,0x465b5e);
   box(0,23.65,7.38,2.65,.12,.14,0x465b5e);
   cyl(0,27,0,1.05,1.35,0x52696b,.72);
  }
  else if(l.kind==='stack'){cyl(0,0,0,3.7,38,0x8f776a,2.5);cyl(0,29,0,2.9,4,0xc4b6a0,2.7);}
  else if(l.kind==='crane'){
   const beam=(a,b,w,c)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),g=new THREE.BoxGeometry(w,d.length(),w);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize()));const m=A.add(B).multiplyScalar(.5);put(g,m.x,m.y,m.z,c);};
   // Four-legged portal frame with side bracing replaces the flat two-post silhouette.
   for(const x of[-7,7])for(const z of[-3.5,3.5])box(x,0,z,1.15,1.15,27,0xc4a25d);
   for(const z of[-3.5,3.5]){box(0,25,z,19,1.7,2.2,0xc4a25d);beam([-7,2,z],[7,18,z],.48,0xa98242);beam([7,2,z],[-7,18,z],.48,0xa98242);}
   for(const x of[-7,7])box(x,21,0,1.5,9,1.4,0xa98242);
   // Boom, kingpost, counterweight and tension stays form a readable working crane.
   box(0,28,-9,2,40,2,0xc4a25d);box(0,27,8,5.8,7,3.2,0x876f42);
   box(0,29,-1,2.2,2.2,7.5,0xc4a25d);beam([0,36,-1],[0,29,-28],.38,0x6d684e);beam([0,36,-1],[0,29,10],.38,0x6d684e);
   box(0,25,-5,5.5,5.5,4.3,0x405c67);box(0,24.8,-5.2,4.4,.12,2.7,0x9bb4b1);
   // Real trolley, twin hoist lines and spreader at the water-facing end.
   box(0,26.8,-23,3.5,3.2,1.4,0x705f3e);for(const x of[-.65,.65])box(x,12.5,-23,.16,.16,14.2,0x454e50);box(0,12,-23,5.8,1.2,.7,0x343f43);
   for(const x of[-7,7])box(x,-.05,0,2.4,10,.45,0x6b7775);
  }else if(l.kind==='apron'){
   // The saved apron landmark is a working quay surface, not an empty pale slab. Keep every piece
   // inside its existing footprint and merged owner chunk: a darker hardstand, a quay beam, marked
   // loading lanes, wheel stops and fixed mooring bollards give the real record physical purpose.
   box(0,0,0,l.w,l.d,.12,0x777d78);
   box(0,.12,-l.d/2+.55,l.w-1.2,1.1,.42,0x4c5a5b);
   box(0,.12,l.d/2-.55,l.w-1.2,1.1,.24,0x858d86);
   for(let i=-2;i<=2;i++){
    const x=i*7;
    box(x,.125,0,.16,l.d-3.2,.035,0xd5b85f);
    box(x,.16,l.d/2-2.2,4.5,.72,.34,0x3f4a4b);
   }
   for(let x=-l.w/2+3;x<l.w/2-2;x+=6.5)cyl(x,.54,-l.d/2+1.15,.28,.55,0x39494b,.28);
  }
 }
 let triangles=0;
 for(const [key,parts]of chunks){if(!parts.length)continue;const g=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!g)continue;g.computeBoundingSphere();const m=new THREE.Mesh(g,material);m.name=`Lindham landmarks ${key}`;m.castShadow=m.receiveShadow=true;ctx.group.add(m);triangles+=(g.index?.count??g.attributes.position.count)/3;}
 return {drawCalls:ctx.group.children.length,triangles,trees:0,lamps:0,parked:0,vehicles:0,buses:0};
}
