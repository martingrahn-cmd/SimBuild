import * as THREE from 'three';
// Compact geometry lettering. Each digit/letter is five columns by seven rows; no DOM or texture atlas.
const ROWS = {
 A:'0e11111f111111',B:'1e11111e11111e',C:'0e11101010110e',D:'1e11111111111e',E:'1f10101e10101f',F:'1f10101e101010',G:'0e11101711110f',H:'1111111f111111',I:'0e04040404040e',J:'0702020212120c',K:'11121418141211',L:'1010101010101f',M:'111b1515111111',N:'11191513111111',O:'0e11111111110e',P:'1e11111e101010',Q:'0e11111115120d',R:'1e11111e141211',S:'0f10100e01011e',T:'1f040404040404',U:'1111111111110e',V:'11111111110a04',W:'11111115151b11',X:'11110a040a1111',Y:'11110a04040404',Z:'1f01020408101f',
 '0':'0e11131519110e','1':'040c040404040e','2':'0e11010204081f','3':'1e01010e01011e','4':'02060a121f0202','5':'1f10101e01011e','6':'0e10101e11110e','7':'1f010204080808','8':'0e11110e11110e','9':'0e11110f01010e','.':'00000000000c0c','-':'0000001f000000',' ':'00000000000000'
};
const distanceOrder = (a, b) => a.distance - b.distance;
export class TransitLabels {
  constructor(ctx, track) { this.ctx = ctx; this.track = track; this.entries = []; this.projected = new THREE.Vector3(); this.forward = new THREE.Vector3(); this.resolution = new THREE.Vector2(); this.rects = []; }
  clear() { if (this.mesh) { this.ctx.group.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh = null; }
    for (const e of this.entries) { this.ctx.group.remove(e.anchor); e.anchor.geometry.dispose(); e.anchor.material.dispose(); } this.entries.length = 0; }
  rebuild(stops, lines) {
    this.clear(); const positions = [], offsets = [], colors = [], show = [], uv = [], backgrounds = [];
    const quad = (s, x, y, w, h, color, background = 0) => {
      for (const [u, v] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) { positions.push(s.x, s.y + 4.15, s.z); offsets.push(x+u*w,y+v*h); colors.push(color.r,color.g,color.b); show.push(0); uv.push(u*2-1,v*2-1); backgrounds.push(background); }
    };
    const ink = new THREE.Color('#eff4f6'), dark = new THREE.Color('#14232e');
    for (const s of stops.values()) {
      const name = s.name.length > 18 ? s.name.slice(0, 15) + '...' : s.name;
      const text = `${s.lines[0] || '-'} ${name}`.toUpperCase(), px = 1.35, width = Math.min(186, text.length * 6 * px + 14), height = 21;
      const start = show.length, c = new THREE.Color(lines.get(s.lines[0])?.color || '#2f8ff5');
      quad(s,-width/2,0,width,height,dark,1); quad(s,-width/2+3,4,2,height-8,c);
      for (let i=0;i<text.length;i++) {
        const rows=ROWS[text[i]] || ROWS['-'];
        for(let row=0;row<7;row++){const bits=parseInt(rows.slice(row*2,row*2+2),16);for(let col=0;col<5;col++)if(bits & 1<<(4-col)) {
          const x=-width/2+9+(i*6+col)*px; if(x+px<width/2-3)quad(s,x,5+(6-row)*px,px,px,ink);
        }}
      }
      // AABB proxy uses the same camera-facing plane as the batched glyph vertices; it draws no extra pass.
      const rectangle=new THREE.PlaneGeometry(width,height).translate(0,height/2,0);rectangle.computeBoundingBox();
      const anchor=new THREE.Mesh(rectangle,new THREE.MeshBasicMaterial({visible:false}));
      anchor.name=`chip:${s.id}`;anchor.position.set(s.x,s.y+4.15,s.z);this.ctx.group.add(anchor);
      this.entries.push({anchor,start,end:show.length,width,height,distance:0,shown:false,x:0,y:0});
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('offset',new THREE.Float32BufferAttribute(offsets,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('shown',new THREE.Float32BufferAttribute(show,1));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('background',new THREE.Float32BufferAttribute(backgrounds,1));g.computeBoundingSphere();
    const m=new THREE.ShaderMaterial({uniforms:{resolution:{value:this.resolution}},transparent:true,depthTest:false,depthWrite:false,
      vertexShader:'attribute vec2 offset; attribute vec3 color; attribute float shown; attribute float background; uniform vec2 resolution; varying vec3 vColor; varying vec2 vUv; varying float vBackground; void main(){ vColor=color; vUv=uv; vBackground=background; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); p.xy+=offset*2.0/resolution*p.w; gl_Position=shown>0.5?p:vec4(2.0,2.0,2.0,1.0); }',
      fragmentShader:'varying vec3 vColor; varying vec2 vUv; varying float vBackground; void main(){ if(vBackground>0.5 && length(max(abs(vUv)-vec2(0.94,0.65),0.0)/vec2(0.06,0.35))>1.0) discard; gl_FragColor=vec4(vColor,1.0);\n#include <colorspace_fragment>\n}' });
    this.mesh=new THREE.Mesh(g,m);this.mesh.name='transit:chip-batch';this.mesh.renderOrder=30;this.track(this.mesh);this.ctx.group.add(this.mesh);
  }
  update(overlay) {
    if(!this.mesh)return;const camera=this.ctx.camera.camera,cp=camera.position,width=innerWidth,height=innerHeight;
    this.resolution.set(width,height);this.rects.length=0;camera.getWorldDirection(this.forward);
    for(const e of this.entries)e.distance=e.anchor.position.distanceTo(cp);this.entries.sort(distanceOrder);
    const visible=this.mesh.geometry.attributes.shown;
    for(const e of this.entries){
      this.projected.copy(e.anchor.position).project(camera);const x=(this.projected.x*.5+.5)*width,y=(-this.projected.y*.5+.5)*height;
      let on=overlay&&this.ctx.group.visible&&e.distance<260&&this.rects.length<16&&this.projected.z>-1&&this.projected.z<1&&x-e.width/2>340&&x+e.width/2<width-12&&y-e.height>70&&y<height-96;
      if(on)for(const other of this.rects)if(Math.abs(x-other.x)<(e.width+other.width)/2+4&&Math.abs(y-other.y)<24){on=false;break;}
      e.anchor.visible=on;e.anchor.quaternion.copy(camera.quaternion);
      const depth=(e.anchor.position.x-cp.x)*this.forward.x+(e.anchor.position.y-cp.y)*this.forward.y+(e.anchor.position.z-cp.z)*this.forward.z;
      const scale=2*Math.tan(camera.fov*Math.PI/360)*depth/height;e.anchor.scale.set(scale,scale,scale);
      if(on){e.x=x;e.y=y;this.rects.push(e);}
      if(on!==e.shown){visible.array.fill(on?1:0,e.start,e.end);visible.needsUpdate=true;e.shown=on;}
    }
    this.mesh.visible=overlay&&this.rects.length>0;
  }
  dispose(){this.clear();}
}
