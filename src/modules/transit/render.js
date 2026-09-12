import * as THREE from 'three';
import { TransitLabels } from './labels.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const box = (x, y, z, w, h, d) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
function merge(parts) {
  const normalized = parts.map(p => p.index ? p.toNonIndexed() : p);
  const result = mergeGeometries(normalized, false);
  for (const p of new Set([...parts, ...normalized])) p.dispose();
  return result;
}
function coloredBox(parts, x, y, z, w, h, d, hex) {
  const g = box(x, y, z, w, h, d), c = new THREE.Color(hex), colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) { colors[i] = c.r; colors[i + 1] = c.g; colors[i + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); parts.push(g);
}
function lightBox(parts, x, y, z, w, h, d, albedo, glow = '#000000', glazing = 0) {
  const group = []; coloredBox(group, x, y, z, w, h, d, albedo);
  const g = group[0], c = new THREE.Color(glow), n = g.attributes.position.count, values = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { values[i * 3] = c.r; values[i * 3 + 1] = c.g; values[i * 3 + 2] = c.b; }
  g.setAttribute('glow', new THREE.BufferAttribute(values, 3));
  g.setAttribute('glazing', new THREE.BufferAttribute(new Float32Array(n).fill(glazing), 1)); parts.push(g);
}
function busGeometry() {
  const paint = [new RoundedBoxGeometry(2.48, 0.22, 11.8, 2, 0.08).translate(0, 2.94, 0), box(0,.90,0,2.16,.84,11.7), box(0,.96,5.85,2.46,1.21,.22),box(0,.96,-5.85,2.46,1.21,.22)];
  // Side skirts have actual wheel openings, not tyres pasted over a solid slab.
  for (const side of [-1,1]) {
    const shape = new THREE.Shape(); shape.moveTo(-5.95,.34);
    for (const axle of [-4.1,3.8]) {
      shape.lineTo(axle-.58,.34); shape.lineTo(axle-.58,.49);
      for(let i=0;i<=16;i++){const a=Math.PI-i*Math.PI/16;shape.lineTo(axle+Math.cos(a)*.58,.49+Math.sin(a)*.58);}
      shape.lineTo(axle+.58,.34);
    }
    shape.lineTo(5.95,.34);shape.lineTo(5.95,1.575);shape.lineTo(-5.95,1.575);shape.closePath();
    const skirt = new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,curveSegments:8});
    const pos=skirt.attributes.position;
    for(let i=0;i<pos.count;i++){const z=pos.getX(i),x=side*(1.12+pos.getZ(i));pos.setXYZ(i,x,pos.getY(i),z);}
    if (side > 0) for (let i=0;i<pos.count;i+=3) { const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);pos.setXYZ(i,pos.getX(i+2),pos.getY(i+2),pos.getZ(i+2));pos.setXYZ(i+2,x,y,z); }
    skirt.computeVertexNormals();paint.push(skirt);
  }
  const dark = [], detail = [], lamps = [];
  // Hollow interior: the glazing looks through to real seat backs, aisle and ceiling.
  coloredBox(dark, 0, 0.52, 0, 2.38, 0.12, 11.6, '#26343a');
  coloredBox(dark, 0, 2.8, 0, 2.37, 0.11, 11.6, '#485257');
  for (const x of [-0.88, 0.88]) for (const z of [-4.2, -3.1, -2, -0.9, 0.2, 1.3, 2.4, 3.5]) {
    coloredBox(dark, x, 1.45, z, 0.52, 0.85, 0.16, '#263b43');
    coloredBox(dark, x, 0.99, z + 0.20, 0.52, 0.12, 0.5, '#304650');
  }
  for (const x of [-1.235, 1.235]) {
    for (const y of [1.51, 2.73]) coloredBox(dark, x, y, 0, 0.045, 0.07, 11.7, '#111c21');
    for (const z of [-5.55, -3.25, -1.23, 0.85, 2.95, 5.35]) coloredBox(dark, x, 2.1, z, 0.065, 1.35, 0.075, '#17252a');
  }
  coloredBox(detail, 0, 3.12, -1.5, 1.7, 0.28, 2.5, '#adb6b9');
  for (let z = -2.5; z < -0.4; z += 0.18) coloredBox(detail, 0, 3.267, z, 1.4, 0.02, 0.055, '#65727a');
  for (const z of [-3.6, 1.8]) coloredBox(detail, 0, 3.07, z, 0.8, 0.12, 0.7, '#c1c6c6');
  for (const x of [-1.255, 1.255]) {
    for (const z of [-4.25, -2.25, -0.2, 1.9, 4.15]) {
      const bay = [-4.25, -2.25, -0.2, 1.9, 4.15].indexOf(z);
      const tints = ['#ffe5b5', '#bedbeb', '#000000', '#f4d29b', '#c8e1ec'];
      lightBox(lamps, x, 2.10, z, 0.012, 1.05, 1.65, '#172b35', tints[bay], 1);
      coloredBox(detail, x * 1.009, 1.69, z - 0.4, 0.022, 0.21, 0.38, '#333d42');
      coloredBox(detail, x * 1.009, 1.69, z + 0.4, 0.022, 0.21, 0.38, '#333d42');
    }
    for (const z of [-5.55, -3.25, 0.85, 5.5]) coloredBox(detail, x * 1.01, 0.90, z, 0.012, 0.4, 0.018, '#8b9698');
    for (let z = -5.4; z < -4.7; z += 0.09) coloredBox(detail, x * 1.01, 0.75, z, 0.014, 0.32, 0.027, '#59686c');
  }
  lightBox(lamps, 0, 2.03, 5.915, 2.17, 0.95, 0.02, '#11212e', '#000000', 1);
  lightBox(lamps, 0, 2.12, -5.915, 2.1, 1.0, 0.02, '#11212e', '#000000', 1);
  for (const x of [-0.6, 0.6]) coloredBox(detail, x, 1.77, 5.939, 0.032, 0.4, 0.023, '#17232a');
  coloredBox(detail, 0, 0.38, 0, 2.25, 0.24, 11.6, '#20282a');
  coloredBox(detail, 0, 1.39, 0, 2.54, 0.14, 11.95, '#e5e9e8');
  for (const z of [-4.1, 3.8]) for (const x of [-1.16, 1.16]) {
    const tyre = new THREE.CylinderGeometry(0.48, 0.48, 0.3, 16).rotateZ(Math.PI / 2).translate(x, 0.49, z);
    const c = new THREE.Color('#14191c'), arr = new Float32Array(tyre.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; }
    tyre.setAttribute('color', new THREE.BufferAttribute(arr, 3)); dark.push(tyre);
    const hub = new THREE.CylinderGeometry(.245,.245,.045,16).rotateZ(Math.PI/2).translate(Math.sign(x)*1.328,.49,z), hc=new THREE.Color('#9ca8ae');
    hub.setAttribute('color',new THREE.Float32BufferAttribute(Array.from({length:hub.attributes.position.count},()=>hc.toArray()).flat(),3));dark.push(hub);
  }
  for (const z of [-5.4, -3.2, -1.2, 0.9, 3, 5.3]) for (const x of [-1.25, 1.25])
    coloredBox(detail, x, 2.08, z, 0.055, 1.6, 0.075, '#a9b2b3');
  for (const z of [-1.8, 4.25]) {
    coloredBox(detail, 1.265, 1.54, z, 0.055, 2.34, 1.4, '#14191c');
    coloredBox(detail, 1.3, 0.39, z, 0.16, 0.09, 1.42, '#858d8c');
  }
  coloredBox(detail, 0, 2.74, 5.96, 1.65, 0.34, 0.025, '#11191c');
  // Geometry glyphs, no external font texture: BUS is readable in the front destination panel.
  const glyphs = ['110101110101110', '101101101101111', '111100111001111'];
  for (let g = 0; g < 3; g++) for (let row = 0; row < 5; row++) for (let col = 0; col < 3; col++)
    if (glyphs[g][row * 3 + col] === '1') lightBox(lamps, -0.43 + g * 0.34 + col * 0.073, 2.88 - row * 0.055, 5.985, 0.052, 0.038, 0.012, '#d3b97e', '#ffe6b6');
  for (const x of [-0.85, 0.85]) {
    lightBox(lamps, x, 0.87, 5.98, 0.34, 0.16, 0.035, '#d5dcd8', '#eef6ff');
    lightBox(lamps, x, 0.85, -5.98, 0.17, 0.32, 0.035, '#9d2620', '#ff3021');
    coloredBox(detail, x * 1.63, 2.38, 5, 0.18, 0.36, 0.14, '#182328');
  }
  const doors = [];
  for (const z of [-1.8, 4.25]) for (const dz of [-0.33, 0.33]) doors.push(box(1.3, 1.6, z + dz, 0.055, 2.1, 0.6));
  return [merge(paint), merge(dark), merge(detail), merge(lamps), merge(doors)];
}

export class TransitRender {
  constructor(ctx) {
    this.ctx = ctx; this.group = ctx.group; this.lastDraws = 0; this.lastTris = 0; this.removeHook = ctx.engine.onBeforeRender(() => { this.lastDraws = 0; this.lastTris = 0; }); this.static = new THREE.Group(); this.static.name = 'transit:stops'; this.group.add(this.static);
    this.overlayGroup = new THREE.Group(); this.overlayGroup.name = 'transit:overlay'; this.group.add(this.overlayGroup);
    this.matrix = new THREE.Matrix4(); this.position = new THREE.Vector3(); this.quaternion = new THREE.Quaternion(); this.scale = new THREE.Vector3(1, 1, 1); this.axis = new THREE.Vector3(0, 1, 0);
    this.paintNight = { value: 0 };
    this.materials = [new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.06, clearcoat: 0.38, clearcoatRoughness: 0.32 }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.24, metalness: 0.3 }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.68, metalness: 0.16 }),
      new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.19, metalness: 0.12, clearcoat: 0.2, transparent: true, depthWrite: false, emissive: 0xffffff, emissiveIntensity: 0 }),
      new THREE.MeshStandardMaterial({ color: 0x142630, roughness: 0.24, metalness: 0.12 })];
    this.geometry = busGeometry(); this.buses = this.geometry.map((g, i) => {
      const m = new THREE.InstancedMesh(g, this.materials[i], 160); m.name = `transit:fleet:${i}`; m.count = 0;
      m.castShadow = i === 0 || i === 1; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.track(m); this.group.add(m); return m;
    });
    this.color = new THREE.Color(); this.baseColor = new THREE.Color(); this.staticMaterials = [];
    this.materials[0].onBeforeCompile = shader => {
      shader.vertexShader = 'attribute vec3 baseColor; varying vec3 vBase; varying float vBusY;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBase = baseColor; vBusY = position.y;');
      shader.fragmentShader = 'varying vec3 vBase; varying float vBusY; uniform float transitNight;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(vBase, diffuseColor.rgb, float(vBusY < 0.58 || (vBusY > 1.05 && vBusY < 1.26)));\ndiffuseColor.rgb *= mix(1.0, 0.24, transitNight);');
      shader.uniforms.transitNight = this.paintNight;
    };
    this.materials[3].onBeforeCompile = shader => {
      shader.vertexShader = 'attribute vec3 glow; attribute float glazing; varying vec3 vGlow; varying float vGlazing;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlow = glow; vGlazing = glazing;');
      shader.fragmentShader = 'varying vec3 vGlow; varying float vGlazing;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= mix(1.0, 0.82, vGlazing);');
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow * mix(2.0, 0.85, vGlazing);');
    };
    this.geometry[0].setAttribute('baseColor', new THREE.InstancedBufferAttribute(new Float32Array(160 * 3), 3));
    this.pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(7, 15).rotateX(-Math.PI / 2).translate(0, 0.016, 12.8),
      new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0); }',
        fragmentShader: 'varying vec2 vUv; void main(){ float a=pow(max(0.0,1.0-length((vUv-0.5)*2.0)),2.0)*0.23; gl_FragColor=vec4(vec3(0.55,0.48,0.32),a); }' }), 160);
    this.pool.name = 'transit:headlight-pools'; this.pool.count = 0; this.track(this.pool); this.group.add(this.pool);
    this.ownStops = []; this.nearCount = 0;
    this.labels = new TransitLabels(ctx, mesh => this.track(mesh));
    this.renderMeshes = [...this.buses, this.pool]; this.baseVariants = ['#b8b39e', '#537583', '#707b81', '#788972'];

  }
  track(mesh) { const count = (passes) => { const n = mesh.isInstancedMesh ? mesh.count : 1; if (!n) return; this.lastDraws += passes; this.lastTris += ((mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3) * n * passes; }; mesh.onBeforeRender = () => count(mesh.material.transparent && mesh.material.side === THREE.DoubleSide && !mesh.material.forceSinglePass ? 2 : 1); mesh.onBeforeShadow = () => count(1); }
  clear(group) { for (const child of [...group.children]) { child.geometry?.dispose(); child.material?.dispose(); group.remove(child); } }
  rebuild(stops, lines, tables) {
    this.clear(this.static); this.clear(this.overlayGroup);
    this.labels.rebuild(stops, lines);
    const solid = [], glass = [], glow = [];
    this.ownStops = []; this.shelterMaterial = null;
    for (const s of stops.values()) {
      if (s.propId !== null) continue;
      this.ownStops.push(s);
      const strip = box(0, 2.92, 0, 3.8, 0.055, 0.15);
      const parts = [], windows = [];
      for (const x of [-2.6, 2.6]) for (const z of [-0.9, 0.9]) coloredBox(parts, x, 1.5, z, 0.10, 3, 0.10, '#68777b');
      coloredBox(parts, 0, 3.03, 0, 5.7, 0.17, 2.3, '#768a90');
      coloredBox(parts, 0, 0.52, -0.4, 3.7, 0.12, 0.52, '#926f47'); parts.at(-1).userData.wash = 1;
      for (const x of [-1.4, 1.4]) coloredBox(parts, x, 0.26, -0.4, 0.08, 0.52, 0.4, '#53646a');
      coloredBox(parts, 3.4, 1.7, 0, 0.09, 3.4, 0.09, '#b6c0c0');
      const flag = new THREE.CylinderGeometry(0.39, 0.39, 0.10, 20).rotateX(Math.PI / 2).translate(3.4, 3.05, 0);
      const fc = new THREE.Color(lines.get(s.lines[0])?.color || '#2f8ff5'), attr = new Float32Array(flag.attributes.position.count * 3);
      for (let i = 0; i < attr.length; i += 3) { attr[i] = fc.r; attr[i + 1] = fc.g; attr[i + 2] = fc.b; }
      flag.setAttribute('color', new THREE.BufferAttribute(attr, 3)); parts.push(flag);
      coloredBox(parts, -2.2, 1.63, -0.90, 0.68, 1.02, 0.055, '#e5e0ce'); parts.at(-1).userData.wash = 1;
      coloredBox(parts, -2.2, 2.02, -0.864, 0.6, 0.15, 0.01, '#243b45');
      for (let row = 0; row < 7; row++) {
        coloredBox(parts, -2.13, 1.84 - row * 0.085, -0.861, 0.38 - (row % 3) * 0.035, 0.017, 0.01, '#53676c');
        coloredBox(parts, -2.43, 1.84 - row * 0.085, -0.861, 0.055, 0.034, 0.01, lines.get(s.lines[0])?.color || '#2f8ff5');
      }
      // Flag line number uses seven-segment geometry and keeps the same merged structure batch.
      const digit = String(s.lines[0] || 1).slice(-1), segments = {0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'}[digit];
      const bars = {a:[0,.17,.17,.026],b:[.09,.085,.026,.14],c:[.09,-.085,.026,.14],d:[0,-.17,.17,.026],e:[-.09,-.085,.026,.14],f:[-.09,.085,.026,.14],g:[0,0,.17,.026]};
      for (const segment of segments) { const [x,y,w,h] = bars[segment]; coloredBox(parts, 3.4+x, 3.05+y, .062, w,h,.018,'#f4f4e7'); }
      windows.push(box(0, 1.72, -0.96, 5.1, 2.35, 0.035), box(-2.64, 1.72, 0, 0.035, 2.35, 1.75));
      const transform = new THREE.Matrix4().makeRotationY(Math.PI - s.heading); transform.setPosition(s.x, s.y, s.z);
      strip.applyMatrix4(transform); glow.push(strip);
      for (const g of parts) { g.setAttribute('wash',new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(g.userData.wash || 0),1));g.applyMatrix4(transform); solid.push(g); }
      for (const g of windows) { g.applyMatrix4(transform); glass.push(g); }
    }
    if (solid.length) {
      this.shelterMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.64, metalness: 0.28, emissive:'#ffe7b6',emissiveIntensity:0 });
      this.shelterMaterial.onBeforeCompile = shader => {
        shader.vertexShader = 'attribute float wash; varying float vWash;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWash=wash;');
        shader.fragmentShader = 'varying float vWash;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb * vWash;');
      };
      const m = new THREE.Mesh(merge(solid), this.shelterMaterial);
      m.name = 'transit:shelter-structure'; m.castShadow = m.receiveShadow = true; this.track(m); this.static.add(m);
    }
    if (glass.length) {
      const m = new THREE.Mesh(merge(glass), new THREE.MeshStandardMaterial({ color: 0x92b1b7, transparent: true, opacity: 0.22, roughness: 0.2, metalness: 0.08, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true }));
      m.name = 'transit:shelter-glass'; m.receiveShadow = true; this.track(m); this.static.add(m);
    }
    this.shelterGlow = null;
    if (glow.length) { this.shelterGlow = new THREE.Mesh(merge(glow), new THREE.MeshStandardMaterial({ color: '#e7dbad', emissive: '#e7dbad', emissiveIntensity: 0.8, roughness: 0.7 }));
      this.shelterGlow.name = 'transit:shelter-lamps'; this.track(this.shelterGlow); this.static.add(this.shelterGlow); }
    const vertices = [], colors = [], outline = [], white = [], R = this.ctx.world.roads;
    const tri = (array, cols, a, b, c, color) => { array.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) cols.push(color.r, color.g, color.b); };
    const users = new Map();
    for (const l of lines.values()) if (tables.has(l.id) && l.active) for (const id of new Set(l.route)) { if (!users.has(id)) users.set(id, []); users.get(id).push(l.id); }
    for (const l of lines.values()) {
      const table = tables.get(l.id); if (!table || !l.active) continue;
      const color = new THREE.Color(l.color);
      for (const id of new Set(l.route)) {
        const e = R.edges.get(id); if (!e) continue;
        const siblings = users.get(id), spacing = Math.min(2.2, (R.types[e.type].asphaltHalf * 2 - 2.1) / Math.max(1, siblings.length - 1));
        const offset = (siblings.indexOf(l.id) - (siblings.length - 1) / 2) * spacing;
        const n = Math.ceil(e.length / 4); let prev = null;
        for (let j = 0; j <= n; j++) {
          const p = R.sample(id, j / n), y = p.y + 0.095;
          const row = [p.x, y, p.z, p.normal.x, p.normal.z];
          if (prev) for (const [half, arr, cols, col] of [[1.05, outline, white, new THREE.Color('#19262d')], [0.9, vertices, colors, color]]) {
            const a = [prev[0] + prev[3] * (offset - half), prev[1], prev[2] + prev[4] * (offset - half)], b = [prev[0] + prev[3] * (offset + half), prev[1], prev[2] + prev[4] * (offset + half)];
            const c = [row[0] + row[3] * (offset - half), row[1], row[2] + row[4] * (offset - half)], d = [row[0] + row[3] * (offset + half), row[1], row[2] + row[4] * (offset + half)];
            tri(arr, cols, a, c, b, col); tri(arr, cols, b, c, d, col);
          }
          prev = row;
        }
        // Directed, repeated V chevrons share the route batch. Recover direction from cached route legs.
        const segment = table?.segments?.find(s => !s.junction && s.a.edgeId === id), forward = !segment || segment.b.t >= segment.a.t;
        for (let d = 18; d < e.length - 8; d += 28) {
          const p = R.sample(id, d / e.length), sign = forward ? 1 : -1, tx = p.tangent.x * sign, tz = p.tangent.z * sign;
          const x = p.x + p.normal.x * offset, z = p.z + p.normal.z * offset, y = p.y + 0.108;
          const tip = [x + tx * 1.1, y, z + tz * 1.1], tail = [x - tx * 0.25, y, z - tz * 0.25];
          for (const side of [-1, 1]) tri(vertices, colors, tip, [x - tx + p.normal.x * side * 0.7, y, z - tz + p.normal.z * side * 0.7], tail, new THREE.Color('#f4f6ef'));
        }
      }
    }
    for (const s of stops.values()) {
      const col = new THREE.Color(lines.get(s.lines[0])?.color || '#2f8ff5'), whiteColor = new THREE.Color('#f7f8f3');
      for (let i = 0; i < 32; i++) {
        const a = i * Math.PI / 16, b = (i + 1) * Math.PI / 16;
        const at = (angle, r) => [s.x + Math.cos(angle) * r, s.y + 0.026, s.z + Math.sin(angle) * r];
        tri(vertices, colors, [s.x, s.y + 0.026, s.z], at(a, 1.6), at(b, 1.6), col);
        tri(vertices, colors, at(a, 1.6), at(a, 2), at(b, 2), whiteColor); tri(vertices, colors, at(a, 1.6), at(b, 2), at(b, 1.6), whiteColor);
      }

    }
    for (const [arr, cols, opacity, order] of [[[...outline, ...vertices], [...white, ...colors], 0.62, 22]]) if (arr.length) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeBoundingSphere();
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, opacity, transparent: true, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      m.renderOrder = order; m.name = 'transit:route-ribbon'; this.track(m); this.overlayGroup.add(m);
    }
  }
  update(fleet, lines, overlay) {
    const night = this.ctx.world.time.hour < 6 || this.ctx.world.time.hour > 19;
    this.paintNight.value = night ? 1 : 0;
    this.materials[3].emissiveIntensity = night ? 0.55 : 0;
    this.overlayGroup.visible = overlay;
    if (this.shelterGlow) { this.shelterGlow.visible = night; this.shelterGlow.material.emissiveIntensity = night ? 1.2 : 0; }
    if (this.shelterMaterial) this.shelterMaterial.emissiveIntensity = night ? .28 : 0;
    const capacity = Math.max(160, (fleet.length + this.ownStops.length) * 2);
    if (fleet.length + this.ownStops.length > this.buses[0].instanceMatrix.count) {
      for (const m of this.renderMeshes) { m.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 16), 16).setUsage(THREE.DynamicDrawUsage); m.instanceColor = null; }
      this.geometry[0].setAttribute('baseColor', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3));
    }
    const cp = this.ctx.camera.position; this.nearCount = 0; this.pool.count = 0;
    this.buses[0].count = this.buses[1].count = this.buses[3].count = fleet.length;
    this.buses[2].count = this.buses[4].count = 0;

    for (let i = 0; i < fleet.length; i++) {
      const v = fleet[i], near = Math.hypot(v.x - cp.x, v.y - cp.y, v.z - cp.z) < 180;
      if (near) this.nearCount++;
      this.position.set(v.x, v.y, v.z); this.quaternion.setFromAxisAngle(this.axis, Math.PI - v.heading);
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.buses[0].setMatrixAt(i, this.matrix); this.buses[1].setMatrixAt(i, this.matrix); this.buses[3].setMatrixAt(i, this.matrix);
      if (near) {
        this.buses[2].setMatrixAt(this.buses[2].count++, this.matrix);
        if (night) { this.position.y = v.y + 0.018; this.matrix.compose(this.position, this.quaternion, this.scale); this.pool.setMatrixAt(this.pool.count++, this.matrix); this.position.y = v.y; }
        if (v.doorsOpen) { this.position.x += Math.cos(Math.PI - v.heading) * 0.22; this.position.z -= Math.sin(Math.PI - v.heading) * 0.22; }
        this.matrix.compose(this.position, this.quaternion, this.scale); this.buses[4].setMatrixAt(this.buses[4].count++, this.matrix);
      }
      this.color.set(lines.get(v.lineId).color); this.buses[0].setColorAt(i, this.color);
      this.baseColor.set(this.baseVariants[v.ordinal % this.baseVariants.length]); this.geometry[0].attributes.baseColor.setXYZ(i, this.baseColor.r, this.baseColor.g, this.baseColor.b);
    }
    if (night) for (const stop of this.ownStops) if (Math.hypot(stop.x - cp.x, stop.y - cp.y, stop.z - cp.z) < 180) {
      this.quaternion.setFromAxisAngle(this.axis, Math.PI - stop.heading); this.scale.set(0.8, 1, 0.3);
      this.position.set(stop.x - Math.sin(stop.heading) * 3.84, stop.y + 0.006, stop.z + Math.cos(stop.heading) * 3.84);
      this.matrix.compose(this.position, this.quaternion, this.scale); this.pool.setMatrixAt(this.pool.count++, this.matrix);
    }
    this.scale.set(1, 1, 1);
    this.geometry[0].attributes.baseColor.needsUpdate = true;
    for (const m of this.renderMeshes) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
    this.labels.update(overlay);
  }
  stats() { return { draws: this.lastDraws, tris: this.lastTris, lodNear: this.nearCount, lodFar: this.buses[0].count - this.nearCount }; }
  cropRects({ project, width, height, camera }, fleet, stops, lines) {
    const result = {}, cp = camera?.position || this.ctx.camera.position;
    const rawProject = project; project = (x, y, z) => { const p = rawProject(x, y, z); return Array.isArray(p) ? { x: p[0], y: p[1], visible: p[2] >= -1 && p[2] <= 1 } : p; };
    const near = list => [...list].filter(p => { const q = project(p.x, p.y + 1.5, p.z); return q?.visible !== false && q?.x >= 0 && q.x < width && q.y >= 0 && q.y < height; }).sort((a, b) => Math.hypot(a.x - cp.x, a.y - cp.y, a.z - cp.z) - Math.hypot(b.x - cp.x, b.y - cp.y, b.z - cp.z))[0];
    const rect = (p, w, h, d) => {
      const points = []; for (const x of [-w / 2, w / 2]) for (const y of [0, h]) for (const z of [-d / 2, d / 2]) {
        const c = Math.cos(Math.PI - (p.heading || 0)), s = Math.sin(Math.PI - (p.heading || 0)), q = project(p.x + x * c + z * s, p.y + y, p.z - x * s + z * c);
        if (q && q.visible !== false && Number.isFinite(q.x)) points.push(q);
      }
      if (!points.length) return null;
      const x = Math.max(0, Math.floor(Math.min(...points.map(p => p.x)) - 8)), y = Math.max(0, Math.floor(Math.min(...points.map(p => p.y)) - 8));
      const r = Math.min(width, Math.ceil(Math.max(...points.map(p => p.x)) + 8)), b = Math.min(height, Math.ceil(Math.max(...points.map(p => p.y)) + 8));
      return r > x && b > y ? [x, y, r - x, b - y] : null;
    };
    const bus = near(fleet), stop = near(stops.values());
    if (bus) { const r = rect(bus, 2.55, 3.3, 12); if (r) result.bus = r; }
    if (stop) { const actual = this.ctx.world.props.items.get(stop.propId) || stop, r = rect(actual, 7, 3.6, 2.6); if (r) result.shelter = r; }
    const blue = [...lines.values()].find(l => l.color === '#2f8ff5');
    if (blue) { const edges = blue.route.map(id => this.ctx.world.roads.edges.get(id)).filter(Boolean).sort((a, b) => b.length - a.length), e = edges[0];
      if (e) { const p = this.ctx.world.roads.sample(e.id, 0.5), q = project(p.x, p.y + 0.1, p.z); if (q?.visible !== false && q?.x >= 32 && q.x < width - 32 && q.y >= 32 && q.y < height - 32) result.ribbon = [Math.round(q.x - 32), Math.round(q.y - 32), 64, 64]; }
    }
    return result;
  }
  dispose() { this.labels.dispose(); this.pool.geometry.dispose(); this.pool.material.dispose(); this.group.remove(this.pool); this.removeHook?.(); this.clear(this.static); this.clear(this.overlayGroup); for (const m of this.buses) { m.geometry.dispose(); m.material.dispose(); this.group.remove(m); } }
}
