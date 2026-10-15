import { describe, it, expect } from 'vitest';
import { nightsTogether } from '../../src/nights/count';
import { nightStar } from '../../src/nights/stars';

describe('nightsTogether', () => {
  it('counts the night they met as 1 and adds one per Brasília midnight', () => {
    expect(nightsTogether(new Date('2026-10-03T03:53:00-03:00'))).toBe(1);
    expect(nightsTogether(new Date('2026-10-15T12:00:00-03:00'))).toBe(13);
    expect(nightsTogether(new Date('2026-10-15T23:59:00-03:00'))).toBe(13);
    expect(nightsTogether(new Date('2026-10-16T00:00:00-03:00'))).toBe(14);
  });
  it('is 1 before the meeting', () => {
    expect(nightsTogether(new Date('2026-10-02T21:00:00-03:00'))).toBe(1);
    expect(nightsTogether(new Date('2020-01-01T00:00:00Z'))).toBe(1);
  });
});

describe('nightStar', () => {
  it('is deterministic per index', () => {
    expect(nightStar(5)).toEqual(nightStar(5));
    expect(nightStar(5)).not.toEqual(nightStar(6));
  });
  it('sits in a band around Orion', () => {
    for (let i = 0; i < 400; i++) {
      const { offset } = nightStar(i);
      const r = Math.hypot(offset[0], offset[1]);
      expect(r).toBeGreaterThanOrEqual(10);
      expect(r).toBeLessThanOrEqual(26);
    }
  });
});
