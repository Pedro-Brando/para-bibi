import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/core/url';

describe('parseOptions', () => {
  it('defaults', () => {
    expect(parseOptions('')).toEqual({ backend: 'auto', growth: null, freeze: false, dev: false, seed: 'name' });
  });
  it('parses and clamps growth', () => {
    const o = parseOptions('?backend=webgl&growth=1.7&freeze=1&dev=1&seed=random:3');
    expect(o).toEqual({ backend: 'webgl', growth: 1, freeze: true, dev: true, seed: 'random:3' });
    expect(parseOptions('?growth=abc').growth).toBeNull();
    expect(parseOptions('?growth=-1').growth).toBe(0);
  });
});
