// environment — physically based sky/sun/moon/stars/clouds, CSM sun+moon shadows, PMREM sky lighting,
// exposure per time of day, height fog with sun in-scatter, cloud shadows, weather + rain.
// The ONLY module that adds lights to the scene or touches renderer state.
import * as THREE from 'three';
import { makeNoiseTexture } from './noise.js';
import { Sky, CloudMap } from './sky.js';
import { Lighting } from './lighting.js';
import { Rain } from './rain.js';
import { U } from './shaders.js';
import { transmittance, skyRadiance, SUN_TOA, SUN_TINT, MOON_SCALE, MOON_TINT } from './atmosphere.js';
import { setupShowcase, updateShowcase } from './showcase.js';

const PRESETS = {
  clear:  { cloudiness: 0.10, rain: 0, fogDensity: 0.00028, wind: 2.0 },
  partly: { cloudiness: 0.40, rain: 0, fogDensity: 0.00034, wind: 3.2 },
  cloudy: { cloudiness: 0.74, rain: 0, fogDensity: 0.00060, wind: 4.5 },
  rain:   { cloudiness: 0.96, rain: 0.85, fogDensity: 0.00110, wind: 7.0 },
  fog:    { cloudiness: 0.70, rain: 0, fogDensity: 0.0080, wind: 1.0 },
};

const CLOUD_HEIGHT = 1500;
const CLOUD_SCALE = 9000;
const LUT_ANGLE = Math.cos(THREE.MathUtils.degToRad(0.6));

// module state (single instance)
const S = {
  ctx: null, sky: null, lighting: null, rain: null, noise: null, cloudMap: null, staged: false,
  cloudMapOff: new THREE.Vector2(1e9, 1e9), cloudMapTh: -1,
  sunDir: new THREE.Vector3(0, 1, 0), moonDir: new THREE.Vector3(0, -1, 0), lightDir: new THREE.Vector3(0, 1, 0),
  lutSun: new THREE.Vector3(0, 0, 0), lutDirty: true, pmremDirty: true, pmremTimer: 99, lutTimer: 99,
  weatherDirty: true, windOff: new THREE.Vector2(), cirrusOff: new THREE.Vector2(), time: 0,
  sunT: [0, 0, 0], moonT: [0, 0, 0], cloudSunT: [0, 0, 0], cloudMoonT: [0, 0, 0],
  zenith: [0, 0, 0], horizon: [0, 0, 0], mid: [0, 0, 0], fogCol: new THREE.Color(), skyLight: new THREE.Color(),
  sunColor: new THREE.Color(1, 1, 1), lightColor: new THREE.Color(1, 1, 1), lightIntensity: 0, exposure: 1, night: 0,
  sunIntensity: 0, moonIntensity: 0, preset: 'partly',
};
const _v = new THREE.Vector3(), _a = [0, 0, 0], _s1 = [0, 0, 0], _s2 = [0, 0, 0], _c = new THREE.Color();
const _windDir = new THREE.Vector2();

function sunDirectionAt(hour, clock, out) {
  // sunrise east (+X) at 6h, south (+Z) at noon, sunset west (-X) at 18h; elevation from the core clock model
  const el = clock.sunElevation(hour);
  const phi = ((hour - 6) / 12) * Math.PI;
  const ce = Math.cos(el);
  return out.set(Math.cos(phi) * ce, Math.sin(el), Math.sin(phi) * ce);
}

function applyPreset(w, name) {
  const p = PRESETS[name] || PRESETS.partly;
  w.cloudiness = p.cloudiness; w.rain = p.rain; w.fogDensity = p.fogDensity; w.wind.speed = p.wind;
  S.preset = PRESETS[name] ? name : 'partly';
}

function smooth(e0, e1, x) { const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
const maxc = (a) => Math.max(a[0], a[1], a[2]);

/** Recompute CPU-side sky samples (called only when the LUT is re-rendered). */
function computeSkySamples(w) {
  const sunI = [SUN_TOA * SUN_TINT[0], SUN_TOA * SUN_TINT[1], SUN_TOA * SUN_TINT[2]];
  const moonI = [SUN_TOA * MOON_SCALE * MOON_TINT[0], SUN_TOA * MOON_SCALE * MOON_TINT[1], SUN_TOA * MOON_SCALE * MOON_TINT[2]];
  const nightFloor = (y) => [0.0030 * (0.75 + 0.25 * (1 - y)) + 0.020 * Math.exp(-y * 7), 0.0046 * (0.75 + 0.25 * (1 - y)) + 0.013 * Math.exp(-y * 7), 0.0105 * (0.75 + 0.25 * (1 - y)) + 0.007 * Math.exp(-y * 7)];
  const sample = (dir, out) => {
    skyRadiance(dir, S.sunDir, sunI, 0.9, _s1);
    skyRadiance(dir, S.moonDir, moonI, 0.9, _s2);
    const nf = nightFloor(dir.y);
    for (let i = 0; i < 3; i++) out[i] = _s1[i] + _s2[i] + S.night * nf[i];
    // overcast blend (same as the LUT)
    const lum = out[0] * 0.2126 + out[1] * 0.7152 + out[2] * 0.0722;
    const k = w.cloudiness * w.cloudiness * 0.85;
    const ov = lum * (0.85 + 0.55 * dir.y);
    out[0] = out[0] * (1 - k) + ov * 0.97 * k; out[1] = out[1] * (1 - k) + ov * 0.985 * k; out[2] = out[2] * (1 - k) + ov * k;
    return out;
  };
  sample(_v.set(0, 1, 0), S.zenith);
  const acc = (el, out) => {
    out[0] = out[1] = out[2] = 0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sample(_v.set(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)), _a);
      out[0] += _a[0] / 8; out[1] += _a[1] / 8; out[2] += _a[2] / 8;
    }
  };
  acc(0.05, S.horizon);
  acc(0.45, S.mid);
  S.fogCol.setRGB(S.horizon[0], S.horizon[1], S.horizon[2]);
  // sky light: hemisphere-ish average (zenith weighted with mid elevations)
  S.skyLight.setRGB((S.zenith[0] + 2 * S.mid[0]) / 3, (S.zenith[1] + 2 * S.mid[1]) / 3, (S.zenith[2] + 2 * S.mid[2]) / 3);
}

export default {
  name: 'environment',
  dependencies: [],
  budget: { drawCalls: 15, triangles: 60000 },

  async init(ctx) {
    S.ctx = ctx;
    const w = ctx.world.weather;
    if (w.wetness === undefined) w.wetness = 0;
    w.moonDir = new THREE.Vector3(0, -1, 0);
    w.lightDir = new THREE.Vector3(0, 1, 0);
    w.sunColor = new THREE.Color(1, 1, 1);
    w.lightIntensity = 0; w.exposure = 1; w.night = 0; w.preset = 'partly';
    const wanted = ctx.world.flags.weather;
    applyPreset(w, wanted && PRESETS[wanted] ? wanted : 'partly');
    w.preset = S.preset;
    if (wanted && !PRESETS[wanted]) ctx.log.warn(`unknown weather preset "${wanted}", using partly`);

    // renderer state: this module owns it
    ctx.renderer.shadowMap.enabled = true;
    ctx.renderer.shadowMap.type = THREE.PCFShadowMap;
    ctx.renderer.toneMapping = THREE.AgXToneMapping;
    ctx.renderer.toneMappingExposure = 1.0;

    S.noise = makeNoiseTexture(ctx.rng.fork('noise'), 256);
    S.lighting = new Lighting(ctx);
    S.sky = new Sky(ctx, S.noise);
    S.cloudMap = new CloudMap(ctx, 256, 6000);
    S.rain = new Rain(ctx, 9000);
    ctx.scene.fog = new THREE.FogExp2(0xbfd0e6, 0.0003);
    ctx.scene.environmentIntensity = 0.8;
    S.lutDirty = true; S.pmremDirty = true; S.pmremTimer = 99; S.lutTimer = 99;
    this.update(0, ctx);
  },

  update(dt, ctx) {
    const w = ctx.world.weather;
    const clock = ctx.clock;
    const cam = ctx.camera.camera;
    S.time += dt;
    const hour = clock.hour;

    // ---- celestial directions
    sunDirectionAt(hour, clock, S.sunDir);
    sunDirectionAt(hour + 12.35, clock, S.moonDir);
    S.moonDir.y = S.moonDir.y * 0.92 + 0.05; S.moonDir.normalize();
    const sunUp = smooth(-0.015, 0.03, S.sunDir.y);
    const moonUp = smooth(-0.02, 0.05, S.moonDir.y);
    S.night = 1 - smooth(-0.13, 0.02, S.sunDir.y);
    const day = smooth(-0.10, 0.12, S.sunDir.y);

    // ---- per-frame transmittance -> sun / moon colours & intensities
    _v.copy(S.sunDir); _v.y = Math.max(_v.y, 0.004); _v.normalize();
    transmittance(_v, 150, S.sunT);
    transmittance(_v, CLOUD_HEIGHT, S.cloudSunT);
    _v.copy(S.moonDir); _v.y = Math.max(_v.y, 0.004); _v.normalize();
    transmittance(_v, 150, S.moonT);
    transmittance(_v, CLOUD_HEIGHT, S.cloudMoonT);
    const coverFactor = smooth(0.45, 0.97, w.cloudiness);
    const cloudAtten = (1 - 0.9 * coverFactor) * Math.exp(-Math.max(w.fogDensity - 0.001, 0) * 350);
    const sunMax = maxc(S.sunT) * SUN_TOA;
    S.sunIntensity = sunMax * sunUp * cloudAtten;
    S.sunColor.setRGB(S.sunT[0] * SUN_TINT[0], S.sunT[1] * SUN_TINT[1], S.sunT[2] * SUN_TINT[2]);
    if (sunMax > 1e-4) S.sunColor.multiplyScalar(1 / maxc(S.sunT));
    const moonMax = maxc(S.moonT) * SUN_TOA * MOON_SCALE;
    S.moonIntensity = moonMax * moonUp * cloudAtten;
    const useSun = S.sunIntensity >= S.moonIntensity;
    if (useSun) {
      S.lightDir.copy(S.sunDir); S.lightColor.copy(S.sunColor); S.lightIntensity = S.sunIntensity;
    } else {
      S.lightDir.copy(S.moonDir);
      S.lightColor.setRGB(S.moonT[0] * MOON_TINT[0], S.moonT[1] * MOON_TINT[1], S.moonT[2] * MOON_TINT[2]);
      if (moonMax > 1e-6) S.lightColor.multiplyScalar(1 / maxc(S.moonT));
      S.lightIntensity = S.moonIntensity;
    }
    // keep shadows sane when the light is nearly horizontal
    if (S.lightDir.y < 0.06) { S.lightDir.y = 0.06; S.lightDir.normalize(); }
    S.lighting.setLight(S.lightDir, S.lightColor, S.lightIntensity);

    // ---- exposure per time of day (AgX): noon 1.0, golden hour a touch brighter, deep night ~2.6
    const golden = (1 - smooth(0.02, 0.3, S.sunDir.y)) * day;
    S.exposure = THREE.MathUtils.lerp(3.0, 1.25, day) + golden * 0.25 + day * coverFactor * 0.18;
    ctx.renderer.toneMappingExposure = S.exposure;

    // ---- weather dynamics
    w.wetness += (w.rain - w.wetness) * Math.min(1, dt * (w.rain > w.wetness ? 0.25 : 0.03));
    _windDir.set(w.wind.x, w.wind.z);
    if (_windDir.lengthSq() < 1e-6) _windDir.set(1, 0);
    _windDir.normalize();
    S.windOff.addScaledVector(_windDir, -w.wind.speed * dt * 7.0);
    S.cirrusOff.addScaledVector(_windDir, -w.wind.speed * dt * 11.0);

    // ---- shared uniforms: clouds, cloud shadows, fog
    const th = 0.62 - w.cloudiness * 0.5;
    U.cloudA.value.set(S.windOff.x, S.windOff.y, 1 / CLOUD_SCALE, th);
    if (S.cloudMapOff.distanceToSquared(S.windOff) > 4 || S.cloudMapTh !== th) {
      S.cloudMapOff.copy(S.windOff); S.cloudMapTh = th;
      S.cloudMap.render();
    }
    const ly = Math.max(S.lightDir.y, 0.2);
    U.cloudB.value.set(-S.lightDir.x / ly, -S.lightDir.z / ly, CLOUD_HEIGHT, 0.85 * (1 - coverFactor) * smooth(0.0, 0.12, S.lightDir.y) * smooth(0.04, 0.3, w.cloudiness));
    const fogK = THREE.MathUtils.lerp(1 / 320, 1 / 90, smooth(0.0008, 0.004, w.fogDensity));
    U.fogA.value.set(fogK, 0, 0.3 * (1 - w.cloudiness * 0.7), 1);
    U.fogSun.value.copy(S.sunDir);
    U.fogSunCol.value.copy(S.sunColor).multiplyScalar(0.32 * S.sunIntensity / SUN_TOA);

    // ---- sky LUT + PMREM (only when the sun moved or the weather changed)
    S.lutTimer += dt; S.pmremTimer += dt;
    if (S.weatherDirty || S.sunDir.dot(S.lutSun) < LUT_ANGLE) S.lutDirty = true;
    if (S.lutDirty && (S.lutTimer > 0.5 || S.weatherDirty)) {
      S.lutDirty = false; S.weatherDirty = false; S.lutTimer = 0;
      S.lutSun.copy(S.sunDir);
      const sunI = [SUN_TOA * SUN_TINT[0], SUN_TOA * SUN_TINT[1], SUN_TOA * SUN_TINT[2]];
      const moonI = [SUN_TOA * MOON_SCALE * MOON_TINT[0], SUN_TOA * MOON_SCALE * MOON_TINT[1], SUN_TOA * MOON_SCALE * MOON_TINT[2]];
      S.sky.renderLut(S.sunDir, S.moonDir, sunI, moonI, w.cloudiness, S.night);
      computeSkySamples(w);
      S.pmremDirty = true;
    }
    if (S.pmremDirty && S.pmremTimer > 2.5) {
      S.pmremDirty = false; S.pmremTimer = 0;
      S.lighting.updateEnvironment(S.sky.lut.texture);
    }

    // ---- fog
    const fog = ctx.scene.fog;
    fog.color.copy(S.fogCol);
    fog.density = w.fogDensity;

    // ---- sky dome uniforms
    const su = S.sky.mat.uniforms;
    su.uSunDir.value.copy(S.sunDir); su.uMoonDir.value.copy(S.moonDir); su.uLightDir.value.copy(S.lightDir);
    const sunMx = maxc(S.sunT);
    su.uSunDisc.value.setRGB(S.sunT[0] * SUN_TINT[0], S.sunT[1] * SUN_TINT[1], S.sunT[2] * SUN_TINT[2]).multiplyScalar(sunUp * (sunMx > 1e-5 ? Math.pow(sunMx, 0.6) / sunMx : 0));
    su.uNight.value = S.night; su.uTime.value = S.time; su.uCloudiness.value = w.cloudiness;
    const cs = su.uCloudSun.value;
    cs.setRGB(S.cloudSunT[0] * SUN_TINT[0], S.cloudSunT[1] * SUN_TINT[1], S.cloudSunT[2] * SUN_TINT[2]).multiplyScalar(SUN_TOA / Math.PI * 0.92 * sunUp);
    _c.setRGB(S.cloudMoonT[0] * MOON_TINT[0], S.cloudMoonT[1] * MOON_TINT[1], S.cloudMoonT[2] * MOON_TINT[2]).multiplyScalar(SUN_TOA * MOON_SCALE / Math.PI * 0.92 * moonUp);
    cs.add(_c);
    su.uCloudAmb.value.setRGB(S.zenith[0], S.zenith[1], S.zenith[2]).multiplyScalar(1.35).add(_c.setRGB(0.0015, 0.002, 0.004).multiplyScalar(S.night));
    su.uCirrus.value = THREE.MathUtils.clamp(w.cloudiness * 1.6, 0, 0.85) * (1 - smooth(0.6, 0.95, w.cloudiness) * 0.8);
    su.uCirrusOff.value.copy(S.cirrusOff); su.uWindDir.value.copy(_windDir);
    su.uStarBright.value = 0.9 * (1 - w.cloudiness * 0.5);
    S.sky.update(cam.position);

    // ---- shadows (cascades follow the camera)
    S.lighting.update(ctx.camera.distance);

    // ---- rain
    S.rain.update(dt, cam, w, S.skyLight);

    // ---- publish
    w.sunDir.copy(S.sunDir);
    w.sunIntensity = S.sunIntensity;
    w.skyLight.copy(S.skyLight);
    w.moonDir.copy(S.moonDir);
    w.lightDir.copy(S.lightDir);
    w.lightIntensity = S.lightIntensity;
    w.sunColor.copy(S.sunColor);
    w.exposure = S.exposure;
    w.night = S.night;

    if (S.staged) updateShowcase(w, S.night);
  },

  dispose(ctx) {
    ctx.scene.fog = null;
    S.rain?.dispose(ctx);
    S.sky?.dispose();
    S.cloudMap?.dispose();
    S.lighting?.dispose();
    S.noise?.dispose();
    S.rain = S.sky = S.lighting = S.noise = null;
  },

  api: {
    /** Set a weather preset ('clear'|'partly'|'cloudy'|'rain'|'fog') or a partial {cloudiness, rain, fogDensity, wind:{x,z,speed}}. */
    setWeather(preset) {
      const w = S.ctx.world.weather;
      if (typeof preset === 'string') applyPreset(w, preset);
      else if (preset && typeof preset === 'object') {
        if (preset.cloudiness !== undefined) w.cloudiness = THREE.MathUtils.clamp(preset.cloudiness, 0, 1);
        if (preset.rain !== undefined) w.rain = THREE.MathUtils.clamp(preset.rain, 0, 1);
        if (preset.fogDensity !== undefined) w.fogDensity = Math.max(0, preset.fogDensity);
        if (preset.wind) { if (preset.wind.x !== undefined) w.wind.x = preset.wind.x; if (preset.wind.z !== undefined) w.wind.z = preset.wind.z; if (preset.wind.speed !== undefined) w.wind.speed = preset.wind.speed; }
        S.preset = 'custom';
      }
      w.preset = S.preset;
      S.weatherDirty = true;
      S.ctx.events.emit('weather:changed', { cloudiness: w.cloudiness, rain: w.rain, fogDensity: w.fogDensity, preset: S.preset });
    },
    getWeather() { return S.preset; },
    getSunDirection() { return S.sunDir.clone(); },
    getMoonDirection() { return S.moonDir.clone(); },
    getLightDirection() { return S.lightDir.clone(); },
    getExposure() { return S.exposure; },
    getNight() { return S.night; },
    /** Hook a material for cascaded shadows + fog uniforms (done automatically for scene materials; explicit for ShaderMaterials). */
    setupMaterial(material) { S.lighting?.setupMaterial(material); },
    /** Force a PMREM rebuild on the next frame. */
    refreshEnvironment() { S.lutDirty = true; S.weatherDirty = true; S.pmremTimer = 99; },
    presets: Object.keys(PRESETS),
    /** internals for tooling/critics (read-only use) */
    _debug() { return { S, U }; },
  },

  showcase: {
    description: 'Physically based sky, sun/moon/stars, clouds with sun-lit edges, CSM shadows on a PBR test scene',
    cameras: {
      sunset: { yaw: Math.PI / 2, pitch: 0.10, distance: 260, target: [0, 18, 0] },
      sky: { yaw: Math.PI, pitch: 0.12, distance: 120, target: [0, 90, -260] },
      sunrise: { yaw: -Math.PI / 2, pitch: 0.10, distance: 260, target: [0, 18, 0] },
      moonrise: { yaw: -1.92, pitch: 0.09, distance: 200, target: [0, 30, 0] },
    },
    async setup(ctx) {
      await setupShowcase(ctx);
      S.staged = true;
    },
  },
};
