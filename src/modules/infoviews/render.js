import * as THREE from 'three';
import {VIEWS,BY_ID,color,SOURCES} from './views.js';
import {sample} from './data.js';
import {groundGeometry} from './ground.js';
import {DisplayGround} from './display-ground.js';
import {buildingCrops} from './crops.js';
import {filmGeometry} from './films.js';
import {roadClearance,roadAlpha} from './roadmask.js';
const vertex=`
#include <common>
#include <fog_pars_vertex>
attribute float filmValue; attribute float oldFilmValue;
#ifdef FILM_SHAPE
attribute float filmRow;uniform sampler2D filmPositions;
#endif
varying vec2 worldUV;varying float lighting;varying float fv;varying float ov;
void main(){vec4 p=vec4(position,1.);
#ifdef FILM_SHAPE
 vec4 shape=texture2D(filmPositions,vec2((position.x+.5)/512.,(filmRow+.5)/1200.));p=vec4(shape.xyz,1.);
#endif
#ifdef USE_INSTANCING
 p=instanceMatrix*p;
#endif
 vec4 wp=modelMatrix*p;worldUV=(wp.xz+1024.)/2048.;fv=filmValue;ov=oldFilmValue;
 lighting=.72+.28*max(normal.y,0.);vec4 mvPosition=viewMatrix*wp;gl_Position=projectionMatrix*mvPosition;
#ifdef FILM_SHAPE
 lighting=.72+.28*max(shape.w,0.);
#endif
 #include <fog_vertex>
}`;
const fragment=`
#include <common>
#include <fog_pars_fragment>
uniform sampler2D dataNow;uniform sampler2D dataOld;uniform sampler2D rampNow;uniform sampler2D rampOld;uniform sampler2D coast;uniform sampler2D heightMap;uniform sampler2D roadMask;
uniform float mixAmount;uniform float layer;uniform float seaLevel;varying vec2 worldUV;varying float lighting;varying float fv;varying float ov;
void main(){float v=texture2D(dataNow,worldUV).r,o=texture2D(dataOld,worldUV).r;
 if(layer>0.5&&layer<1.5){v=fv;o=ov;}
 vec3 c=mix(texture2D(rampOld,vec2(o,0.5)).rgb,texture2D(rampNow,vec2(v,0.5)).rgb,mixAmount);
 float alpha=1.0;
 if(layer<.5){float land=texture2D(heightMap,(worldUV*512.+.5)/513.).r;alpha*=texture2D(roadMask,(worldUV*1024.+.5)/1025.).r*texture2D(coast,(worldUV*512.+.5)/513.).r*smoothstep(0.,.20,land-seaLevel);if(land<=seaLevel)discard;}
 if(layer>.5&&layer<1.5){alpha=.75;}
 if(layer>1.5){alpha=.96;}
 if(alpha<.002)discard;gl_FragColor=vec4(c,alpha);
 // Environment fog is composited in output colour space; convert exactly once.
 #include <colorspace_fragment>
 if(layer>.5&&layer<1.5)gl_FragColor.rgb*=lighting;
 // Data haze uses the current atmospheric density and height falloff, but an
 // achromatic reference colour. Sky radiance would change the meaning of the ramp.
 #ifdef USE_FOG
  float dataFog;
  #ifdef FOG_EXP2
   vec3 ray=vEnvWorldPos-cameraPosition;
   float k=uEnvFogA.x,dy=ray.y;
   float integral=abs(dy*k)>1e-4?(1.-exp(-dy*k))/(dy*k):1.;
   dataFog=1.-exp(-fogDensity*exp(-max(cameraPosition.y-uEnvFogA.y,0.)*k)*integral*length(ray));
  #else
   dataFog=smoothstep(fogNear,fogFar,vFogDepth);
  #endif
  gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.48),dataFog);
 #endif
}`;
function texture(data,w,h){const t=new THREE.DataTexture(data,w,h,THREE.RedFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t;}
export class Render {
 constructor(ctx,data){this.ctx=ctx;this.data=data;this.active=null;this.shellOn=true;this.meshes=[];this.textures={};for(const v of VIEWS){this.textures[v.id]=texture(data.grids[v.id],256,256);}this.ramps={};const col=new THREE.Color();for(const v of VIEWS){const a=new Float32Array(256*4);for(let i=0;i<256;i++){color(v.id,i/255,col);a.set([col.r,col.g,col.b,1],i*4);}const t=new THREE.DataTexture(a,256,1,THREE.RGBAFormat,THREE.FloatType);t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;this.ramps[v.id]=t;}
 this.heights=new Float32Array(513*513);this.coast=new Float32Array(513*513);this.roadMask=roadClearance(ctx.world.roads);this.roadTex=texture(this.roadMask,1025,1025);this.heightTex=texture(this.heights,513,513);this.coastTex=texture(this.coast,513,513);
 this.uniforms=THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{dataNow:{value:this.textures.landvalue},dataOld:{value:this.textures.landvalue},rampNow:{value:this.ramps.landvalue},rampOld:{value:this.ramps.landvalue},coast:{value:this.coastTex},heightMap:{value:this.heightTex},roadMask:{value:this.roadTex},mixAmount:{value:1},layer:{value:0},seaLevel:{value:ctx.world.terrain.seaLevel}}]);
 this.materials=[0,1,2].map(layer=>{const uniforms={...this.uniforms,layer:{value:layer},filmPositions:{value:null}};return new THREE.ShaderMaterial({name:'Infoview unlit data',vertexShader:vertex,fragmentShader:fragment,defines:layer===1?{FILM_SHAPE:1}:{},uniforms,transparent:true,depthWrite:false,depthTest:true,fog:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,side:layer===1?THREE.FrontSide:THREE.DoubleSide});});
 const geo=new THREE.BufferGeometry();this.ground=this.mesh(new THREE.Mesh(geo,this.materials[0]),24);const surface=ctx.modules.terrain?.displaySurface?.();if(surface?.version===1&&surface.patches.length===3){this.displayGround=new DisplayGround(ctx,surface,this.materials[0],m=>this.mesh(m,24));this.materials.push(this.displayGround.material);}this.film=this.mesh(new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),this.materials[1],1200),36);this.film.count=0;this.film.frustumCulled=false;this.film.geometry.setAttribute('filmValue',new THREE.InstancedBufferAttribute(new Float32Array(1200),1));this.film.geometry.setAttribute('oldFilmValue',new THREE.InstancedBufferAttribute(new Float32Array(1200),1));this.rebuild();this.set(null,true);}
 mesh(m,order){let secondaryRange=null;m.onBeforeRender=(_renderer,_scene,camera)=>{if(!this.displayGround&&camera!==this.ctx.camera.camera){secondaryRange={...m.geometry.drawRange};m.geometry.setDrawRange(0,0);}};m.onAfterRender=()=>{if(secondaryRange){m.geometry.setDrawRange(secondaryRange.start,secondaryRange.count);secondaryRange=null;}};m.layers.set(9);m.renderOrder=order;m.castShadow=m.receiveShadow=false;this.ctx.group.add(m);this.meshes.push(m);return m;}
 rebuild(){const T=this.ctx.world.terrain;for(let iz=0;iz<513;iz++)for(let ix=0;ix<513;ix++){const i=iz*513+ix,x=-1024+ix*4,z=-1024+iz*4;this.heights[i]=T.getHeight(x,z);this.coast[i]=T.isWater(x,z)?0:1;}
 // Eight-metre inland edge band, with conservative nearest-water distance on the native 4 m lattice.
 const dist=new Float32Array(this.coast.length);for(let i=0;i<dist.length;i++)dist[i]=this.coast[i]?1e5:0;
 for(let z=0;z<513;z++)for(let x=0;x<513;x++){const i=z*513+x;if(x)dist[i]=Math.min(dist[i],dist[i-1]+4);if(z)dist[i]=Math.min(dist[i],dist[i-513]+4);if(x&&z)dist[i]=Math.min(dist[i],dist[i-514]+Math.SQRT2*4);if(x<512&&z)dist[i]=Math.min(dist[i],dist[i-512]+Math.SQRT2*4);}
 for(let z=512;z>=0;z--)for(let x=512;x>=0;x--){const i=z*513+x;if(x<512)dist[i]=Math.min(dist[i],dist[i+1]+4);if(z<512)dist[i]=Math.min(dist[i],dist[i+513]+4);if(x<512&&z<512)dist[i]=Math.min(dist[i],dist[i+514]+Math.SQRT2*4);if(x&&z<512)dist[i]=Math.min(dist[i],dist[i+512]+Math.SQRT2*4);this.coast[i]=Math.max(0,Math.min(1,(dist[i]-4)/8));}
 this.ground.geometry.dispose();this.ground.geometry=groundGeometry(T);this.heightTex.needsUpdate=this.coastTex.needsUpdate=true;this.rebuildNetwork();this.rebuildFilms();this.visibility();}
 rebuildFilms(){this.buildings=[...this.ctx.world.buildings.items.values()].slice(0,1200);this.film.count=this.buildings.length;const ground=this.ground.geometry,index=ground.index,triangles=(index?index.count:ground.attributes.position.count)/3;const shape=filmGeometry(this.buildings,260000-triangles-64);this.film.geometry.dispose();this.film.geometry=shape.geometry;this.filmTexture?.dispose();this.filmTexture=shape.texture;this.materials[1].uniforms.filmPositions.value=shape.texture;const identity=new THREE.Matrix4();for(let i=0;i<this.buildings.length;i++)this.film.setMatrixAt(i,identity);this.film.instanceMatrix.needsUpdate=true;this.setFilmValues(this.active??'landvalue',this.active??'landvalue');}
 setFilmValues(now,old){const a=this.film.geometry.attributes.filmValue,b=this.film.geometry.attributes.oldFilmValue;for(let i=0;i<this.buildings.length;i++){const B=this.buildings[i];a.setX(i,sample(this.data.grids[now],B.x,B.z));b.setX(i,sample(this.data.grids[old],B.x,B.z));}a.needsUpdate=b.needsUpdate=true;}
 rebuildNetwork(){this.roadMask=roadClearance(this.ctx.world.roads);this.roadTex.image.data=this.roadMask;this.roadTex.needsUpdate=true;if(this.ribbon){this.ctx.group.remove(this.ribbon);this.ribbon.geometry.dispose();this.meshes.splice(this.meshes.indexOf(this.ribbon),1);}const pos=[],R=this.ctx.world.roads;for(const e of R.edges.values()){const start=Math.max(0,(e.trimA??0)/e.length),end=Math.min(1,1-(e.trimB??0)/e.length),n=Math.max(1,Math.ceil((end-start)*e.length/4));let prev;for(let k=0;k<=n;k++){const p=R.sample(e.id,start+(end-start)*k/n);if(!p)continue;const w=(R.types[e.type]?.width??16)*.62*.5,q=[[p.x+p.normal.x*w,p.y+.30,p.z+p.normal.z*w],[p.x-p.normal.x*w,p.y+.30,p.z-p.normal.z*w]];if(prev)pos.push(...prev[0],...prev[1],...q[0],...q[0],...prev[1],...q[1]);prev=q;}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();this.ribbon=this.mesh(new THREE.Mesh(g,this.materials[2]),26);
 if(!this.markers){this.markers=this.mesh(new THREE.InstancedMesh(new THREE.OctahedronGeometry(5,0),this.materials[2],8),38);const d=new THREE.Object3D();SOURCES.forEach(([,x,z],i)=>{d.position.set(x,this.ctx.world.terrain.getHeight(x,z)+14,z);d.updateMatrix();this.markers.setMatrixAt(i,d.matrix);});this.markers.instanceMatrix.needsUpdate=true;}}
 set(id,instant=false){const old=this.active??id??'landvalue';this.active=id;if(id){this.uniforms.dataNow.value=this.textures[id];this.uniforms.dataOld.value=this.textures[old];this.uniforms.rampNow.value=this.ramps[id];this.uniforms.rampOld.value=this.ramps[old];this.uniforms.mixAmount.value=instant?1:0;this.started=performance.now();this.setFilmValues(id,old);}this.visibility();}
 visibility(){const ground=!!this.active&&(this.active!=='traffic'||!this.ctx.world.roads.edges.size);this.ground.visible=ground&&!this.displayGround;this.displayGround?.setVisible(ground);this.film.visible=!!this.active&&this.shellOn;this.ribbon.visible=this.active==='traffic';this.markers.visible=!!this.active&&['power','water','education','health','fire','crime','garbage'].includes(this.active);}
 upload(id){if(id)this.textures[id].needsUpdate=true;else for(const t of Object.values(this.textures))t.needsUpdate=true;if(this.active)this.setFilmValues(this.active,this.active);}
 update(){this.displayGround?.sync();if(this.active&&this.uniforms.mixAmount.value<1)this.uniforms.mixAmount.value=Math.min(1,(performance.now()-this.started)/300);}
 alpha(x,z){if(!this.ground.visible&&!this.displayGround?.visible)return 0;const u=Math.max(0,Math.min(512,(x+1024)/4)),v=Math.max(0,Math.min(512,(z+1024)/4)),ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz;const bil=a=>(a[iz*513+ix]*(1-fx)+a[iz*513+Math.min(ix+1,512)]*fx)*(1-fz)+(a[Math.min(iz+1,512)*513+ix]*(1-fx)+a[Math.min(iz+1,512)*513+Math.min(ix+1,512)]*fx)*fz;const h=bil(this.heights)-this.ctx.world.terrain.seaLevel;if(h<=0)return 0;const edge=Math.min(1,h/.20);return roadAlpha(this.roadMask,x,z)*bil(this.coast)*edge*edge*(3-2*edge);}
 crops(args){return buildingCrops(this.buildings,args);}
 dispose(){for(const m of this.meshes)m.geometry.dispose();for(const m of this.materials)m.dispose();for(const t of [...Object.values(this.textures),...Object.values(this.ramps),this.heightTex,this.coastTex,this.roadTex,this.filmTexture])t?.dispose();}
}
