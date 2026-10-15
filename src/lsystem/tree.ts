// Gramática das árvores de Quarrymill: tronco alto e reto, galhos só no terço de cima, folhagem nas pontas.
import { type Rng, range, int } from '../seed/prng';
import { type Module, type Rules, expand, mod } from './grammar';

export const TRUNK_SEGMENTS = 10;
const GOLDEN_DEG = 137.507764;

export function treeModules(rng: Rng, height: number, baseRadius: number): Module[] {
  const segLen = height / TRUNK_SEGMENTS;
  const radiusAt = (i: number) => baseRadius * (1 - (0.75 * i) / TRUNK_SEGMENTS);
  const firstBranch = int(rng, 5, 6);

  const rules: Rules = {
    T: (m, r) => {
      const i = m.args[0]!;
      if (i >= TRUNK_SEGMENTS) return [mod('L', 1.2)];
      const out: Module[] = [mod('F', segLen, radiusAt(i + 1))];
      if (i >= firstBranch) {
        const n = int(r, 1, 2);
        for (let k = 0; k < n; k++) {
          const len = range(r, 1.6, 3.2) * (1.15 - 0.35 * ((i - firstBranch) / (TRUNK_SEGMENTS - firstBranch)));
          out.push(mod('['), mod('/', i * GOLDEN_DEG + k * 180 + range(r, -25, 25)), mod('&', range(r, 50, 72)),
            mod('B', 3, len, radiusAt(i) * 0.38), mod(']'));
        }
      }
      out.push(mod('/', range(r, -15, 15)), mod('&', range(r, -2.5, 2.5)), mod('T', i + 1));
      return out;
    },
    B: (m, r) => {
      const [k, len, rad] = m.args as [number, number, number];
      if (k <= 0) return [mod('L', range(r, 0.9, 1.2))];
      const out: Module[] = [mod('F', len, rad * 0.7), mod('&', range(r, -12, 4)), mod('/', range(r, -30, 30))];
      if (k >= 2 && r() < 0.7) {
        out.push(mod('['), mod('+', range(r, 30, 45) * (r() < 0.5 ? -1 : 1)), mod('B', k - 2, len * 0.7, rad * 0.5), mod(']'));
      }
      if (k <= 2) out.push(mod('L', range(r, 0.7, 1)));
      out.push(mod('B', k - 1, len * 0.85, rad * 0.7));
      return out;
    },
  };
  // F mínimo no começo: o turtle parte de raio 0,02 e sem isso o tronco nasceria afinado na base.
  return expand([mod('F', 0.001, baseRadius), mod('T', 0)], rules, TRUNK_SEGMENTS + 6, rng);
}
