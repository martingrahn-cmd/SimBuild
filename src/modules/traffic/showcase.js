// A dedicated traffic network, staged only through the public road contract.
export const CAMERAS = {
  junction: {position:[96,34,100],target:[40,1,40]},
  queue: {position:[40,2.2,86],target:[40,1.2,30]},
  merge: {position:[470,30,130],target:[345,12,222]},
  roundabout: {position:[-200,62,46],target:[-200,1,-40]},
  crossing: {position:[62,6,66],target:[40,1.2,40]},
  headlights: {position:[150,3,44],target:[-40,1.4,40]},
  fleet: {position:[-260,16,66],target:[-260,1,40]},
};
export async function stage(ctx) {
  const r = ctx.world.roads;
  if (!r.edges.size) {
    const nodes = new Map();
    const node = (x,z) => { const k = `${x.toFixed(4)},${z.toFixed(4)}`; if (!nodes.has(k)) nodes.set(k,r.addNode(x,z)); return nodes.get(k); };
    const edge = (x,z,xx,zz,type='street',opts={}) => r.addEdge(node(x,z),node(xx,zz),type,opts);
    const xs=[-300,-200,-120,-40,40,120,200,300];
    for(let i=1;i<xs.length;i++) edge(xs[i-1],40,xs[i],40,'avenue');
    const zs=[-140,-40,40,120,200];
    for(const x of [-120,-40,40,120,200]) for(let i=1;i<zs.length;i++) edge(x,zs[i-1],x,zs[i]);
    for(const z of [-40,120]) for(const x of [-120,-40,40,120]) edge(x,z,x+80,z);
    const ring=[];
    // Negative angle in the x/z plane circulates anticlockwise from above.
    for(let i=0;i<8;i++){const a=-i*Math.PI/4;ring.push([-200+28*Math.cos(a),-40+28*Math.sin(a)]);}
    for(let i=0;i<8;i++){const a=ring[i],b=ring[(i+1)%8];edge(...a,...b,'street',{oneWay:true,lanes:1});}
    edge(-200,-12,-200,40); edge(-172,-40,-120,-40);
    edge(-200,-68,-200,-140);edge(-200,-140,-120,-140);
    edge(-228,-40,-980,-40,'avenue');
    edge(-1000,340,345,222,'highway',{ctrl:{x:-320,z:390}});
    edge(345,222,1000,140,'highway',{ctrl:{x:680,z:155}});
    edge(300,40,345,222,'ramp',{oneWay:true,ctrl:{x:170,z:258}});
    edge(40,-140,40,-1000,'avenue');
    edge(160,100,160,160,'alley');
  }
  ctx.modules.roads?.rebuild?.();
  for(const [name,p] of Object.entries(CAMERAS)) ctx.camera.registerPreset(name,p);
}
