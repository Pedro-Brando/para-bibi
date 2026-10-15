import { describe, it, expect } from 'vitest';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';
import { NAME_SEED } from '../../src/seed/constants';
import { flowerParams, flowerPalette, PARAM_RANGES } from '../../src/flower/params';

const seeds = Array.from({ length: 300 }, (_, i) => cyrb128(`seed-${i}`));

describe('flowerParams', () => {
  it('is deterministic for NAME_SEED', () => {
    expect(flowerParams(sfc32(NAME_SEED))).toEqual(flowerParams(sfc32(NAME_SEED)));
  });
  it('stays inside every range for many seeds', () => {
    for (const s of seeds) {
      const p = flowerParams(sfc32(s));
      for (const [key, [min, max]] of Object.entries(PARAM_RANGES)) {
        const v = p[key as keyof typeof p] as number;
        expect(v, key).toBeGreaterThanOrEqual(min);
        expect(v, key).toBeLessThanOrEqual(max);
      }
      expect([1, 2, 3]).toContain(p.petalLayers);
      expect([0, 1, 2]).toContain(p.sideBuds);
      expect(Number.isInteger(p.petalCount)).toBe(true);
      expect(Number.isInteger(p.leafCount)).toBe(true);
    }
  });
  it('prefers Fibonacci petal counts', () => {
    const counts = seeds.map((s) => flowerParams(sfc32(s)).petalCount);
    const fib = counts.filter((c) => c === 5 || c === 8 || c === 13).length;
    expect(fib / counts.length).toBeGreaterThan(0.5);
  });
});

describe('flowerPalette', () => {
  it('produces pinks: red channel dominates green for petals', () => {
    for (const s of seeds.slice(0, 50)) {
      const pal = flowerPalette(flowerParams(sfc32(s)));
      for (const c of [pal.petalBase, pal.petalTip, pal.core]) {
        expect(c[0]).toBeGreaterThan(c[1]);
        c.forEach((x) => {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
        });
      }
    }
  });
});
