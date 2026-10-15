import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cyrb128 } from '../../src/seed/hash';
import { sfc32, range, int, weighted, sampleDistinct } from '../../src/seed/prng';
import { NAME_SEED } from '../../src/seed/constants';

describe('cyrb128', () => {
  it('matches reference values', () => {
    expect(cyrb128('Bibi Bilota')).toEqual([72183447, 1154968852, 1883980313, 902418664]);
    expect(cyrb128('abc')).toEqual([1181011423, 830437656, 3964173471, 1611500297]);
  });
  it('normalizes NFC and trims', () => {
    expect(cyrb128('  abc ')).toEqual(cyrb128('abc'));
    // NFD (e + U+0301 combining acute) must hash like NFC (U+00E9).
    expect(cyrb128('Jose\u0301')).toEqual(cyrb128('Jos\u00e9'));
  });
  it('scripts/seed.mjs (the standalone copy that generated NAME_SEED) has not drifted from cyrb128', () => {
    const script = fileURLToPath(new URL('../../scripts/seed.mjs', import.meta.url));
    const out = execFileSync(process.execPath, [script, 'abc'], { encoding: 'utf8' });
    expect(JSON.parse(out)).toEqual(cyrb128('abc'));
  });
});

describe('sfc32', () => {
  it('matches reference sequence', () => {
    const r = sfc32(cyrb128('Bibi Bilota'));
    expect(r()).toBeCloseTo(0.495829378022, 10);
    expect(r()).toBeCloseTo(0.427309657447, 10);
    expect(r()).toBeCloseTo(0.983035505982, 10);
  });
  it('is deterministic and in [0,1)', () => {
    const a = sfc32(NAME_SEED);
    const b = sfc32(NAME_SEED);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('NAME_SEED starts the expected sequence', () => {
    const r = sfc32(NAME_SEED);
    expect(r()).toBeCloseTo(0.440792766865, 10);
  });
});

describe('helpers', () => {
  it('int is inclusive and bounded', () => {
    const r = sfc32(cyrb128('abc'));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = int(r, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });
  it('range is bounded', () => {
    const r = sfc32(cyrb128('abc'));
    for (let i = 0; i < 1000; i++) {
      const v = range(r, -1, 3);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(3);
    }
  });
  it('weighted respects zero weights', () => {
    const r = sfc32(cyrb128('abc'));
    for (let i = 0; i < 500; i++) {
      expect(weighted(r, [['a', 1], ['b', 0]])).toBe('a');
    }
  });
  it('sampleDistinct returns distinct members, capped by pool size', () => {
    const r = sfc32(cyrb128('abc'));
    const s = sampleDistinct(r, [1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
    s.forEach((v) => expect([1, 2, 3, 4, 5]).toContain(v));
    expect(sampleDistinct(r, [1, 2], 5).sort()).toEqual([1, 2]);
  });
});
