import { describe, it, expect } from 'vitest';
import { buildFlower } from '../../src/scene/flower/build';
import { buildHead } from '../../src/scene/flower/head';
import { vertexCount, growVertex } from '../../src/scene/flower/meshdata';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';
import { NAME_SEED } from '../../src/seed/constants';
import { cyrb128 } from '../../src/seed/hash';

describe('buildFlower', () => {
  it('is deterministic', () => {
    const a = buildFlower(NAME_SEED).meshes.petals.position;
    const b = buildFlower(NAME_SEED).meshes.petals.position;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('every attribute is finite for many seeds', () => {
    for (let i = 0; i < 40; i++) {
      const { meshes } = buildFlower(cyrb128(`b-${i}`));
      for (const m of [meshes.stem, meshes.leaves, meshes.petals, meshes.stamens]) {
        for (const arr of [m.position, m.normal, m.uv, m.aAge, m.aPivot, m.aAxis, m.aClosed, m.aGrow]) {
          expect(arr.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('nothing but the stem base exists at growth 0 (Review Focus 2)', () => {
    const { meshes } = buildFlower(NAME_SEED);
    const m = meshes.petals;
    for (let v = 0; v < vertexCount(m); v += 7) {
      const p = growVertex(
        [m.position[v * 3]!, m.position[v * 3 + 1]!, m.position[v * 3 + 2]!],
        m.aAge[v]!,
        [m.aPivot[v * 3]!, m.aPivot[v * 3 + 1]!, m.aPivot[v * 3 + 2]!],
        [m.aAxis[v * 3]!, m.aAxis[v * 3 + 1]!, m.aAxis[v * 3 + 2]!],
        m.aClosed[v]!,
        [m.aGrow[v * 2]!, m.aGrow[v * 2 + 1]!],
        0,
      );
      expect(p).toEqual([m.aPivot[v * 3], m.aPivot[v * 3 + 1], m.aPivot[v * 3 + 2]]);
    }
  });

  it('petal ages end before 1 so the flower is fully open at growth 1', () => {
    const { meshes } = buildFlower(NAME_SEED);
    let maxEnd = 0;
    for (let v = 0; v < vertexCount(meshes.petals); v++) {
      maxEnd = Math.max(maxEnd, meshes.petals.aAge[v]! + meshes.petals.aGrow[v * 2 + 1]!);
    }
    expect(maxEnd).toBeLessThanOrEqual(1);
  });

  it('extreme seeds build fast and under the vertex budget (Review Focus 3)', () => {
    let worst = 0;
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      const { meshes } = buildFlower(cyrb128(`x-${i}`));
      worst = Math.max(worst, vertexCount(meshes.stem) + vertexCount(meshes.leaves) + vertexCount(meshes.petals) + vertexCount(meshes.stamens));
    }
    const per = (performance.now() - t0) / 20;
    expect(per).toBeLessThan(200);
    expect(worst).toBeLessThan(200_000);
  });

  it('the maximum head (13 petals x 3 layers) stays within budget', () => {
    const p = { ...flowerParams(sfc32(NAME_SEED)), petalCount: 13, petalLayers: 3 as const };
    const head = { kind: 'head' as const, position: [0, 1, 0] as [number, number, number], heading: [0, 1, 0] as [number, number, number], left: [-1, 0, 0] as [number, number, number], up: [0, 0, 1] as [number, number, number], scale: 1, age: 0.45 };
    const t0 = performance.now();
    const { petals, stamens } = buildHead(head, p, sfc32(NAME_SEED));
    expect(performance.now() - t0).toBeLessThan(200);
    expect(vertexCount(petals) + vertexCount(stamens)).toBeLessThan(200_000);
  });
});
