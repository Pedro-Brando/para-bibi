import * as THREE from 'three/webgpu';
import { color, mix, normalize, positionLocal, smoothstep, max, vec3, time, mx_fractal_noise_float } from 'three/tsl';
import { uFlash } from '../flower/materials';

/** Céu provisório de tempestade (o bloco B substitui): gradiente e nuvens de ruído que o relâmpago acende. */
export function createSky() {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  m.fog = false;
  const dir = normalize(positionLocal);
  const up = max(dir.y, 0);
  const grad = mix(color('#262f52'), color('#07080f'), smoothstep(0.0, 0.6, up));
  const proj = dir.xz.div(up.add(0.25));
  const clouds = mx_fractal_noise_float(vec3(proj.mul(1.4).add(time.mul(0.01)), time.mul(0.02)), 3).mul(0.5).add(0.5);
  const lit = mix(color('#2a3150'), color('#d9c8ec'), uFlash);
  m.colorNode = grad.add(lit.mul(smoothstep(0.35, 0.85, clouds)).mul(uFlash.mul(0.9).add(0.12)));
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), m);
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
}
