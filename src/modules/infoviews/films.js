import * as THREE from 'three';

// Public building plans describe the envelope above record.height as well as the
// footprint. A vertex texture keeps those different envelopes in one instanced draw.
const CAPACITY=1200, WIDTH=512;
const rect=(w,d)=>[[-w/2,d/2],[w/2,d/2],[w/2,-d/2],[-w/2,-d/2]];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function outline(p,w=p.w,d=p.d){
 const x=w/2,z=d/2;
 if(p.chamfer>0){const c=clamp(p.chamfer,.6,Math.min(x,z)*.55);return[[-x+c,z],[x-c,z],[x,z-c],[x,-z+c],[x-c,-z],[-x+c,-z],[-x,-z+c],[-x,z-c]];}
 const cw=clamp(p.cutW??w*.3,2,w*(p.plan==='U'?.4:.55)),cd=clamp(p.cutD??d*.3,2,d*(p.plan==='U'?.5:.55));
 if(p.plan==='L')return[[-x,z],[x,z],[x,-z],[-x+cw,-z],[-x+cw,-z+cd],[-x,-z+cd]];
 if(p.plan==='U')return[[-x,z],[x,z],[x,-z],[x-cw,-z],[x-cw,-z+cd],[-x+cw,-z+cd],[-x+cw,-z],[-x,-z]];
 return rect(w,d);
}
function inset(poly,k){const cx=poly.reduce((s,p)=>s+p[0],0)/poly.length,cz=poly.reduce((s,p)=>s+p[1],0)/poly.length;return poly.map(([x,z])=>{const dx=x-cx,dz=z-cz,l=Math.hypot(dx,dz),s=Math.max(.15,(l-k)/l);return[cx+dx*s,cz+dz*s];});}
function envelope(b,budget){
 const p=b.plan,triangles=[];let offsetX=0,offsetZ=0;
 const tri=(a,c,d)=>triangles.push([a,c,d].map(([x,y,z])=>[x+offsetX,y,z+offsetZ]));
 const quad=(a,c,d,e)=>{tri(a,c,d);tri(a,d,e);};
 const roof=(poly,y)=>{const faces=THREE.ShapeUtils.triangulateShape(poly.map(([x,z])=>new THREE.Vector2(x,z)),[]);for(const [i,j,k]of faces){const a=poly[i],c=poly[j],d=poly[k];const sign=(c[0]-a[0])*(d[1]-a[1])-(c[1]-a[1])*(d[0]-a[0]);tri([a[0],y,a[1]],[...(sign<0?[c[0],y,c[1]]:[d[0],y,d[1]])],[...(sign<0?[d[0],y,d[1]]:[c[0],y,c[1]])]);}};
 const prism=(poly,y,h,top=true)=>{for(let i=0;i<poly.length;i++){const a=poly[i],c=poly[(i+1)%poly.length];quad([a[0],y,a[1]],[c[0],y,c[1]],[c[0],y+h,c[1]],[a[0],y+h,a[1]]);}if(top)roof(poly,y+h);};
 const box=(w,d,y,h)=>prism(rect(w,d),y,h);
 const optional=fn=>{const n=triangles.length;fn();if(triangles.length>budget)triangles.length=n;};
 const crown=(poly,w,d,y)=>{
  if(p.crown==='terrace')for(let i=0;i<3;i++)optional(()=>prism(inset(poly,(1-(.86-i*.2))*Math.min(w,d)*.5),y+i*3.1,3.1+.95));
  else if(p.crown==='parapet_mech'){optional(()=>box(w*.52,d*.52,y,4.2));optional(()=>box(w*.52*.55,d*.52*.55,y+4.2,.8));}
  else if(p.crown==='setback'){optional(()=>box(w*.7,d*.7,y,3.4));optional(()=>box(w*.42,d*.42,y+3.4,2.6));}
  else if(p.crown==='chamfer')optional(()=>prism(outline({chamfer:Math.min(w,d)*.17},w*.94,d*.94),y,3.75));
  else if(p.crown==='spire')for(let i=0;i<5;i++)optional(()=>box(w*.5*(1-i/5)+1.2,d*.5*(1-i/5)+1.2,y+i*2.6,2.6));
 };
 if(!p){box(b.footprint?.w??12,b.footprint?.d??12,0,b.height??10);return triangles;}
 const poly=outline(p),top=(p.groundH??p.floorH)+(p.floors-1)*p.floorH;
 if(p.kind==='house'||p.kind==='town'){
  const h=p.floors*p.floorH;prism(p.kind==='town'?poly:rect(p.w,p.d),0,h,p.roof==='flat');
  if(p.roof==='flat')optional(()=>prism(poly,h,p.parapetH??.5));
  else {const swap=!!p.ridgeAcross,w=(swap?p.d:p.w)+2*(p.overhang??0),d=(swap?p.w:p.d)+2*(p.overhang??0),x=w/2,z=d/2,y=h+(p.pitch??.4)*Math.min(w,d)*.5,S=(x,y,z)=>swap?[z,y,-x]:[x,y,z];
   if(p.roof==='hip'){const r=Math.max(.6,w-d)/2;quad(S(-x,h,z),S(x,h,z),S(r,y,0),S(-r,y,0));quad(S(x,h,-z),S(-x,h,-z),S(-r,y,0),S(r,y,0));tri(S(x,h,z),S(x,h,-z),S(r,y,0));tri(S(-x,h,-z),S(-x,h,z),S(-r,y,0));}
   else{quad(S(-x,h,z),S(x,h,z),S(x,y,0),S(-x,y,0));quad(S(x,h,-z),S(-x,h,-z),S(-x,y,0),S(x,y,0));tri(S(x,h,z),S(x,h,-z),S(x,y,0));tri(S(-x,h,-z),S(-x,h,z),S(-x,y,0));}
  }
 }else if(p.kind==='shop'){
  const units=p.units??1,uw=p.w/units;
  for(let u=0;u<units;u++){const n=clamp(p.floors+(p.unitOff?.[u]??0),1,12),d=p.d*(p.unitDepth?.[u]??1),w=uw-(units>1?.12:0),h=p.groundH+(n-1)*p.floorH,para=p.unitParapet?.[u]??p.parapetH??.5;offsetX=-p.w/2+uw*(u+.5);offsetZ=p.d/2-d/2;const q=outline({chamfer:u===p.tallest?p.chamfer:0},w,d);prism(q,0,h+para);if(u===p.tallest)crown(q,w,d,h+para);}
 }else if(p.kind==='ind'){
  const h=p.wallH??top;
  if(p.roof==='shed'){prism(rect(p.w,p.d),0,h,false);const x=p.w/2+.4,z=p.d/2+.4,r=p.d*.08;quad([-x,h,z],[x,h,z],[x,h+r,-z],[-x,h+r,-z]);tri([x,h,z],[x,h,-z],[x,h+r,-z]);tri([-x,h,-z],[-x,h,z],[-x,h+r,-z]);quad([-x,h,-z],[-x,h+r,-z],[x,h+r,-z],[x,h,-z]);}
  else{prism(poly,0,h+(p.parapetH??0));crown(poly,p.w,p.d,h+(p.parapetH??0));}
 }else{
  // The public plan's setbacks and podium are envelopes, not cosmetic windows.
  let y=0,scale=1,done=0,q=poly;
  if(p.kind==='tower'&&p.podium)optional(()=>prism(outline({chamfer:p.chamfer},p.w+p.podiumOut*2,p.d+p.podiumOut),0,p.groundH+(p.podiumFloors-1)*p.floorH+1));
  if(p.kind==='tower'&&p.steps){for(let i=0;i<=p.steps;i++){const end=i<p.steps?Math.max(2,Math.round(p.floors*p.stepAt[i])):p.floors,n=end-done,h=i?n*p.floorH:p.groundH+(n-1)*p.floorH;q=poly.map(([x,z])=>[x*scale,z*scale]);prism(q,y,h+(i===p.steps?p.parapetH:.9));y+=h;done=end;if(i<p.steps)scale*=1-p.stepIn[i];}}
  else if(p.setback){const low=p.groundH+(p.setbackAt-1)*p.floorH;prism(poly,0,low+1);q=inset(poly,p.setbackIn);prism(q,low,top-low+(p.parapetH??0));y=top;}
  else{prism(poly,0,top+(p.parapetH??0));y=top;}
  crown(q,p.w*scale,p.d*scale,y+(p.parapetH??0));
 }
 if(triangles.length>budget){triangles.length=0;offsetX=offsetZ=0;box(b.footprint?.w??p.w,b.footprint?.d??p.d,0,b.height??p.height??10);}
 return triangles;
}
export function filmGeometry(buildings,triangleBudget){
 const budget=Math.min(96,Math.floor(triangleBudget/Math.max(1,buildings.length))),shapes=buildings.map(b=>envelope(b,budget)),count=Math.max(12,...shapes.map(s=>s.length)),pixels=new Float32Array(WIDTH*CAPACITY*4),position=new Float32Array(count*9),rows=new Float32Array(CAPACITY);
 for(let i=0;i<count*3;i++)position[i*3]=i;
 for(let i=0;i<buildings.length;i++){const b=buildings[i],c=Math.cos(b.heading??0),s=Math.sin(b.heading??0);rows[i]=i;let v=0;for(const t of shapes[i]){const [a,d,e]=t,ux=d[0]-a[0],uy=d[1]-a[1],uz=d[2]-a[2],vx=e[0]-a[0],vy=e[1]-a[1],vz=e[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1;
   // The building frame reverses handedness, hence reversed triangle winding.
   for(const [x,y,z]of [a,e,d]){const lx=x*1.02,ly=y*1.02,lz=z*1.02;pixels.set([b.x+c*lx+s*lz,b.y+ly,b.z+s*lx-c*lz,ny/len],(i*WIDTH+v++)*4);}
  }}
 const texture=new THREE.DataTexture(pixels,WIDTH,CAPACITY,THREE.RGBAFormat,THREE.FloatType);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(position.length),3));geometry.setAttribute('filmRow',new THREE.InstancedBufferAttribute(rows,1));for(const name of ['filmValue','oldFilmValue'])geometry.setAttribute(name,new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY),1));geometry.userData={kind:'infoview-building-envelopes',trianglesPerInstance:count,actualTriangles:shapes.reduce((s,t)=>s+t.length,0),plans:buildings.filter(b=>b.plan).length};return{geometry,texture};
}
