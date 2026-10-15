import { describe, it, expect } from 'vitest';
import { boltPoints, lightningSchedule } from '../../src/scene/world/bolt';
import { fireflyCount, FIREFLY_MIN, FIREFLY_MAX, layerTrees, LAYERS, distanceToStream, terrainHeight, treeSeed } from '../../src/scene/world/layout';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';
import type { Vec3 } from '../../src/lsystem/vec3';

const rngOf = (s: string) => sfc32(cyrb128(s));

function distToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const t = Math.min(1, Math.max(0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}

describe('boltPoints', () => {
  const start: Vec3 = [10, 80, -60];
  const end: Vec3 = [4, 0, -55];
  it('is deterministic', () => {
    expect(boltPoints(rngOf('a'), start, end, 6)).toEqual(boltPoints(rngOf('a'), start, end, 6));
    expect(boltPoints(rngOf('a'), start, end, 6)).not.toEqual(boltPoints(rngOf('b'), start, end, 6));
  });
  it('main channel runs from start to end and has branches', () => {
    const paths = boltPoints(rngOf('c'), start, end, 6);
    expect(paths[0]![0]).toEqual(start);
    expect(paths[0]!.at(-1)).toEqual(end);
    expect(paths[0]!.length).toBe(2 ** 6 + 1);
    expect(paths.length).toBeGreaterThan(1);
  });
  it('keeps every point within 25% of the length of the straight line', () => {
    const len = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
    for (const seed of ['c', 'd', 'e', 'f', 'g']) {
      for (const path of boltPoints(rngOf(seed), start, end, 7)) {
        for (const p of path) {
          expect(p.every(Number.isFinite)).toBe(true);
          expect(distToSegment(p, start, end)).toBeLessThanOrEqual(0.25 * len + 1e-9);
        }
      }
    }
  });
});

describe('lightningSchedule', () => {
  it('is deterministic with every interval in [6, 14]', () => {
    const a = lightningSchedule(rngOf('storm'), 600);
    expect(a).toEqual(lightningSchedule(rngOf('storm'), 600));
    expect(a.length).toBeGreaterThan(600 / 14 - 2);
    for (let i = 1; i < a.length; i++) {
      const d = a[i]! - a[i - 1]!;
      expect(d).toBeGreaterThanOrEqual(6);
      expect(d).toBeLessThanOrEqual(14);
    }
    expect(a.at(-1)!).toBeLessThanOrEqual(600);
  });
});

describe('world layout', () => {
  it('firefly count comes from the seed and stays in range', () => {
    const n = fireflyCount();
    expect(n).toBe(fireflyCount());
    expect(n).toBeGreaterThanOrEqual(FIREFLY_MIN);
    expect(n).toBeLessThanOrEqual(FIREFLY_MAX);
    expect(FIREFLY_MIN).toBe(40);
    expect(FIREFLY_MAX).toBe(90);
  });
  it('silhouette layers: deterministic trees inside each layer, tall trunks up front, center clear', () => {
    expect(LAYERS.length).toBeGreaterThanOrEqual(4);
    expect(LAYERS.length).toBeLessThanOrEqual(6);
    let total = 0;
    LAYERS.forEach((spec, i) => {
      const trees = layerTrees(i);
      expect(trees).toEqual(layerTrees(i));
      expect(trees.length).toBe(spec.trees);
      total += trees.length;
      for (const t of trees) {
        expect(Math.abs(t.x)).toBeLessThanOrEqual(spec.width / 2);
        expect(Math.abs(t.x)).toBeGreaterThanOrEqual(spec.clearCenter);
        expect(t.height).toBeGreaterThanOrEqual(spec.treeHeight[0]);
        expect(t.height).toBeLessThanOrEqual(spec.treeHeight[1]);
      }
      if (i > 0) expect(spec.dist).toBeGreaterThan(LAYERS[i - 1]!.dist);
    });
    expect(LAYERS[0]!.treeHeight[0]).toBeGreaterThanOrEqual(15);
    expect(total).toBeGreaterThanOrEqual(25);
    expect(treeSeed(0)).not.toEqual(treeSeed(1));
  });
  it('the flower sits at ground level and the stream is 1.5 to 3 away', () => {
    expect(Math.abs(terrainHeight(0, 0))).toBeLessThan(0.02);
    const d = distanceToStream(0, 0);
    expect(d).toBeGreaterThan(1.5);
    expect(d).toBeLessThan(3);
  });
});
