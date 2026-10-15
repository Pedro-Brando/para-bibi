import { describe, it, expect } from 'vitest';
import { createClock } from '../../src/core/clock';

describe('createClock', () => {
  it('returns elapsed seconds and clamps long gaps (hidden tab) to 0.1', () => {
    let t = 1000;
    const c = createClock(() => t);
    t += 16;
    expect(c.step()).toBeCloseTo(0.016, 6);
    t += 60_000;
    expect(c.step()).toBe(0.1);
    t += 0;
    expect(c.step()).toBe(0);
  });
});
