import { describe, it, expect } from 'vitest';
import { oklchToLinearSrgb, clampRgb } from '../../src/color/oklch';

describe('oklchToLinearSrgb', () => {
  it('maps the OKLCH coordinates of sRGB red to (1,0,0)', () => {
    const [r, g, b] = oklchToLinearSrgb(0.627955, 0.257683, 29.2339);
    expect(r).toBeCloseTo(1, 3);
    expect(g).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
  });
  it('maps L=1, C=0 to white', () => {
    oklchToLinearSrgb(1, 0, 0).forEach((c) => expect(c).toBeCloseTo(1, 4));
  });
  it('clamps into [0,1]', () => {
    expect(clampRgb([1.2, -0.1, 0.5])).toEqual([1, 0, 0.5]);
  });
});
