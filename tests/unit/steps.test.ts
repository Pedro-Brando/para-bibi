import { describe, it, expect } from 'vitest';
import { STEPS, StepNav, stepDuration, nameFacts, seedHex } from '../../src/timeline/steps';
import { stateAt, POEM_SLOTS } from '../../src/timeline/timeline';
import { NAME_SEED } from '../../src/seed/constants';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';

describe('STEPS', () => {
  it('is strictly increasing in p, starts at 0 and ends at 1', () => {
    expect(STEPS[0]!.p).toBe(0);
    expect(STEPS[STEPS.length - 1]!.p).toBe(1);
    for (let i = 1; i < STEPS.length; i++) expect(STEPS[i]!.p).toBeGreaterThan(STEPS[i - 1]!.p);
  });
  it('has the grown flower, four name stages and one step per poem slot except the couplet pair', () => {
    expect(stateAt(STEPS.find((s) => s.id === 'flower')!.p).growth).toBe(1);
    expect(STEPS.filter((s) => s.id.startsWith('name')).length).toBe(4);
    // 9 versos, a linha em branco e o dístico: 11 passos de poema.
    const poem = STEPS.filter((s) => s.id.startsWith('poem'));
    expect(poem.length).toBe(11);
    for (const s of poem) expect(stateAt(s.p).poemLine).toBeLessThan(POEM_SLOTS);
  });
  it('lets the flower growth and the name dissolve take longer and keeps other durations between 1.2 and 4 s', () => {
    for (let i = 1; i < STEPS.length; i++) {
      const d = stepDuration(i);
      if (STEPS[i]!.id === 'flower') expect(d).toBeGreaterThanOrEqual(5);
      // O nome que se desfaz no número também pede mais tempo.
      else if (STEPS[i]!.id === 'name-2') expect(d).toBeLessThanOrEqual(5);
      else { expect(d).toBeGreaterThanOrEqual(1.2); expect(d).toBeLessThanOrEqual(4); }
    }
  });
});

describe('StepNav', () => {
  const settle = (nav: StepNav, p: number) => {
    let last = p;
    for (let i = 0; i < 2000 && nav.busy; i++) last = nav.update(0.05) ?? last;
    return last;
  };
  it('moves exactly one step per command', () => {
    const nav = new StepNav();
    nav.command(1, 0);
    expect(settle(nav, 0)).toBe(STEPS[1]!.p);
    nav.command(1, STEPS[1]!.p);
    expect(settle(nav, 0)).toBe(STEPS[2]!.p);
    nav.command(-1, STEPS[2]!.p);
    expect(settle(nav, 0)).toBe(STEPS[1]!.p);
  });
  it('queues at most one command during a transition and never skips a step', () => {
    const nav = new StepNav();
    nav.command(1, 0);
    nav.command(1, 0);
    nav.command(1, 0);
    nav.command(1, 0);
    const seen: number[] = [];
    let last = 0;
    for (let i = 0; i < 4000 && nav.busy; i++) {
      const p = nav.update(0.05)!;
      for (const s of STEPS) if (last < s.p && p >= s.p) seen.push(s.p);
      last = p;
    }
    expect(last).toBe(STEPS[2]!.p);
    expect(seen).toEqual([STEPS[1]!.p, STEPS[2]!.p]);
  });
  it('from a free scroll position goes to the nearest step in that direction', () => {
    const nav = new StepNav();
    const mid = (STEPS[5]!.p + STEPS[6]!.p) / 2;
    nav.command(1, mid);
    expect(settle(nav, mid)).toBe(STEPS[6]!.p);
    nav.command(-1, mid);
    expect(settle(nav, mid)).toBe(STEPS[5]!.p);
  });
  it('ignores commands past either end and can be cancelled', () => {
    const nav = new StepNav();
    nav.command(-1, 0);
    expect(nav.busy).toBe(false);
    nav.command(1, 1);
    expect(nav.busy).toBe(false);
    nav.command(1, 0);
    nav.command(1, 0);
    nav.cancel();
    expect(nav.busy).toBe(false);
    expect(nav.update(0.05)).toBeNull();
  });
  it('eases monotonically between the two steps', () => {
    const nav = new StepNav();
    nav.command(1, 0);
    let prev = 0;
    while (nav.busy) { const p = nav.update(0.03)!; expect(p).toBeGreaterThanOrEqual(prev); prev = p; }
  });
});

describe('the name flower', () => {
  it('shows the seed as 32 hex digits in four groups', () => {
    const hex = seedHex(NAME_SEED);
    expect(hex.replace(/ /g, '')).toMatch(/^[0-9a-f]{32}$/);
    expect(hex.split(' ').length).toBe(4);
    expect(hex.split(' ')[0]).toBe(NAME_SEED[0].toString(16).padStart(8, '0'));
  });
  it('reads the facts from the flower params of the seed', () => {
    const p = flowerParams(sfc32(NAME_SEED));
    const facts = nameFacts(NAME_SEED);
    expect(facts).toContain(`${p.petalCount} pétalas`);
    expect(facts).toContain(`${Math.round(p.hue)}°`);
    expect(facts).toContain(`${p.leafCount} folha`);
  });
});
