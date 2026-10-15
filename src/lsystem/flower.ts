import type { FlowerParams } from '../flower/params';
import { type Rng, range, sampleDistinct } from '../seed/prng';
import { type Module, type Rules, expand, mod } from './grammar';

export const STEM_SEGMENTS = 12;
const GOLDEN_DEG = 137.507764;

export function flowerModules(p: FlowerParams, rng: Rng): Module[] {
  const segLen = p.stemHeight / STEM_SEGMENTS;
  const radiusAt = (i: number) => 0.018 * (1 - (0.55 * i) / STEM_SEGMENTS);
  const leafAt = new Set(sampleDistinct(rng, [1, 2, 3, 4, 5, 6, 7], p.leafCount));
  const budPool = [4, 5, 6, 7, 8, 9].filter((i) => !leafAt.has(i));
  const budAt = new Set(sampleDistinct(rng, budPool, p.sideBuds));
  const leanDeg = (p.stemBend * 30) / STEM_SEGMENTS;

  const rules: Rules = {
    A: (m, r) => {
      const i = m.args[0]!;
      if (i >= STEM_SEGMENTS) return [mod('H', 1)];
      const out: Module[] = [mod('F', segLen, radiusAt(i + 1))];
      if (leafAt.has(i)) {
        out.push(mod('['), mod('/', i * GOLDEN_DEG), mod('&', 55), mod('L', range(r, 0.8, 1.15)), mod(']'));
      }
      if (budAt.has(i)) {
        out.push(mod('['), mod('/', i * GOLDEN_DEG + 70), mod('&', 32), mod('S', 3, radiusAt(i) * 0.6), mod(']'));
      }
      out.push(mod('/', range(r, -12, 12)), mod('&', leanDeg + range(r, -2, 2)), mod('A', i + 1));
      return out;
    },
    S: (m) => {
      const k = m.args[0]!;
      const r = m.args[1]!;
      if (k <= 0) return [mod('H', 0.42)];
      return [mod('F', segLen * 0.7, r * 0.85), mod('&', -6), mod('S', k - 1, r * 0.85)];
    },
  };
  return expand([mod('A', 0)], rules, STEM_SEGMENTS + 6, rng);
}
