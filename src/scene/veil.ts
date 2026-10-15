import * as THREE from 'three/webgpu';
import { color, mix, vec2, vec4, time, uv, positionGeometry, uniform, smoothstep } from 'three/tsl';
import { sampleNoise } from './noiseTexture';
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
  // Ruído assado: duas amostras por pixel (o fbm por pixel na tela inteira era o maior custo do véu).
  const n = sampleNoise(p.add(drift).div(4)).r;
  const wisps = sampleNoise(p.mul(2.7).sub(drift.mul(2)).div(8)).g;
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
