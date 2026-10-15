// Disposição de Quarrymill: relevo, riacho, árvores, roda d'água, vaga-lumes. Puro: sem three.
import { cyrb128, type Seed128 } from '../../seed/hash';
import { sfc32, range, int } from '../../seed/prng';

export const WORLD_SEED: Seed128 = cyrb128('Bibi Bilota');

/** Seed da árvore i: a seed "Bibi Bilota" combinada com o índice. */
export function treeSeed(i: number): Seed128 {
  const [a, b, c, d] = WORLD_SEED;
  return [(a ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0, (b + Math.imul(i, 0x85ebca6b)) >>> 0, c, (d ^ i) >>> 0];
}

// Poucos de propósito: o presente precisa rodar liso num PC fraco.
export const FIREFLY_MIN = 24;
export const FIREFLY_MAX = 36;
export const fireflyCount = (): number => int(sfc32(WORLD_SEED), FIREFLY_MIN, FIREFLY_MAX);

export const WATER_Y = -0.1;
export const STREAM_HALF_WIDTH = 0.6;

// Pontos de controle (x, z) do riacho: passa a uns 2 da flor, atrás dela vista da câmera, e vira à
// esquerda ao fundo, onde fica a roda d'água.
const CONTROL: [number, number][] = [
  [16, 3], [7, -0.4], [2.5, -1.6], [-0.5, -2.2], [-3.2, -3.4], [-5, -6.5], [-6.2, -9.6],
  [-9.5, -11.8], [-15, -12.8], [-23, -12], [-33, -14], [-45, -13],
];

function catmullRom(pts: [number, number][], perSegment: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let s = 0; s < perSegment; s++) {
      const t = s / perSegment, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts.at(-1)!);
  return out;
}

export const STREAM_PATH: readonly [number, number][] = catmullRom(CONTROL, 16);

export function distanceToStream(x: number, z: number): number {
  let best = Infinity;
  for (let i = 0; i < STREAM_PATH.length - 1; i++) {
    const [ax, az] = STREAM_PATH[i]!, [bx, bz] = STREAM_PATH[i + 1]!;
    const dx = bx - ax, dz = bz - az;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

const fract = (v: number) => v - Math.floor(v);
const hash2 = (x: number, z: number) => fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453);
const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function valueNoise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz), b = hash2(ix + 1, iz), c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz) * 2 - 1;
}

const fbm = (x: number, z: number) => valueNoise(x, z) * 0.6 + valueNoise(x * 2.1, z * 2.1) * 0.28 + valueNoise(x * 4.3, z * 4.3) * 0.12;

/** Altura do chão: plano na flor, ondulações suaves em volta, leito escavado no riacho. */
export function terrainHeight(x: number, z: number, streamDist = distanceToStream(x, z)): number {
  const r = Math.hypot(x, z);
  const small = fbm(x * 0.45 + 3.1, z * 0.45 - 1.7) * 0.12 * sstep(0.5, 2.5, r);
    const bed = -0.38 * (1 - sstep(STREAM_HALF_WIDTH * 0.7, STREAM_HALF_WIDTH * 1.9, streamDist));
  return small + bed;
}

/**
 * Camadas de silhueta atrás da flor, da mais perto para a mais longe. `dist` é a distância da flor ao plano
 * ao longo da direção em que a câmera olha; `width` e `height` em unidades de cena (metros). O plano começa
 * em y = -2 (abaixo do chão). `ridge` é a altura da faixa de terreno na base, que deixa a camada opaca embaixo.
 */
export interface LayerSpec {
  dist: number; width: number; height: number; trees: number;
  treeHeight: [number, number]; ridge: number; clearCenter: number; mill: boolean;
}

export const LAYER_BOTTOM = -2;

export const LAYERS: readonly LayerSpec[] = [
  { dist: 3.4, width: 14, height: 30, trees: 3, treeHeight: [15, 25], ridge: 0.25, clearCenter: 1.6, mill: false },
  { dist: 6.5, width: 22, height: 30, trees: 5, treeHeight: [15, 25], ridge: 0.45, clearCenter: 1.2, mill: false },
  { dist: 11, width: 34, height: 28, trees: 5, treeHeight: [15, 23], ridge: 0.6, clearCenter: 0, mill: true },
  { dist: 18, width: 48, height: 22, trees: 16, treeHeight: [10, 17], ridge: 1.1, clearCenter: 0, mill: false },
];

/** Na camada com o moinho: casa à esquerda, roda d'água ao lado dela (x local da camada, metros). */
export const MILL = { houseLeft: -11, houseRight: -6.8, wallTop: 2.6, roofTop: 4.6, wheelX: -5, wheelY: 1.2, wheelRadius: 1.7 };

export interface LayerTree { x: number; height: number; radius: number; seedIndex: number }

/** Árvores da camada i: posições, alturas e raios determinísticos, com seeds de cyrb128("Bibi Bilota") + índice. */
export function layerTrees(layer: number): LayerTree[] {
  const spec = LAYERS[layer]!;
  const rng = sfc32(treeSeed(10_000 + layer));
  const out: LayerTree[] = [];
  const half = spec.width / 2 - 1;
  const minGap = spec.width / (spec.trees * 1.8);
  for (let attempt = 0; attempt < 2000 && out.length < spec.trees; attempt++) {
    const x = range(rng, -half, half);
    if (Math.abs(x) < spec.clearCenter) continue;
    if (spec.mill && x > MILL.houseLeft - 1 && x < MILL.wheelX + MILL.wheelRadius + 0.8) continue;
    if (out.some((t) => Math.abs(t.x - x) < minGap)) continue;
    const height = range(rng, spec.treeHeight[0], spec.treeHeight[1]);
    out.push({ x, height, radius: height * range(rng, 0.012, 0.018), seedIndex: layer * 100 + out.length });
  }
  return out;
}
