import * as THREE from 'three/webgpu';
import {
  color, float, mix, normalize, positionLocal, smoothstep, max, vec2, time, pow,
} from 'three/tsl';
import { uFlash } from '../flower/materials';
import { sampleNoise } from '../noiseTexture';
import { uCoverage, uWorldBlend } from './uniforms';

/** Fundo noturno: gradiente do horizonte ao zênite, Eorzea (01:01 ET) cruzando para o céu real. */
export function createBackdrop() {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false });
  m.fog = false;
  const dir = normalize(positionLocal);
  const h = smoothstep(-0.05, 0.75, dir.y);
  // Eorzea à 01:01: azul-violeta fundo, com um véu lavanda no horizonte.
  const eorzea = mix(color('#2a2d57'), color('#0a0b1c'), pow(h, 0.6));
  // Céu real: quase preto azulado, um pouco mais claro no horizonte.
  const real = mix(color('#121a33'), color('#03050c'), pow(h, 0.5));
  m.colorNode = mix(eorzea, real, uWorldBlend);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 24), m);
  // Opaco e sem escrever profundidade: desenhado depois das outras peças opacas, só onde nada as cobriu.
  mesh.renderOrder = 50;
  mesh.frustumCulled = false;
  return mesh;
}

/**
 * Nuvens de tempestade 2D: fbm projetado num plano acima da câmera, arrastado pelo vento, acendido pelo
 * relâmpago. `uCoverage` sobe ou desce o limiar sobre o ruído, então o céu abre por buracos que crescem.
 */
export function createClouds() {
  const m = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, transparent: true, depthWrite: false });
  m.fog = false;
  const dir = normalize(positionLocal);
  const up = max(dir.y, 0);
  const proj = dir.xz.div(up.add(0.18));
  const wind = vec2(time.mul(0.018), time.mul(0.006));
  // Ruído assado (src/scene/noiseTexture.ts): duas amostras por pixel em vez de 8 oitavas de fbm.
  const n = sampleNoise(proj.mul(0.9).add(wind).div(4)).r;
  const detail = sampleNoise(proj.mul(3.1).sub(wind.mul(1.6)).div(8)).g;
  const field = n.mul(0.8).add(detail.mul(0.2));
  // coverage 1: limiar abaixo de todo o ruído (céu fechado); 0: acima de tudo (céu limpo).
  const thr = mix(float(0.92), float(-0.05), uCoverage);
  const density = smoothstep(thr, thr.add(0.16), field);
  // Contraste de tempestade: partes finas cinza-lavanda, núcleos densos quase pretos.
  const body = mix(color('#43425f'), color('#0b0c18'), smoothstep(0.3, 0.72, field));
  const lit = color('#d9c8ec').mul(uFlash.mul(field.mul(0.9).add(0.25)));
  // Perto do horizonte as nuvens ficam mais claras e lavanda, como o véu da noite de Eorzea.
  const haze = color('#34365c').mul(smoothstep(0.35, 0.0, up).mul(0.5));
  m.colorNode = body.add(haze).add(lit);
  m.opacityNode = density.mul(0.97);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), m);
  mesh.renderOrder = -2;
  mesh.frustumCulled = false;
  return mesh;
}
