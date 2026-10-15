import * as THREE from 'three/webgpu';
import { color, mix, vec2, vec3, vec4, time, uv, positionGeometry, mx_fractal_noise_float, uniform, smoothstep } from 'three/tsl';
import { uFlash } from './flower/materials';

/** 0 sem véu, 1 a tela inteira dentro da névoa da tempestade. */
export const uVeil = uniform(0);

/**
 * Véu de névoa: um quad em espaço de tela na frente de tudo, com fbm animado nas cores da tempestade e aceso
 * pelo relâmpago. Fecha no fim da subida, como se a câmera entrasse nas nuvens acima das copas.
 */
export function createVeil() {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthTest: false, depthWrite: false });
  m.fog = false;
  m.vertexNode = vec4(positionGeometry.xy, 0, 1);
  const aspect = uniform(1);
  const p = uv().mul(vec2(aspect, 1)).mul(2.2);
  const drift = vec2(time.mul(0.035), time.mul(-0.05));
  const n = mx_fractal_noise_float(vec3(p.add(drift), time.mul(0.04)), 5, 2.0, 0.55).mul(0.5).add(0.5);
  const wisps = mx_fractal_noise_float(vec3(p.mul(2.7).sub(drift.mul(2)), time.mul(0.07)), 3).mul(0.5).add(0.5);
  const body = mix(color('#0d0e22'), color('#33335f'), smoothstep(0.25, 0.85, n));
  const lit = body.add(color('#3a3868').mul(wisps.mul(0.35))).add(color('#9b93d8').mul(uFlash.mul(0.35).mul(n)));
  m.colorNode = lit;
  m.opacityNode = uVeil;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1000;
  const resize = () => { aspect.value = window.innerWidth / window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  return mesh;
}
