import * as THREE from 'three/webgpu';
import type { Node } from 'three/webgpu';
import {
  float, vec2, vec3, uv, length, smoothstep, exp, max, min, pow, instanceIndex, time, mx_noise_float, instancedBufferAttribute, dot, hash, varying,
} from 'three/tsl';
import { STAR_STRIDE } from '../../sky/catalog';
import { raDecToVector } from '../../sky/frame';
import { bvToRgb } from '../../sky/color';
import { uPixelAngle, uPulse, uPulseDir, type uEqToHor } from './uniforms';

export const STAR_RADIUS = 380;

type Mat3Node = typeof uEqToHor;
type FloatNode = Node<'float'>;

/**
 * Campo de estrelas instanciado: cada estrela é um sprite cujo centro sai do vetor equatorial girado por
 * `rotation` no vertex shader. Brilho e tamanho pela magnitude, cor pelo B-V, extinção e cintilação pela
 * massa de ar; abaixo do horizonte o sprite encolhe a zero.
 */
export function createStarField(catalog: Float32Array, rotation: Mat3Node, weight: FloatNode) {
  const count = catalog.length / STAR_STRIDE;
  const eq = new Float32Array(count * 3);
  const look = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const o = i * STAR_STRIDE;
    eq.set(raDecToVector(catalog[o]!, catalog[o + 1]!), i * 3);
    look.set([...bvToRgb(catalog[o + 3]!), catalog[o + 2]!], i * 4);
  }
  // instancedBufferAttribute é tipado como Node<string>; o cast só dá o tipo do atributo ao TypeScript.
  const aEq = instancedBufferAttribute(new THREE.InstancedBufferAttribute(eq, 3), 'vec3') as unknown as Node<'vec3'>;
  const aLook = instancedBufferAttribute(new THREE.InstancedBufferAttribute(look, 4), 'vec4') as unknown as Node<'vec4'>;

  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.sizeAttenuation = false;
  m.fog = false;
  const dir = rotation.mul(aEq);
  const sinAlt = max(dir.y, 0);
  // Massa de ar (Rozenberg), limitada perto do horizonte; extinção de 0,25 mag por massa de ar a 700 m.
  const airmass = min(float(1).div(sinAlt.add(exp(sinAlt.mul(-11)).mul(0.025))), 14);
  const mag = aLook.w.add(airmass.sub(1).mul(0.25));
  const flux = exp(mag.sub(1.5).mul(-0.921)); // 10^(-0,4 (m - 1,5))
  const above = smoothstep(-0.005, 0.03, dir.y);
  const twinkleAmp = float(0.12).add(smoothstep(0.6, 0.05, sinAlt).mul(0.55));
  const twinkle = float(1).add(mx_noise_float(vec2(float(instanceIndex).mul(1.37), time.mul(2.6))).mul(twinkleAmp));
  // Pulso: uma em cada três estrelas a menos de uns 9 graus da direção acende por um momento.
  const near = smoothstep(0.988, 0.998, dot(dir, uPulseDir)).mul(hash(instanceIndex).greaterThan(0.66).select(1, 0));
  const pulse = float(1).add(uPulse.mul(near).mul(5));
  const intensity = min(pow(flux, 0.6), 4).mul(1.3).mul(twinkle).mul(above).mul(weight).mul(pulse);
  // Avermelha perto do horizonte: o azul se perde primeiro.
  const tint = aLook.xyz.mul(exp(vec3(0.03, 0.07, 0.16).mul(airmass.sub(1).negate())));
  const sizePx = min(float(3).add(pow(flux, 0.45).mul(6.5)), 24);

  m.positionNode = dir.mul(STAR_RADIUS);
  m.scaleNode = vec2(sizePx.mul(uPixelAngle).mul(above.mul(weight).greaterThan(0.002).select(1, 0)));
  const r = length(uv().sub(0.5)).mul(2);
  const core = smoothstep(1, 0, r);
  // Brilho, cintilação e cor são por estrela: calculados no vértice, não em cada pixel do sprite.
  m.colorNode = varying(tint.mul(intensity));
  m.opacityNode = core.mul(core);
  const sprite = new THREE.Sprite(m);
  sprite.count = count;
  sprite.frustumCulled = false;
  sprite.renderOrder = -8;
  return sprite;
}
