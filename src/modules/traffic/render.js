import * as THREE from 'three';
import {buildVehicleGeometry,buildPedestrianGeometry} from './geometry.js';
import {createVehicleMaterial,createVehicleDepthMaterial,createPedestrianMaterial} from './materials.js';
const obj=new THREE.Object3D(),v3=new THREE.Vector3(),sphere=new THREE.Sphere(),vp=new THREE.Matrix4(),frustum=new THREE.Frustum(),colour=new THREE.Color();
function attr(g,name,size,cap){const a=new THREE.InstancedBufferAttribute(new Float32Array(cap*size),size);a.setUsage(THREE.DynamicDrawUsage);g.setAttribute(name,a);return a;}
function mesh(t,g,m,cap,name,shadow=true){const a=new THREE.InstancedMesh(g,m,cap);a.name=name;a.count=0;a.frustumCulled=false;a.castShadow=shadow;a.receiveShadow=true;a.layers.enable(5);a.renderOrder=50;a.instanceMatrix.setUsage(THREE.DynamicDrawUsage);t.group.add(a);return a;}
function decalMaterial(pool){
 const m=new THREE.MeshBasicMaterial({color:pool?0xffffff:0x000000,transparent:true,opacity:1,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-8,blending:pool?THREE.AdditiveBlending:THREE.NormalBlending});m.name=pool?'traffic:pools':'traffic:contact';
 m.onBeforeCompile=sh=>{sh.vertexShader='varying vec2 vDecal;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDecal=uv;');sh.fragmentShader='varying vec2 vDecal;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\nvec2 q=vDecal*2.-1.;\n${pool?'float a=pow(max(0.,1.-abs(q.x)),1.8)*smoothstep(0.,.14,vDecal.y)*pow(1.-vDecal.y,1.7);':'float a=smoothstep(1.,.27,length(q))*.55;'}\ndiffuseColor.a*=a;`);};m.customProgramCacheKey=()=>pool?'traffic-pool-2':'traffic-contact-2';return m;
}
export function buildMeshes(maxVehicles,maxPeds){
 this.visible={vehicles:true,pedestrians:true,pools:true,lamps:true,masts:true,shadows:true};this.forcedLod=null;this.showcaseCatalogue=false;this.byLod={0:0,1:0,2:0};this.byKindTris={};this.batches=[];
 this.vehMat=createVehicleMaterial();this.depthMat=createVehicleDepthMaterial();this.pedMat=createPedestrianMaterial();this.poolMat=decalMaterial(true);this.contactMat=decalMaterial(false);
 for(const m of [this.vehMat,this.pedMat,this.poolMat,this.contactMat])this.ctx.modules.environment?.setupMaterial?.(m);
 for(let ci=0;ci<this.mix.length;ci++){
  const kind=this.mix[ci][0],lods=[];
  for(let lod=0;lod<3;lod++){
   const d=buildVehicleGeometry(kind,lod),g=d.geometry,cap=maxVehicles;
   const articulation=attr(g,'aArticulation',1,cap),paint=attr(g,'aPaint',3,cap),lights=attr(g,'aLights',2,cap),spin=attr(g,'aSpin',1,cap);
   const m=mesh(this,g,this.vehMat,cap,`traffic:${kind}:lod${lod}`);m.customDepthMaterial=this.depthMat;
   // The paint attribute is also published as an instance colour for colour-distribution probes.
   m.instanceColor=paint;
   const b={mesh:m,articulation,paint,lights,spin,cap,count:0,tris:d.tris};lods.push(b);this.batches.push(b);
   if(!lod){this.byKindTris[kind]=d.tris;this.classes.push({kind,spec:d.spec,mesh:m,lods,cap:maxVehicles,count:0,big:['box_truck','semi','bus'].includes(kind)});this.tris+=d.tris;}
  }
 }
 this.pedLods=[];
 for(let lod=0;lod<2;lod++){const d=buildPedestrianGeometry(lod),g=d.geometry,cap=maxPeds;const shirt=attr(g,'aShirt',3,cap),pants=attr(g,'aPants',3,cap),tone=attr(g,'aTone',2,cap),walk=attr(g,'aWalk',2,cap);const m=mesh(this,g,this.pedMat,cap,`traffic:pedestrians:lod${lod}`);const b={mesh:m,shirt,pants,tone,walk,cap,count:0,tris:d.tris};this.pedLods.push(b);this.batches.push(b);}
 this.pedMesh={cap:maxPeds};
 this.catalogue=this.classes.map((c,i)=>{const x=-260+(i-(this.classes.length-1)/2)*3;return {x,z:43-c.spec.L/2,ci:i,paint:c.kind==='police'?[.04,.055,.085]:c.kind==='taxi'?[.86,.62,.05]:[.1+.07*(i%4),.15+.11*(i%5),.12+.14*(i%3)]};});
 const plane=new THREE.PlaneGeometry(1,1);plane.rotateX(-Math.PI/2);
 this.pools=mesh(this,plane,this.poolMat,maxVehicles*2,'traffic:pools',false);this.pools.renderOrder=52;
 this.contacts=mesh(this,plane.clone(),this.contactMat,maxVehicles+maxPeds,'traffic:contacts',false);this.contacts.renderOrder=50;
 // Compile the coloured pool variant on the first frame, including when there are no cars yet.
 this.pools.setColorAt(0,colour.setRGB(0,0,0));
 this.flowApi={size:256,cellSize:8,congestion:this.flow,version:0,index(x,z){const ix=Math.floor((x+1024)/8),iz=Math.floor((z+1024)/8);return ix<0||iz<0||ix>=256||iz>=256?-1:iz*256+ix;},sample(name,x,z){const i=this.index(x,z);return name==='congestion'&&i>=0?this.congestion[i]:0;}};
 this.flowSums=new Float32Array(65536);this.flowCounts=new Uint16Array(65536);this._lastFlowClock=0;
}
function writeMatrix(m,i,x,y,z,tx,tz,pitch,sx=1,sy=1,sz=1){
 const inv=1/Math.hypot(1,pitch),fx=tx*inv,fy=pitch*inv,fz=tz*inv,h=Math.hypot(fx,fz)||1,a=m.instanceMatrix.array,o=i*16;
 a[o]=-fz/h*sx;a[o+1]=0;a[o+2]=fx/h*sx;a[o+3]=0;
 a[o+4]=-fx*fy/h*sy;a[o+5]=h*sy;a[o+6]=-fz*fy/h*sy;a[o+7]=0;
 a[o+8]=-fx*sz;a[o+9]=-fy*sz;a[o+10]=-fz*sz;a[o+11]=0;
 a[o+12]=x;a[o+13]=y;a[o+14]=z;a[o+15]=1;
}
export function render(alpha=1){
 const g=this.g,cam=this.ctx.camera.camera,cp=cam.position,out=this._p,out2=this._q;
 vp.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);
 for(const b of this.batches)b.count=0;this.byLod[0]=this.byLod[1]=this.byLod[2]=0;
 let cn=0,poolN=0,speedSum=0,limitSum=0,queued=0;this.maxBrake=0;this.draws=0;this.submittedTris=0;
 for(const k of Object.keys(this.stats.byKind))this.stats.byKind[k]=0;
 this.flowSums.fill(0);this.flowCounts.fill(0);
 for(const v of this.vehicles.values()){
  const rec=v.rec;
  this.pose(v);v.lightsOn=!!this.lightsOn;
  const prev=v.previous??v,heading=prev.heading+Math.atan2(Math.sin(v.heading-prev.heading),Math.cos(v.heading-prev.heading))*alpha;
  const rx=prev.x+(v.x-prev.x)*alpha,ry=prev.y+(v.y-prev.y)*alpha,rz=prev.z+(v.z-prev.z)*alpha;
  out.tx=Math.sin(heading);out.tz=-Math.cos(heading);
  speedSum+=v.v;limitSum+=rec.speed;this.stats.byKind[v.kind]++;if(v.v<.7)queued++;this.maxBrake=Math.max(this.maxBrake,v.brake);
  const cell=this.flowApi.index(v.x,v.z);if(cell>=0){this.flowSums[cell]+=Math.max(0,1-v.v/rec.speed);this.flowCounts[cell]++;}
  const dist=Math.hypot(v.x-cp.x,v.y-cp.y,v.z-cp.z);sphere.center.set(v.x,v.y+1,v.z);sphere.radius=v.half+3;
  if(dist>1200||!frustum.intersectsSphere(sphere)||!this.visible.vehicles)continue;
  const lod=this.forcedLod??(dist<=90?0:dist<=420?1:2),cls=this.classes[v.ci],b=cls.lods[lod],i=b.count++;
  v.lod=lod;v.slot=i;this.byLod[lod]++;
  writeMatrix(b.mesh,i,rx,ry,rz,out.tx,out.tz,v.pitch);
  const a=b.paint.array;a[i*3]=v.paint[0];a[i*3+1]=v.paint[1];a[i*3+2]=v.paint[2];b.spin.array[i]=v.spin;b.articulation.array[i]=v.articulation??0;b.lights.array[i*2]=this.visible.lamps?this.lightsOn:0;b.lights.array[i*2+1]=this.visible.lamps?v.brake:0;
  if(dist<260&&this.visible.shadows){writeMatrix(this.contacts,cn++,rx,ry+.012,rz,out.tx,out.tz,0,cls.spec.HW*2+1,1,v.len+1);}
  if(this.lightsOn&&this.visible.pools&&dist<220){
   const length=14,front=v.half+length/2+.2;
   writeMatrix(this.pools,poolN,rx+out.tx*front,ry+.015,rz+out.tz*front,out.tx,out.tz,0,4,1,length);this.pools.setColorAt(poolN++,colour.setRGB(.78,.70,.52));
   const rear=v.half+3.5,glow=.10+v.brake*.38;
   writeMatrix(this.pools,poolN,rx-out.tx*rear,ry+.015,rz-out.tz*rear,-out.tx,-out.tz,0,3,1,7);this.pools.setColorAt(poolN++,colour.setRGB(glow,.009,.004));
  }
 }
 // Parked catalogue specimens share the same authored geometry and instance batches.
 if(this.showcaseCatalogue&&this.target>0&&this.visible.vehicles)for(const c of this.catalogue){
   const d=Math.hypot(c.x-cp.x,c.z-cp.z);if(d>95)continue;
   const road=this.world.roads.nearestEdge(c.x,c.z,30);if(!road)continue;
   const b=this.classes[c.ci].lods[this.forcedLod??0],i=b.count++,y=road.point.y+.08;
   writeMatrix(b.mesh,i,c.x,y,c.z,0,-1,0);this.byLod[this.forcedLod??0]++;
   for(let j=0;j<3;j++)b.paint.array[i*3+j]=c.paint[j];b.lights.array[i*2]=this.visible.lamps?this.lightsOn:0;b.lights.array[i*2+1]=0;b.spin.array[i]=0;b.articulation.array[i]=0;
   if(this.visible.shadows)writeMatrix(this.contacts,cn++,c.x,y+.012,c.z,0,-1,0,this.classes[c.ci].spec.HW*2+1,1,this.classes[c.ci].spec.L+1);
 }
 for(const p of this.peds){
  const dist=Math.hypot(p.x-cp.x,p.y-cp.y,p.z-cp.z);sphere.center.set(p.x,p.y+.9,p.z);sphere.radius=1;
  if(dist>220||!frustum.intersectsSphere(sphere)||!this.visible.pedestrians)continue;
  // Resolve the spec's unassigned 160–220 m band by extending pedestrian LOD1.
  const lod=this.forcedLod===0?0:this.forcedLod!==null?1:dist<=60?0:1,b=this.pedLods[lod],i=b.count++;
  const tx=Math.sin(p.heading),tz=-Math.cos(p.heading);writeMatrix(b.mesh,i,p.x,p.y,p.z,tx,tz,0,p.scale,p.scale,p.scale);
  for(let j=0;j<3;j++){b.shirt.array[i*3+j]=p.shirt[j];b.pants.array[i*3+j]=p.pants[j];}b.tone.array[i*2]=p.tone[0];b.tone.array[i*2+1]=p.tone[1];b.walk.array[i*2]=p.phase*Math.PI*2;b.walk.array[i*2+1]=p.speed>.1?.45:0;
  if(this.visible.shadows)writeMatrix(this.contacts,cn++,p.x,p.y+.012,p.z,tx,tz,0,.65,1,.65);
 }
 for(const b of this.batches){b.mesh.count=b.count;b.mesh.castShadow=this.visible.shadows;b.mesh.instanceMatrix.needsUpdate=true;for(const name of ['articulation','paint','lights','spin','shirt','pants','tone','walk'])if(b[name])b[name].needsUpdate=true;if(b.count){this.draws++;this.submittedTris+=b.count*b.tris;}}
 this.contacts.count=cn;this.contacts.instanceMatrix.needsUpdate=true;this.pools.count=poolN;this.pools.instanceMatrix.needsUpdate=true;this.pools.instanceColor.needsUpdate=true;
 if(cn){this.draws++;this.submittedTris+=cn*2;}if(poolN){this.draws++;this.submittedTris+=poolN*2;}
 const clock=(this.world.time.day*24+this.world.time.hour)*3600,decay=Math.pow(.5,Math.max(0,clock-this._lastFlowClock)/1800);this._lastFlowClock=clock;
 for(let i=0;i<this.flow.length;i++)this.flow[i]=this.flowCounts[i]?this.flowSums[i]/this.flowCounts[i]:this.flow[i]*decay;this.flowApi.version++;
 this.stats.count=this.vehicles.size;this.stats.avgSpeed=this.vehicles.size?speedSum/this.vehicles.size:0;this.stats.congestion=limitSum?Math.max(0,Math.min(1,1-speedSum/limitSum)):0;this.stats.queued=queued;this.stats.pedestrians=this.peds.length;
 Object.assign(this.world.traffic.stats,this.stats);
}
export function dispose(){this.group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const m of [this.vehMat,this.depthMat,this.pedMat,this.poolMat,this.contactMat])m?.dispose();this.ctx.group.remove(this.group);this.world.traffic.vehicles.clear();this.world.traffic.pedestrians.clear();}
