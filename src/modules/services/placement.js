import { CATALOG } from './catalog.js';
export function localPoint(item,x,z) {
 const c=Math.cos(item.heading),s=Math.sin(item.heading),dx=x-item.x,dz=z-item.z;
 return [c*dx-s*dz,s*dx+c*dz];
}
export function contains(item,x,z,pad=0) {const f=item.footprint||CATALOG[item.kind]?.footprint;if(!f)return false;const p=localPoint(item,x,z);return Math.abs(p[0])<=f.w/2+pad&&Math.abs(p[1])<=f.d/2+pad;}
export function point(item,x,z) {const c=Math.cos(item.heading),s=Math.sin(item.heading);return {x:item.x+c*x+s*z,z:item.z-s*x+c*z};}
export function intersects(a,b) {
 const fa=a.footprint||CATALOG[a.kind]?.footprint,fb=b.footprint||CATALOG[b.kind]?.footprint;if(!fa||!fb)return false;
 const ca=Math.cos(a.heading),sa=Math.sin(a.heading),cb=Math.cos(b.heading),sb=Math.sin(b.heading);
 const axes=[[ca,-sa],[sa,ca],[cb,-sb],[sb,cb]],dx=b.x-a.x,dz=b.z-a.z;
 for(const [x,z]of axes){const ra=Math.abs(x*ca-z*sa)*fa.w/2+Math.abs(x*sa+z*ca)*fa.d/2,rb=Math.abs(x*cb-z*sb)*fb.w/2+Math.abs(x*sb+z*cb)*fb.d/2;if(Math.abs(dx*x+dz*z)>=ra+rb-.01)return false;}return true;
}
export function heights(ctx,item) {
 const f=CATALOG[item.kind].footprint,T=ctx.world.terrain;let min=Infinity,max=-Infinity;
 for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){const p=point(item,(i/4-.5)*f.w,(j/4-.5)*f.d),h=T.getHeight(p.x,p.z);min=Math.min(min,h);max=Math.max(max,h);}
 return {min,max};
}
export function waterDistance(ctx,x,z) {const T=ctx.world.terrain;if(T.isWater(x,z))return 0;for(let r=4;r<=100;r+=4)for(let a=0;a<32;a++){const t=a*Math.PI/16;if(T.isWater(x+Math.cos(t)*r,z+Math.sin(t)*r))return r;}return Infinity;}
export function validate(ctx,kind,x,z,heading=0,ignoreId=null) {
 const item={kind,x,z,heading},f=CATALOG[kind]?.footprint,T=ctx.world.terrain,R=ctx.world.roads;
 const result={ok:false,reason:'overlap',x,z,y:0,heading,slope:0,frontage:null};
 if(!f||!Number.isFinite(x+z+heading))return result;
 const h=heights(ctx,item);result.y=h.max+.04;result.slope=T.getSlope(x,z);
 for(const a of[-1,1])for(const b of[-1,1]){const p=point(item,a*f.w/2,b*f.d/2);if(T.isWater(p.x,p.z)){result.reason='water';return result;}}
 if(kind==='sewage'&&waterDistance(ctx,x,z)>60){result.reason='water';return result;}
 if(h.max-h.min>4||result.slope>.35){result.reason='slope';return result;}
 for(const other of ctx.world.services.items.values())if(other.id!==ignoreId&&intersects(item,other))return result;
 for(const other of ctx.world.buildings.items.values())if(intersects(item,other))return result;
 for(const other of ctx.world.zones.lots.values())if(intersects(item,{...other,footprint:{w:other.w,d:other.d}}))return result;
 // Sample throughout, not only corners: a road can cross the middle of a large campus.
 for(let j=-f.d/2;j<=f.d/2;j+=3)for(let i=-f.w/2;i<=f.w/2;i+=3){const p=point(item,i,j);if(R.isRoad?.(p.x,p.z))return result;}
 if(R.nodes.size){const front=point(item,0,-f.d/2),hit=R.nearestEdge(front.x,front.z,40);if(!hit){result.reason='no_frontage';return result;}const q=localPoint(item,hit.point.x,hit.point.z);if(q[1]>-f.d/2+.5){result.reason='no_frontage';return result;}result.frontage={edgeId:hit.edge.id,t:hit.t,distance:hit.dist};}
 result.ok=true;result.reason=null;return result;
}
