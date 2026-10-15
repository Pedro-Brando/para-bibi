import * as THREE from 'three/webgpu';
import {
  color, float, vec3, uv, length, smoothstep, sin, instanceIndex, hash, time, mx_noise_vec3, mix,
} from 'three/tsl';
import { fireflyCount } from './layout';

/** Vaga-lumes instanciados; posição e piscar saem só do índice e do tempo, no vertex shader. */
export function createFireflies() {
  const count = fireflyCount();
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const i = float(instanceIndex);
  const h1 = hash(i.add(11)), h2 = hash(i.add(97)), h3 = hash(i.add(331)), h4 = hash(i.add(733));
  // Anel em volta da flor, de 1,2 a 11 de raio, entre 0,15 e 2,4 de altura.
  const ang = h1.mul(6.2832);
  const rad = float(1.2).add(h2.mul(h2).mul(9.8));
  const base = vec3(ang.cos().mul(rad), float(0.15).add(h3.mul(2.25)), ang.sin().mul(rad));
  const drift = mx_noise_vec3(vec3(h1.mul(40), h2.mul(40), time.mul(0.12).add(h4.mul(10)))).mul(0.9);
  m.positionNode = base.add(drift);
  const blink = smoothstep(0.1, 0.9, sin(time.mul(float(0.8).add(h4.mul(1.4))).add(h1.mul(40))).mul(0.5).add(0.5));
  const glow = smoothstep(0.0, 0.5, length(uv().sub(0.5))).oneMinus();
  const tint = mix(color('#ffb3d9'), color('#ffd59a'), h3);
  m.colorNode = tint.mul(glow.mul(glow)).mul(blink.mul(2.2).add(0.15));
  m.opacityNode = glow;
  m.scaleNode = float(0.07).add(h2.mul(0.05));
  const sprite = new THREE.Sprite(m);
  sprite.count = count;
  sprite.frustumCulled = false;
  return sprite;
}
