import { describe, it, expect } from 'vitest';
import { flowerModules, STEM_SEGMENTS } from '../../src/lsystem/flower';
import { interpret } from '../../src/lsystem/turtle';
import { toText } from '../../src/lsystem/grammar';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';
import { NAME_SEED } from '../../src/seed/constants';

function build(seed: readonly [number, number, number, number]) {
  const rng = sfc32(seed);
  const p = flowerParams(rng);
  return { p, modules: flowerModules(p, rng) };
}

describe('flowerModules', () => {
  it('is deterministic for NAME_SEED', () => {
    expect(toText(build(NAME_SEED).modules)).toBe(toText(build(NAME_SEED).modules));
  });
  it('has the right number of stem segments, leaves and heads', () => {
    for (let i = 0; i < 100; i++) {
      const { p, modules } = build(cyrb128(`fg-${i}`));
      const syms = modules.map((m) => m.sym);
      expect(syms.filter((s) => s === 'L').length).toBe(p.leafCount);
      expect(syms.filter((s) => s === 'H').length).toBe(1 + p.sideBuds);
      expect(syms.filter((s) => s === '[').length).toBe(syms.filter((s) => s === ']').length);
      const skel = interpret(modules);
      expect(skel.branches[0]!.nodes.length).toBeGreaterThan(STEM_SEGMENTS);
    }
  });
  it('the main head sits near stemHeight', () => {
    const { p, modules } = build(NAME_SEED);
    const head = interpret(modules).attachments.find((a) => a.kind === 'head' && a.scale === 1)!;
    expect(head.position[1]).toBeGreaterThan(p.stemHeight * 0.75);
    expect(head.position[1]).toBeLessThan(p.stemHeight * 1.05);
  });
});
