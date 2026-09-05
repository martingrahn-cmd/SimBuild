// effects — the post-processing chain. RenderPass (HDR half-float + depth) → depth-only AO (+ DOF for
// close cameras) → UnrealBloom (exposure-aware threshold; only emissives, lamps and the sun bloom) →
// OutputPass (AgX from the renderer + sRGB) → SMAA/FXAA → display grade (CAS sharpen, lift/gamma/gain by
// time of day, saturation, temperature, vignette, dither). Any pass failure falls back to direct rendering.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import { QUALITY } from '../../core/constants.js';
import { AmbientPass, GradePass } from './passes.js';
import { setupShowcase, updateShowcase, showcaseUniforms } from './showcase.js';

const PRESETS = {
  // grading strengths are multipliers on the time-of-day curves below
  default:   { ao: 1.0, bloom: 1.0, grade: 1.0, vignette: 0.22, sharpen: 0.35, dof: true,  contrast: 1.0 },
  cinematic: { ao: 1.2, bloom: 1.35, grade: 1.4, vignette: 0.42, sharpen: 0.25, dof: true,  contrast: 1.06 },
  clean:     { ao: 1.0, bloom: 0.7, grade: 0.5, vignette: 0.0,  sharpen: 0.45, dof: false, contrast: 1.0 },
  flat:      { ao: 0.0, bloom: 0.0, grade: 0.0, vignette: 0.0,  sharpen: 0.0,  dof: false, contrast: 1.0 },
};

const S = {
  ctx: null, chain: null, enabled: true, preset: 'default', staged: false, failed: false, post: true,
  night: 0, golden: 0, override: null,
};
const smooth = (e0, e1, x) => { const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

class Chain {
  constructor(ctx) {
    this.ctx = ctx;
    const renderer = ctx.renderer;
    const q = QUALITY[ctx.quality] || QUALITY.high;
    const size = renderer.getSize(new THREE.Vector2()).multiplyScalar(renderer.getPixelRatio()).round();
    const w = Math.max(1, size.x), h = Math.max(1, size.y);
    this.depth = new THREE.DepthTexture(w, h, THREE.UnsignedIntType);
    this.depth.name = 'effects.depth';
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: true, stencilBuffer: false, samples: 0 });
    rt.texture.name = 'effects.hdr';
    this.composer = new EffectComposer(renderer, rt);
    this.composer.setPixelRatio(1);
    // the scene is rendered into readBuffer (renderTarget2): that one carries the depth texture the AO/DOF read
    this.composer.renderTarget2.depthTexture = this.depth;
    this.composer.renderTarget1.depthTexture = null;

    this.renderPass = new RenderPass(ctx.scene, ctx.camera.camera);
    this.ambient = new AmbientPass(this.depth, ctx.camera.camera, { scale: ctx.quality === 'ultra' ? 1 : 0.5 });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.55, 1.5);
    this.output = new OutputPass();
    this.aa = ctx.quality === 'medium' ? new FXAAPass() : new SMAAPass();
    this.grade = new GradePass();
    for (const p of [this.renderPass, this.ambient, this.bloom, this.output, this.aa, this.grade]) this.composer.addPass(p);
    this.hasDof = q.post && ctx.quality !== 'medium';
    this._px = new Uint8Array(4);
    this.setSize(w, h);
  }
  setSize(w, h) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    this.width = w; this.height = h;
  }
  render(dt) {
    // the AO/DOF passes read the depth attached to renderTarget2: keep it the RenderPass target every frame
    if (this.composer.readBuffer !== this.composer.renderTarget2) this.composer.swapBuffers();
    this.composer.render(dt);
    if (this.ctx.headless) {
      // headless (software GL): keep the GPU queue at most one frame deep so screenshot capture is not
      // stuck behind a backlog of multi-second frames. Visual output is unchanged; a real GPU never does this.
      const gl = this.ctx.renderer.getContext();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this._px);
    }
  }
  dispose() {
    for (const p of this.composer.passes) p.dispose?.();
    this.composer.renderTarget1.dispose(); this.composer.renderTarget2.dispose();
    this.depth.dispose();
  }
}

function install(ctx) {
  if (S.chain || S.failed) return;
  try {
    S.chain = new Chain(ctx);
    ctx.engine.setComposer({
      render: (dt) => {
        try { S.chain.render(dt); }
        catch (e) {
          // never take the frame down: log once, drop back to direct rendering
          S.failed = true;
          ctx.log.error(`post chain failed, falling back to direct render: ${e?.message || e}`, e);
          ctx.engine.setComposer(null);
          try { ctx.renderer.setRenderTarget(null); ctx.renderer.render(ctx.scene, ctx.camera.camera); } catch (e2) { /* engine handles it */ }
        }
      },
      setSize: (w, h) => { try { S.chain?.setSize(w, h); } catch (e) { ctx.log.warn(`resize failed: ${e?.message || e}`); } },
    });
  } catch (e) {
    S.failed = true; S.chain = null;
    ctx.log.error(`post chain init failed, direct render: ${e?.message || e}`, e);
    ctx.engine.setComposer(null);
  }
}
function uninstall(ctx) {
  if (!S.chain) return;
  ctx.engine.setComposer(null);
  S.chain.dispose();
  S.chain = null;
}

/** Drive all pass parameters from time of day / weather / camera. No allocations. */
function tune(ctx) {
  const ch = S.chain; if (!ch) return;
  const w = ctx.world.weather;
  const P = S.override ? { ...(PRESETS[S.preset] || PRESETS.default), ...S.override } : (PRESETS[S.preset] || PRESETS.default);
  const night = THREE.MathUtils.clamp(w.night ?? 0, 0, 1);
  const sunY = w.sunDir ? w.sunDir.y : 1;
  const day = 1 - night;
  const golden = (1 - smooth(0.03, 0.32, sunY)) * day;
  const exposure = Math.max(0.05, w.exposure ?? ctx.renderer.toneMappingExposure ?? 1);
  const rain = THREE.MathUtils.clamp(w.wetness ?? 0, 0, 1);
  const overcast = THREE.MathUtils.clamp(w.cloudiness ?? 0.3, 0, 1);
  S.night = night; S.golden = golden;

  // --- ambient occlusion: city-scale radius that grows with the view distance (contact darkening under
  // buildings and kerbs at street level, block-scale occlusion between towers from the air)
  const dist = ctx.camera.distance;
  const radius = THREE.MathUtils.clamp(2.4 + dist * 0.016, 2.4, 14.0);
  ch.ambient.aoEnabled = P.ao > 0.001;
  const dofOn = ch.hasDof && P.dof && dist < 120;
  const dofK = smooth(120, 45, dist);
  ch.ambient.setParams({
    radius, intensity: 1.7 * P.ao, bias: 0.06, power: lerp(1.15, 1.35, night),
    dofEnabled: dofOn && dofK > 0.02, focus: dist * 0.75, range: Math.max(20, dist * 0.45), maxCoc: (3.5 * dofK) * (ch.height / 1080),
  });

  // --- bloom: threshold expressed in exposed units so the same look holds day and night; only the sun,
  // specular glints and emissives (windows, lamp heads) cross it. Night is glowier, rain adds halation.
  const thr = lerp(2.6, 2.2, night) / exposure;   // night: lamp heads (~9) bloom, lit windows (<= 0.5) do not
  ch.bloom.threshold = thr;
  ch.bloom.strength = lerp(0.16, 0.42, night) * P.bloom * (1 + rain * 0.35);
  ch.bloom.radius = lerp(0.45, 0.72, night);
  ch.bloom.enabled = P.bloom > 0.001;

  // --- grade (display-referred). CS2: warm, slightly muted daylight with cool-blue readable shadows and
  // crisp contrast; golden hour keeps blue shadows against the warm sun; night is blue-lifted with warm emissives.
  const g = ch.grade.u;
  const k = P.grade;
  const lift = g.uLift.value, gamma = g.uGamma.value, gain = g.uGain.value;
  lift.set(lerp(0.0, 0.006, night) * k, lerp(0.0, 0.010, night) * k, lerp(0.0, 0.022, night) * k);
  gamma.set(1 + lerp(0.0, -0.05, night) * k, 1 + lerp(0.0, -0.05, night) * k, 1 + lerp(0.0, -0.02, night) * k);
  // golden hour: the sky module's low sun is already very warm and under-exposed; lift it, keep it neutral
  gain.set(
    1 + (lerp(0.015, -0.10, night) + golden * 0.10 - overcast * 0.01) * k,
    1 + (lerp(0.0, -0.09, night) + golden * 0.11) * k,
    1 + (lerp(-0.01, -0.03, night) + golden * 0.14 + overcast * 0.015) * k);
  const sat = 1 + (lerp(0.14, 0.10, night) + golden * 0.04 - rain * 0.12 - overcast * 0.04) * k;
  const vib = (lerp(0.22, 0.24, night) + golden * 0.06) * k;
  const contrast = (1 + (lerp(0.16, 0.05, night) - overcast * 0.03 - rain * 0.02) * k) * P.contrast;
  const temp = (lerp(0.06, -0.12, night) - golden * 0.10 - overcast * 0.06 - rain * 0.05) * k;
  const black = (lerp(0.045, 0.0, night) * (1 - golden) + overcast * 0.006) * k;   // pulls haze off the blacks by day
  g.uGrade.value.set(sat, contrast, temp, P.vignette * lerp(1, 1.35, night));
  g.uCurve.value.set(0.42, vib, 0.0, black);
  // split toning: shadows cool (stronger at golden hour), highlights faintly warm; night keeps the sodium glow
  g.uShadowTint.value.set(
    (lerp(-0.010, -0.004, night) - golden * 0.020) * k,
    (lerp(0.000, 0.002, night) + golden * 0.006) * k,
    (lerp(0.022, 0.012, night) + golden * 0.050) * k);
  // night highlights are the lit windows and lamps: push them toward sodium/tungsten while the facades stay cool
  g.uHighTint.value.set(
    (lerp(0.018, 0.075, night) + golden * 0.02) * k,
    (lerp(0.008, 0.030, night) + golden * 0.006) * k,
    (lerp(-0.010, -0.040, night) - golden * 0.02) * k);
  g.uSharpen.value.set(P.sharpen, 1 / 255);
}

export default {
  name: 'effects',
  dependencies: [],
  // post chain ≈ 24 draws (AO 4, bloom 13, output 1, SMAA 3, grade 1 + scene); the staged block adds ~20 incl. cascades
  budget: { drawCalls: 60, triangles: 900_000 },

  async init(ctx) {
    S.ctx = ctx;
    const q = QUALITY[ctx.quality] || QUALITY.high;
    S.post = !!q.post;
    S.enabled = S.post;
    if (S.post) install(ctx); else ctx.log.info('quality=low: post chain disabled');
  },

  update(dt, ctx) {
    if (S.staged) updateShowcase(dt, ctx, S.night);
    if (!S.chain) return;
    tune(ctx);
  },

  dispose(ctx) {
    uninstall(ctx);
    S.staged = false;
  },

  api: {
    /** Turn the post chain on/off (off = direct renderer.render, AgX tone mapping still in the renderer). */
    setEnabled(v) {
      const on = !!v;
      if (on === S.enabled) return S.enabled;
      S.enabled = on;
      if (on && S.post) { S.failed = false; install(S.ctx); } else uninstall(S.ctx);
      return S.enabled;
    },
    isEnabled() { return S.enabled && !!S.chain; },
    /** 'default' | 'cinematic' | 'clean' | 'flat' */
    setPreset(name) {
      if (!PRESETS[name]) { S.ctx?.log.warn(`unknown preset "${name}" (have ${Object.keys(PRESETS).join(', ')})`); return S.preset; }
      S.preset = name; return S.preset;
    },
    getPreset() { return S.preset; },
    /** dev/profiling: showcase uniforms (window light level etc.) */
    _showcase() { return showcaseUniforms; },
    /** dev/profiling: override individual preset fields ({ao:0} etc.); null clears */
    _override(o) { S.override = o || null; },
    /** dev/profiling: the live chain (passes can be toggled via .composer.passes[i].enabled) */
    _chain() { return S.chain; },
    presets: Object.keys(PRESETS),
    /** Live pass state for tooling. */
    state() {
      const ch = S.chain;
      return {
        enabled: S.enabled, installed: !!ch, failed: S.failed, preset: S.preset, night: S.night, golden: S.golden,
        passes: ch ? ch.composer.passes.map((p) => ({ name: p.constructor.name, enabled: p.enabled })) : [],
        bloom: ch ? { threshold: ch.bloom.threshold, strength: ch.bloom.strength } : null,
        size: ch ? [ch.width, ch.height] : null,
      };
    },
  },

  showcase: {
    description: 'Post chain (depth AO, exposure-aware bloom, AgX + grade, SMAA, close-up DOF) on a staged downtown block: PBR facades with lit windows, roads with markings, street lamps',
    cameras: {
      lamps:   { yaw: 1.05, pitch: 0.12, distance: 42, target: [30, 2, 46] },
      plaza:   { yaw: 2.6, pitch: 0.28, distance: 150, target: [-30, 10, -30] },
    },
    async setup(ctx) {
      await setupShowcase(ctx);
      S.staged = true;
    },
  },
};
