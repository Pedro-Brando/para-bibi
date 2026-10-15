import { type Rng, range, int, weighted } from '../seed/prng';
import { type RGB, oklchToLinearSrgb, clampRgb } from '../color/oklch';

export interface FlowerParams {
  petalCount: number;
  petalLayers: 1 | 2 | 3;
  petalLength: number;
  petalWidth: number;
  petalCurl: number;
  petalRuffle: number;
  petalTwist: number;
  petalReflex: number;
  sideBuds: 0 | 1 | 2;
  leafCount: number;
  hue: number;
  stemHeight: number;
  stemBend: number;
}

// Unidades de cena: a flor inteira tem cerca de 1,2 de altura.
export const PARAM_RANGES = {
  petalCount: [5, 13],
  petalLayers: [1, 3],
  petalLength: [0.22, 0.36],
  petalWidth: [0.1, 0.18],
  petalCurl: [0, 1],
  petalRuffle: [0, 1],
  petalTwist: [-0.4, 0.4],
  petalReflex: [0, 0.6],
  sideBuds: [0, 2],
  leafCount: [2, 5],
  hue: [330, 355],
  stemHeight: [0.9, 1.3],
  stemBend: [0, 0.35],
} as const satisfies Record<keyof FlowerParams, readonly [number, number]>;

export function flowerParams(rng: Rng): FlowerParams {
  const R = PARAM_RANGES;
  const petalCount = weighted(rng, [
    [5, 3], [8, 3], [13, 2], [6, 1], [7, 1], [9, 1], [10, 1], [11, 1], [12, 1],
  ] as const);
  return {
    petalCount,
    petalLayers: weighted(rng, [[1, 1], [2, 2], [3, 1]] as const),
    petalLength: range(rng, R.petalLength[0], R.petalLength[1]),
    petalWidth: range(rng, R.petalWidth[0], R.petalWidth[1]),
    petalCurl: range(rng, R.petalCurl[0], R.petalCurl[1]),
    petalRuffle: range(rng, R.petalRuffle[0], R.petalRuffle[1]),
    petalTwist: range(rng, R.petalTwist[0], R.petalTwist[1]),
    petalReflex: range(rng, R.petalReflex[0], R.petalReflex[1]),
    sideBuds: weighted(rng, [[0, 1], [1, 2], [2, 1]] as const),
    leafCount: int(rng, R.leafCount[0], R.leafCount[1]),
    hue: range(rng, R.hue[0], R.hue[1]),
    stemHeight: range(rng, R.stemHeight[0], R.stemHeight[1]),
    stemBend: range(rng, R.stemBend[0], R.stemBend[1]),
  };
}

export interface FlowerPalette {
  petalBase: RGB;
  petalTip: RGB;
  core: RGB;
  vein: RGB;
  leaf: RGB;
  stem: RGB;
}

export function flowerPalette(p: FlowerParams): FlowerPalette {
  const c = (L: number, C: number, h: number) => clampRgb(oklchToLinearSrgb(L, C, h));
  return {
    petalBase: c(0.62, 0.2, p.hue - 5),
    petalTip: c(0.86, 0.08, p.hue),
    core: c(0.6, 0.22, p.hue - 10),
    vein: c(0.72, 0.19, p.hue - 8),
    leaf: c(0.38, 0.07, 175),
    stem: c(0.34, 0.06, 165),
  };
}
