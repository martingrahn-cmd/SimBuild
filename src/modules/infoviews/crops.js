// Only project front-facing faces wholly in front of the camera. The debug
// projector returns [pixelX,pixelY,ndcZ]; the third component is essential.
export function buildingCrops(buildings, {project, width, height, camera}) {
  const eye=(camera.camera??camera).position;
  const rect=points=>{
    const p=points.map(q=>project(...q));
    if(p.some(q=>!q||!q.every(Number.isFinite)||q[2]<-1||q[2]>1))return null;
    const xs=p.map(q=>q[0]),ys=p.map(q=>q[1]);
    const x=Math.max(0,Math.min(...xs)+3),y=Math.max(0,Math.min(...ys)+3);
    const r=Math.min(width,Math.max(...xs)-3),b=Math.min(height,Math.max(...ys)-3);
    return r>x&&b>y?[Math.round(x),Math.round(y),Math.round(r-x),Math.round(b-y)]:null;
  };
  const boxes=[];
  for(const b of buildings){
    const w=(b.footprint?.w??12)/2,d=(b.footprint?.d??12)/2,h=b.height??10;
    const c=Math.cos(b.heading??0),s=Math.sin(b.heading??0);
    const p=(x,y,z)=>[b.x+c*x+s*z,b.y+y,b.z+s*x-c*z];
    if(eye.y<=b.y+h)continue;
    const roof=rect([p(-w,h,-d),p(w,h,-d),p(w,h,d),p(-w,h,d)]);
    if(!roof)continue;
    const candidates=[
      {centre:p(0,h*.5,-d),normal:[-s,c],pts:[p(-w,0,-d),p(w,0,-d),p(w,h,-d),p(-w,h,-d)]},
      {centre:p(w,h*.5,0),normal:[c,s],pts:[p(w,0,-d),p(w,0,d),p(w,h,d),p(w,h,-d)]},
      {centre:p(0,h*.5,d),normal:[s,-c],pts:[p(-w,0,d),p(w,0,d),p(w,h,d),p(-w,h,d)]},
      {centre:p(-w,h*.5,0),normal:[-c,-s],pts:[p(-w,0,-d),p(-w,0,d),p(-w,h,d),p(-w,h,-d)]}
    ].filter(f=>(eye.x-f.centre[0])*f.normal[0]+(eye.z-f.centre[2])*f.normal[1]>0)
      .map(f=>rect(f.pts)).filter(Boolean).sort((a,b)=>b[2]*b[3]-a[2]*a[3]);
    if(!candidates.length)continue;
    const wall=candidates[0];boxes.push({id:b.id,roof,wall,area:Math.max(roof[2]*roof[3],wall[2]*wall[3])});
  }
  boxes.sort((a,b)=>b.area-a.area||String(a.id).localeCompare(String(b.id)));
  const out={};for(const b of boxes.slice(0,10)){out['roof.'+b.id]=b.roof;out['wall.'+b.id]=b.wall;}return out;
}
