import { describe, it, expect } from 'vitest';
import { thunderDelay } from '../../src/audio/thunder';

describe('thunderDelay', () => {
  it('is distance / 343, clamped to 0.5..6 s', () => {
    expect(thunderDelay(686)).toBeCloseTo(2);
    expect(thunderDelay(10)).toBe(0.5);
    expect(thunderDelay(10_000)).toBe(6);
  });
});
