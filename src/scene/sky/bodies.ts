import * as THREE from 'three/webgpu';
import {
  color, float, uniform, normalWorld, dot, smoothstep, positionLocal, mx_fractal_noise_float, uv, length, vec2,
} from 'three/tsl';
import type { Vec3 } from '../../sky/frame';
import { uWorldBlend, uPixelAngle } from './uniforms';

const MOON_DISTANCE = 350;
/** Raio angular exagerado (a Lua real tem 0,26°) para o quarto minguante se ler na tela. */
const MOON_ANGULAR_RADIUS = (0.9 * Math.PI) / 180;

/** Lua: esfera iluminada pela direção do Sol, então a fase sai da geometria. Mares por ruído sutil. */
export function createMoon() {
  const uSunDir = uniform(new THREE.Vector3(0, 1, 0));
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false });
  m.fog = false;
  const lit = smoothstep(-0.04, 0.12, dot(normalWorld, uSunDir));
  const maria = mx_fractal_noise_float(positionLocal.mul(0.5), 4).mul(0.5).add(0.5);
  const albedo = float(1).sub(smoothstep(0.45, 0.7, maria).mul(0.32));
  m.colorNode = color('#f3eedf').mul(albedo).mul(lit).mul(1.6).add(color('#1c2238').mul(0.12));
  m.opacityNode = uWorldBlend;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(MOON_DISTANCE * Math.tan(MOON_ANGULAR_RADIUS), 48, 24), m);
  mesh.renderOrder = -6;
  mesh.frustumCulled = false;
  return {
    mesh,
    set(dir: Vec3, sunDir: Vec3) {
      mesh.position.set(dir[0], dir[1], dir[2]).multiplyScalar(MOON_DISTANCE);
      uSunDir.value.set(sunDir[0], sunDir[1], sunDir[2]);
    },
  };
}

const PLANET_TINT = { mars: '#ffb08a', jupiter: '#fff1d8', saturn: '#ffe7b0' } as const;

/** Planeta: um ponto mais brilhante que as estrelas, sem cintilar. */
export function createPlanet(name: keyof typeof PLANET_TINT) {
  const uMag = uniform(0);
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.sizeAttenuation = false;
  m.fog = false;
  const flux = uMag.sub(1.5).mul(-0.921).exp();
  const r = length(uv().sub(0.5)).mul(2);
  const core = smoothstep(1, 0, r);
  m.colorNode = color(PLANET_TINT[name]).mul(flux.pow(0.5).min(2.2)).mul(uWorldBlend);
  m.opacityNode = core.mul(core);
  m.scaleNode = vec2(float(4).add(flux.pow(0.35).mul(3)).mul(uPixelAngle));
  const sprite = new THREE.Sprite(m);
  sprite.renderOrder = -7;
  sprite.frustumCulled = false;
  return {
    sprite,
    set(dir: Vec3, mag: number) {
      sprite.position.set(dir[0], dir[1], dir[2]).multiplyScalar(370);
      sprite.visible = dir[1] > -0.01;
      uMag.value = mag;
    },
  };
}
