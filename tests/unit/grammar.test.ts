import { describe, it, expect } from 'vitest';
import { expand, mod, toText, type Rules } from '../../src/lsystem/grammar';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';

const rng = () => sfc32(cyrb128('grammar'));

describe('expand', () => {
  it('reproduces Lindenmayer algae', () => {
    const rules: Rules = {
      A: () => [mod('A'), mod('B')],
      B: () => [mod('A')],
    };
    const out = expand([mod('A')], rules, 5, rng());
    expect(out.map((m) => m.sym).join('')).toBe('ABAABABAABAAB');
  });

  it('supports parametric rules and terminates', () => {
    const rules: Rules = {
      A: (m) => (m.args[0]! > 0 ? [mod('F', m.args[0]!), mod('A', m.args[0]! - 1)] : [mod('X')]),
    };
    const out = expand([mod('A', 3)], rules, 10, rng());
    expect(toText(out)).toBe('F(3)F(2)F(1)X');
  });

  it('keeps modules whose rule returns null', () => {
    const rules: Rules = { A: () => null };
    expect(toText(expand([mod('A', 1)], rules, 3, rng()))).toBe('A(1)');
  });

  it('stochastic rules are deterministic for the same seed and vary across seeds', () => {
    const rules: Rules = {
      A: (_m, r) => (r() < 0.5 ? [mod('A'), mod('L')] : [mod('A'), mod('R')]),
    };
    const a = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s1'))));
    const b = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s1'))));
    const c = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s2'))));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('formats numbers with up to 4 decimals', () => {
    expect(toText([mod('F', 0.123456, 2)])).toBe('F(0.1235,2)');
  });
});
