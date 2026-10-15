import * as THREE from 'three/webgpu';
import {
  uniform, uv, vec2, mix, smoothstep, abs, exp, sin, pow, max, dot, normalize,
  positionWorld, cameraPosition, mx_noise_float, color, float, normalWorld,
} from 'three/tsl';
import type { FlowerPalette } from '../../flower/params';
import { growthPositionNode, growthNormalNode, uGrowth } from './growthNode';

export const uLightPos = uniform(new THREE.Vector3(0.3, 1.6, -1.2));
export const uFlash = uniform(0); // relâmpago: 0 a 1
export const uPulse = uniform(0); // graves da música, fase 4; aqui fica em 0

const rgb = (c: [number, number, number]) => color(new THREE.Color(c[0], c[1], c[2]));

function petalMaterial(p: FlowerPalette) {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0 });
  m.positionNode = growthPositionNode;
  m.normalNode = growthNormalNode;
  const t = uv();
  const across = t.x.mul(2).sub(1);
  m.colorNode = mix(rgb(p.petalBase), rgb(p.petalTip), smoothstep(0.05, 0.9, t.y));

  // Veias: nervura central + nervuras em leque, com o domínio deformado por ruído.
  const warp = mx_noise_float(t.mul(vec2(6, 10))).mul(0.08);
  const fan = across.add(warp).div(t.y.add(0.15));
  const side = pow(abs(sin(fan.mul(9))), float(18));
  const central = exp(abs(across.add(warp)).mul(-38));
  // smoothstep com borda inicial maior que a final é indefinido em GLSL; 1 - smoothstep(0.7, 1, y) vale o mesmo.
  const veins = max(central, side.mul(0.7)).mul(smoothstep(0.02, 0.25, t.y)).mul(smoothstep(0.7, 1.0, t.y).oneMinus());

  // Translucidez: luz atravessando a pétala quando a câmera olha para a luz.
  const V = normalize(positionWorld.sub(cameraPosition));
  const toLight = normalize(uLightPos.sub(positionWorld));
  const back = pow(max(dot(V, toLight), 0), float(3)).mul(float(0.35).add(uFlash.mul(2.5)));
  // max(..., 0): erro de arredondamento pode deixar a base negativa e pow(negativo) vira NaN.
  const rim = pow(max(float(1).sub(abs(dot(normalWorld, V.negate()))), 0), float(3)).mul(0.25);

  m.emissiveNode = rgb(p.vein).mul(veins.mul(float(0.9).add(uPulse.mul(0.6))))
    .add(rgb(p.petalTip).mul(back))
    .add(rgb(p.petalTip).mul(rim));
  return m;
}

function simpleMaterial(c: [number, number, number], glow: [number, number, number], glowStrength: number, side: THREE.Side) {
  const m = new THREE.MeshStandardNodeMaterial({ side, roughness: 0.7, metalness: 0 });
  m.positionNode = growthPositionNode;
  m.normalNode = growthNormalNode;
  m.colorNode = rgb(c);
  m.emissiveNode = rgb(glow).mul(glowStrength);
  return m;
}

export function createFlowerMaterials(p: FlowerPalette) {
  const seed = new THREE.MeshBasicNodeMaterial();
  // A semente brilha forte no início e some quando o caule já subiu (1 - smoothstep(0, 0.25, g)).
  seed.colorNode = rgb(p.core).mul(float(4).mul(smoothstep(0.0, 0.25, uGrowth).oneMinus()));
  return {
    petal: petalMaterial(p),
    stem: simpleMaterial(p.stem, p.vein, 0.04, THREE.FrontSide),
    leaf: simpleMaterial(p.leaf, p.vein, 0.06, THREE.DoubleSide),
    stamen: simpleMaterial(p.core, p.core, 1.6, THREE.FrontSide),
    seed,
  };
}
