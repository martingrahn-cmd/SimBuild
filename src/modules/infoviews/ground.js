import * as THREE from 'three';

// Refine only cells whose native relief cannot fit beneath an 8 m triangle
// with the permitted lift. Shared 4 m edge vertices stitch refined neighbours.
export function groundGeometry(terrain) {
  const n = 513, heights = new Float32Array(n * n);
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    heights[z * n + x] = terrain.getHeight(x * 4 - 1024, z * 4 - 1024);
  }
  const id = (x, z) => z * n + x;
  const h = (x, z) => heights[id(x, z)];
  const sample = (x, z) => {
    const a = Math.min(511, Math.floor(x)), b = Math.min(511, Math.floor(z));
    const u = x - a, v = z - b;
    return (h(a, b) * (1-u) + h(a+1, b) * u) * (1-v) + (h(a, b+1) * (1-u) + h(a+1, b+1) * u) * v;
  };
  const diagonal = (x, z, size) => h(x,z) + h(x+size,z+size) >= h(x+size,z) + h(x,z+size);
  const triangles = (x,z,size) => {
    const a=id(x,z),b=id(x+size,z),c=id(x,z+size),d=id(x+size,z+size);
    return diagonal(x,z,size) ? [[a,c,d],[a,d,b]] : [[a,c,b],[b,c,d]];
  };
  const deficit = tri => {
    const [a,b,c]=tri, ax=a%n,az=Math.floor(a/n),bx=b%n,bz=Math.floor(b/n),cx=c%n,cz=Math.floor(c/n);
    let error=0;
    // Four subdivisions hit native-cell lines and both triangle centroids.
    for(let i=0;i<=4;i++)for(let j=0;j<=4-i;j++){
      const u=i/4,v=j/4,w=1-u-v,x=ax*w+bx*u+cx*v,z=az*w+bz*u+cz*v;
      error=Math.max(error,sample(x,z)-(heights[a]*w+heights[b]*u+heights[c]*v));
    }
    return error;
  };
  const refine=new Uint8Array(256*256),water=new Uint8Array(256*256);
  for(let z=0;z<256;z++)for(let x=0;x<256;x++){
    const xx=x*2,zz=z*2,k=z*256+x;let high=-Infinity;
    for(let dz=0;dz<=2;dz++)for(let dx=0;dx<=2;dx++) high=Math.max(high,h(xx+dx,zz+dz));
    if(high<terrain.seaLevel-1){water[k]=1;continue;}
    refine[k]=triangles(xx,zz,2).some(t=>deficit(t)>.65)?1:0;
  }
  // A stitched fan can introduce a diagonal that was absent from the original
  // coarse pair. Promote those cells too, until every transition is safe.
  let changed=true;
  while(changed){changed=false;for(let z=0;z<256;z++)for(let x=0;x<256;x++){
    const k=z*256+x,xx=x*2,zz=z*2;if(water[k]||refine[k])continue;
    const north=z>0&&refine[k-256],east=x<255&&refine[k+1],south=z<255&&refine[k+256],west=x>0&&refine[k-1];
    if(!(north||east||south||west))continue;
    const ring=[id(xx,zz)];if(west)ring.push(id(xx,zz+1));ring.push(id(xx,zz+2));if(south)ring.push(id(xx+1,zz+2));ring.push(id(xx+2,zz+2));if(east)ring.push(id(xx+2,zz+1));ring.push(id(xx+2,zz));if(north)ring.push(id(xx+1,zz));
    const centre=id(xx+1,zz+1);if(ring.some((v,j)=>deficit([centre,v,ring[(j+1)%ring.length]])>.65)){refine[k]=1;changed=true;}
  }}
  const list=[],lift=new Float32Array(n*n).fill(.055);
  const emit=tri=>{const e=deficit(tri)+.055;for(const i of tri)lift[i]=Math.max(lift[i],e);list.push(...tri);};
  for(let z=0;z<256;z++)for(let x=0;x<256;x++){
    const k=z*256+x,xx=x*2,zz=z*2;if(water[k])continue;
    if(refine[k]){for(let dz=0;dz<2;dz++)for(let dx=0;dx<2;dx++)for(const tri of triangles(xx+dx,zz+dz,1))emit(tri);continue;}
    const north=z>0&&refine[k-256],east=x<255&&refine[k+1],south=z<255&&refine[k+256],west=x>0&&refine[k-1];
    if(!(north||east||south||west)){for(const tri of triangles(xx,zz,2))emit(tri);continue;}
    const ring=[id(xx,zz)];if(west)ring.push(id(xx,zz+1));ring.push(id(xx,zz+2));if(south)ring.push(id(xx+1,zz+2));ring.push(id(xx+2,zz+2));if(east)ring.push(id(xx+2,zz+1));ring.push(id(xx+2,zz));if(north)ring.push(id(xx+1,zz));
    const centre=id(xx+1,zz+1);for(let j=0;j<ring.length;j++)emit([centre,ring[j],ring[(j+1)%ring.length]]);
  }
  const map=new Int32Array(n*n).fill(-1),positions=[],indices=[];
  for(const i of list){if(map[i]<0){map[i]=positions.length/3;const x=i%n,z=Math.floor(i/n),base=heights[i];let lo=base,hi=base;for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const q=h(Math.max(0,Math.min(512,x+dx)),Math.max(0,Math.min(512,z+dz)));lo=Math.min(lo,q);hi=Math.max(hi,q);}positions.push(x*4-1024,base+Math.min(lift[i],hi-lo<.5?.59:1.48),z*4-1024);}indices.push(map[i]);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();geometry.userData={kind:'infoview-ground',refinedCells:refine.reduce((s,v)=>s+v,0),triangles:indices.length/3};return geometry;
}
