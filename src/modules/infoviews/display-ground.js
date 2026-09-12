import * as THREE from 'three';

// Own geometries/material; borrow only terrain's height-uniform references and
// immutable shader contract. Cloning avoids disposing another module's GPU buffers.
export class DisplayGround {
  constructor(ctx, surface, baseMaterial, addMesh) {
    this.surface = surface;
    this.visible = false;
    this.records = [];
    const vertexShader = `
#include <common>
#include <fog_pars_vertex>
${surface.vertexPars}
varying vec2 worldUV; varying float lighting; varying float fv; varying float ov;
void main() {
${surface.vertexBegin}
 transformed.y += 0.055;
 vec4 wp = modelMatrix * vec4(transformed, 1.0);
 worldUV = (wp.xz + 1024.0) / 2048.0;
 lighting = 1.0; fv = 0.0; ov = 0.0;
 vec4 mvPosition = viewMatrix * wp;
 gl_Position = projectionMatrix * mvPosition;
 #include <fog_vertex>
}`;
    this.material = new THREE.ShaderMaterial({
      name: 'Infoview exact terrain display surface', vertexShader,
      fragmentShader: baseMaterial.fragmentShader,
      uniforms: {...baseMaterial.uniforms, ...surface.uniforms},
      transparent: baseMaterial.transparent, depthWrite: baseMaterial.depthWrite,
      depthTest: baseMaterial.depthTest, fog: baseMaterial.fog,
      toneMapped: baseMaterial.toneMapped, side: baseMaterial.side,
      polygonOffset: baseMaterial.polygonOffset,
      polygonOffsetFactor: baseMaterial.polygonOffsetFactor,
      polygonOffsetUnits: baseMaterial.polygonOffsetUnits,
    });
    ctx.modules.environment?.setupMaterial?.(this.material);
    for (const patch of surface.patches) {
      const geometry = patch.geometry.clone();
      const mesh = addMesh(new THREE.Mesh(geometry, this.material));
      mesh.name = `infoview-display-lod${patch.lod}`;
      mesh.frustumCulled = false;
      mesh.matrixAutoUpdate = false;
      mesh.raycast = () => {};
      const rec = {patch, mesh, versions: {}, reflectionCount: null};
      // The water pass uses its own cheaper terrain proxy topology, not this
      // main-camera surface. Do not reflect an unmatched main-camera film.
      mesh.onBeforeRender = () => {
        if (surface.reflectionActive()) {
          rec.reflectionCount = geometry.instanceCount;
          geometry.instanceCount = 0;
        }
      };
      mesh.onAfterRender = () => {
        if (rec.reflectionCount !== null) {
          geometry.instanceCount = rec.reflectionCount;
          rec.reflectionCount = null;
        }
      };
      this.records.push(rec);
    }
    this.sync();
  }
  setVisible(visible) { this.visible = !!visible; this.sync(); }
  sync() {
    for (const rec of this.records) {
      const {patch, mesh, versions} = rec, source = patch.geometry, geometry = mesh.geometry;
      for (const name of ['aChunk', 'aNbr']) {
        const from = source.attributes[name], to = geometry.attributes[name];
        if (versions[name] === from.version) continue;
        to.array.set(from.array);
        to.clearUpdateRanges();
        to.addUpdateRange(0, source.instanceCount * from.itemSize);
        to.needsUpdate = true;
        versions[name] = from.version;
      }
      geometry.instanceCount = source.instanceCount;
      mesh.visible = this.visible && patch.visible && geometry.instanceCount > 0;
    }
  }
  stats() {
    const patches = this.records.map(({patch, mesh}) => ({
      lod: patch.lod, instances: mesh.geometry.instanceCount,
      visible: mesh.visible,
      triangles: mesh.visible ? mesh.geometry.index.count / 3 * mesh.geometry.instanceCount : 0,
    }));
    return {kind: 'terrain-display-lod-v1', draws: patches.filter(p => p.visible).length,
      triangles: patches.reduce((n, p) => n + p.triangles, 0), patches};
  }
}
