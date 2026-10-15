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
  const albedo = mix(rgb(p.petalBase), rgb(p.petalTip), smoothstep(0.05, 0.9, t.y));
  m.colorNode = albedo;

  // Veias suaves: nervura central, poucas nervuras laterais fracas, domínio pouco deformado por ruído.
  const warp = mx_noise_float(t.mul(vec2(6, 10))).mul(0.03);
  const fan = across.add(warp).div(t.y.add(0.15));
  const side = pow(abs(sin(fan.mul(5))), float(18));
  const central = exp(abs(across.add(warp)).mul(-38));
  // smoothstep com borda inicial maior que a final é indefinido em GLSL; 1 - smoothstep(0.7, 1, y) vale o mesmo.
  const veins = max(central, side.mul(0.25)).mul(smoothstep(0.02, 0.25, t.y)).mul(smoothstep(0.7, 1.0, t.y).oneMinus());

  // Translucidez: luz atravessando a pétala quando a câmera olha para a luz.
  const V = normalize(positionWorld.sub(cameraPosition));
  const toLight = normalize(uLightPos.sub(positionWorld));
  const back = pow(max(dot(V, toLight), 0), float(3)).mul(float(0.18).add(uFlash.mul(1.25)));
  // max(..., 0): erro de arredondamento pode deixar a base negativa e pow(negativo) vira NaN.
  const rim = pow(max(float(1).sub(abs(dot(normalWorld, V.negate()))), 0), float(3)).mul(0.25);

  // A pétala é em parte auto-iluminada (rosa chiclete sob qualquer luz); veias e borda em rosa neon,
  // fortes o bastante para passar do limiar do bloom e brilhar de leve em repouso (bioluminescência).
  m.emissiveNode = albedo.mul(0.5)
    .add(rgb(p.vein).mul(veins.mul(float(2.2).add(uPulse.mul(0.6)))))
    .add(rgb(p.petalTip).mul(back))
    .add(rgb(p.vein).mul(rim.mul(2.8)));
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

/** Crescimento em que o brilho da semente chega a zero; a partir daí a esfera é escondida (main.ts). */
export const SEED_FADE_END = 0.25;

export function createFlowerMaterials(p: FlowerPalette) {
  const seed = new THREE.MeshBasicNodeMaterial();
  // A semente brilha forte no início e some quando o caule já subiu (1 - smoothstep(0, 0.25, g)).
  seed.colorNode = rgb(p.core).mul(float(4).mul(smoothstep(0.0, SEED_FADE_END, uGrowth).oneMinus()));
  return {
    petal: petalMaterial(p),
    // Caule e folhas levemente auto-iluminados na própria cor, para não sumirem no fundo escuro.
    stem: simpleMaterial(p.stem, p.stem, 0.35, THREE.FrontSide),
    leaf: simpleMaterial(p.leaf, p.leaf, 0.35, THREE.DoubleSide),
    stamen: simpleMaterial(p.core, p.core, 2.5, THREE.FrontSide),
    seed,
  };
}
