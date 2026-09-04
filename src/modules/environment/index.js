// STUB environment — a plain sun + hemisphere + fog + gradient sky so other modules are lit.
// Replaced wholesale by the environment builder (physically based sky, CSM, clouds, PMREM...).
import * as THREE from 'three';

let sun, hemi, sky, ambient;
const tmp = new THREE.Vector3();

export default {
  name: 'environment',
  dependencies: [],
  budget: { drawCalls: 15, triangles: 50000 },
  async init(ctx) {
    sun = new THREE.DirectionalLight(0xffffff, 3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -400; sun.shadow.camera.right = 400;
    sun.shadow.camera.top = 400; sun.shadow.camera.bottom = -400;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 3000;
    sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.5;
    ctx.group.add(sun); ctx.group.add(sun.target);
    hemi = new THREE.HemisphereLight(0x8fb4ff, 0x4d3f2a, 0.8);
    ctx.group.add(hemi);
    const geo = new THREE.SphereGeometry(5000, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x2a5cc8) }, horizon: { value: new THREE.Color(0xbfd6ee) }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(1, 0.95, 0.85) } },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 top, horizon, sunDir, sunCol;
        void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(horizon, top, pow(h, 0.5));
        float s = max(dot(vDir, sunDir), 0.0); c += sunCol * (pow(s, 256.0) * 4.0 + pow(s, 8.0) * 0.15);
        gl_FragColor = vec4(c, 1.0); }`,
    });
    sky = new THREE.Mesh(geo, mat); sky.renderOrder = -1000; sky.frustumCulled = false;
    ctx.group.add(sky);
    ctx.scene.fog = new THREE.FogExp2(0xbfd6ee, 0.00035);
    this.update(0, ctx);
  },
  update(dt, ctx) {
    const h = ctx.clock.hour;
    const el = ctx.clock.sunElevation(h), az = ctx.clock.sunAzimuth(h);
    tmp.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const w = ctx.world.weather;
    w.sunDir.copy(tmp);
    const day = THREE.MathUtils.smoothstep(el, -0.05, 0.25);
    w.sunIntensity = 3.2 * day;
    sun.intensity = w.sunIntensity;
    sun.position.copy(tmp).multiplyScalar(1000).add(ctx.camera.target);
    sun.target.position.copy(ctx.camera.target);
    sun.color.setRGB(1, 0.6 + 0.4 * day, 0.4 + 0.55 * day);
    hemi.intensity = 0.15 + 0.7 * day;
    const top = new THREE.Color().setHSL(0.62, 0.7, 0.05 + 0.35 * day);
    const hor = new THREE.Color().setHSL(0.6 - 0.05 * (1 - day), 0.5, 0.08 + 0.7 * day);
    sky.material.uniforms.top.value.copy(top);
    sky.material.uniforms.horizon.value.copy(hor);
    sky.material.uniforms.sunDir.value.copy(tmp);
    ctx.scene.fog.color.copy(hor);
    ctx.renderer.toneMappingExposure = 0.9 + 0.3 * (1 - day);
    sky.position.copy(ctx.camera.camera.position);
  },
  dispose(ctx) { ctx.scene.fog = null; },
  api: {},
  showcase: {
    description: 'environment stub — sun and gradient sky',
    async setup(ctx) {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(2048, 2048), new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 1 }));
      g.rotation.x = -Math.PI / 2; g.receiveShadow = true; ctx.group.add(g);
      const b = new THREE.Mesh(new THREE.BoxGeometry(20, 40, 20), new THREE.MeshStandardMaterial({ color: 0x999999 }));
      b.position.y = 20; b.castShadow = true; ctx.group.add(b);
    },
  },
};
