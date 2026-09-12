import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const mat4=new THREE.Matrix4(),obj=new THREE.Object3D(),color=new THREE.Color();
export function buildMasts(S){
 S.masts?.dispose();const pieces=[],heads=[],g=new THREE.Group();g.name='traffic:masts';
 const add=(geo,x,y,z,heading,hex)=>{obj.position.set(x,y,z);obj.rotation.set(0,heading,0);obj.scale.set(1,1,1);obj.updateMatrix();geo.applyMatrix4(obj.matrix);const a=new Float32Array(geo.attributes.position.count*3);color.setHex(hex);for(let i=0;i<a.length;i+=3){a[i]=color.r;a[i+1]=color.g;a[i+2]=color.b;}geo.setAttribute('color',new THREE.BufferAttribute(a,3));pieces.push(geo);};
 for(const s of S.graph.signals.values())for(const arm of s.arms){const rec=S.graph.edges.get(arm.edgeId);if(!rec)continue;const p=S.ctx.world.roads.sample(rec.id,arm.stopT);if(!p)continue;const ax=arm.atA?rec.dirA.x:rec.dirB.x,az=arm.atA?rec.dirA.z:rec.dirB.z;const type=S.ctx.world.roads.types[rec.type];const off=(type.asphaltHalf??5)+.65,x=p.x+az*off,z=p.z-ax*off,y=p.y+.21,heading=Math.atan2(-ax,az);
  add(new THREE.CylinderGeometry(.065,.09,5.6,8),x,y+2.8,z,0,0x738087);
  add(new THREE.BoxGeometry(.44,1.17,.29),x,y+5,z,heading,0x141d20);
  add(new THREE.BoxGeometry(.3,.43,.24),x,y+2.45,z,heading,0x172023);
  for(let l=0;l<3;l++)heads.push({s,arm,l,x:x+ax*.158,y:y+5.35-l*.35,z:z+az*.158,heading});
 }
 const metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.48,metalness:.62});metal.name='traffic:mast';S.ctx.modules.environment?.setupMaterial?.(metal);
 const geometry=pieces.length?mergeGeometries(pieces):new THREE.BufferGeometry();for(const p of pieces)p.dispose();
 const mesh=new THREE.Mesh(geometry,metal);mesh.castShadow=true;mesh.receiveShadow=true;mesh.layers.enable(5);mesh.renderOrder=50;g.add(mesh);
 const lensMat=new THREE.MeshStandardMaterial({color:0x0a0a0a,emissive:0xffffff,emissiveIntensity:7.5,roughness:.32});lensMat.name='traffic:mast:lens';lensMat.onBeforeCompile=sh=>{sh.vertexShader='varying vec3 vTrafficSignal;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvTrafficSignal=instanceColor;');sh.fragmentShader='varying vec3 vTrafficSignal;\n'+sh.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vTrafficSignal;');};lensMat.customProgramCacheKey=()=> 'traffic-signal-3';S.ctx.modules.environment?.setupMaterial?.(lensMat);
 const lg=new THREE.CircleGeometry(.14,12),lens=new THREE.InstancedMesh(lg,lensMat,Math.max(1,heads.length));lens.count=heads.length;lens.frustumCulled=false;lens.layers.enable(5);lens.renderOrder=50;lens.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 // Initialise colour before the first render so three compiles the correct instancing variant.
 for(let i=0;i<Math.max(1,heads.length);i++)lens.setColorAt(i,color.setRGB(0,0,0));g.add(lens);S.ctx.group.add(g);
 S.masts={g,mesh,lens,heads,visible:false,draws:0,tris:0,dispose(){S.ctx.group.remove(g);geometry.dispose();lg.dispose();metal.dispose();lensMat.dispose();}};
 mastGate(S);updateMasts(S);
}
export function mastGate(S){if(!S.masts)return;let props=false;for(const p of S.ctx.world.props.items.values())if(p.kind==='trafficlight'){props=true;break;}S.masts.visible=typeof S.ctx.modules.props?.signalFor!=='function'&&!props;S.masts.g.visible=S.masts.visible&&S.traffic.visible.masts;}
export function updateMasts(S){const m=S.masts;if(!m)return;mastGate(S);m.draws=m.g.visible&&m.heads.length?2:0;m.tris=m.draws?m.mesh.geometry.index?.count/3+m.heads.length*12:0;
 if(!m.g.visible)return;
 for(let i=0;i<m.heads.length;i++){const h=m.heads[i],s=h.s;let state=s.state==='green'&&h.arm.phase===s.phase?2:s.state==='yellow'&&h.arm.phase===s.phase?1:0;const active=h.l===state;obj.position.set(h.x,h.y,h.z);obj.rotation.set(0,h.heading,0);obj.scale.set(1,1,1);obj.updateMatrix();m.lens.setMatrixAt(i,obj.matrix);color.setRGB(active?(state===2?.015:1):.001,active?(state===2?1:state===1?.3:.008):.001,active?.008:.001);m.lens.setColorAt(i,color);}
 m.lens.instanceMatrix.needsUpdate=true;if(m.lens.instanceColor)m.lens.instanceColor.needsUpdate=true;m.mesh.castShadow=S.traffic.visible.shadows;
}
