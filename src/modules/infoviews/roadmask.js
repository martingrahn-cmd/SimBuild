// Two-metre clearance mask from the public sampled road centre-lines. It keeps
// asphalt, markings and kerbs visible under terrain views; traffic has its own ribbon.
export function roadClearance(roads){
 const size=1025,data=new Float32Array(size*size);data.fill(1);
 const segment=(a,b,r)=>{const x0=Math.max(0,Math.floor((Math.min(a.x,b.x)-r-2+1024)/2)),x1=Math.min(1024,Math.ceil((Math.max(a.x,b.x)+r+2+1024)/2)),z0=Math.max(0,Math.floor((Math.min(a.z,b.z)-r-2+1024)/2)),z1=Math.min(1024,Math.ceil((Math.max(a.z,b.z)+r+2+1024)/2)),dx=b.x-a.x,dz=b.z-a.z,len=dx*dx+dz*dz;
  for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){const x=ix*2-1024,z=iz*2-1024,t=len?Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/len)):0,dist=Math.hypot(x-a.x-t*dx,z-a.z-t*dz),q=Math.max(0,Math.min(1,(dist-r)/2));data[iz*size+ix]=Math.min(data[iz*size+ix],q*q*(3-2*q));}
 };
 for(const edge of roads.edges.values()){const count=Math.max(1,Math.ceil(edge.length/4)),radius=(roads.types[edge.type]?.width??16)/2+.75;let previous=roads.sample(edge.id,0);for(let i=1;i<=count;i++){const next=roads.sample(edge.id,i/count);if(previous&&next)segment(previous,next,radius);previous=next;}}
 return data;
}
export function roadAlpha(data,x,z){const u=Math.max(0,Math.min(1024,(x+1024)/2)),v=Math.max(0,Math.min(1024,(z+1024)/2)),ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz;return(data[iz*1025+ix]*(1-fx)+data[iz*1025+Math.min(ix+1,1024)]*fx)*(1-fz)+(data[Math.min(iz+1,1024)*1025+ix]*(1-fx)+data[Math.min(iz+1,1024)*1025+Math.min(ix+1,1024)]*fx)*fz;}
