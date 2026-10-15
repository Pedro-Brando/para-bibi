import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { decodeCatalog, STAR_STRIDE, type CatalogMeta } from '../../src/sky/catalog';
import { ORION_HIPS, ORION_LINES } from '../../src/sky/orion';

const bin = readFileSync('public/stars.bin');
const meta = JSON.parse(readFileSync('public/stars-meta.json', 'utf8')) as CatalogMeta;
const stars = decodeCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
const deg = (r: number) => (r * 180) / Math.PI;

describe('star catalog', () => {
  it('has every star of d3-celestial stars.6.json, four floats each', () => {
    expect(meta.count).toBe(5044);
    expect(stars.length).toBe(meta.count * STAR_STRIDE);
    expect(meta.hip.length).toBe(meta.count);
  });
  it('normalizes RA to [0, 2π) and keeps declination in range', () => {
    for (let i = 0; i < meta.count; i++) {
      const ra = stars[i * STAR_STRIDE]!, dec = stars[i * STAR_STRIDE + 1]!;
      expect(ra >= 0 && ra < 2 * Math.PI).toBe(true);
      expect(Math.abs(dec) <= Math.PI / 2).toBe(true);
    }
  });
  it('stores Betelgeuse and Sirius where d3-celestial puts them', () => {
    const at = (hip: number) => meta.hip.indexOf(hip) * STAR_STRIDE;
    expect(deg(stars[at(27989)]!)).toBeCloseTo(88.7929, 3);
    expect(deg(stars[at(27989) + 1]!)).toBeCloseTo(7.4071, 3);
    expect(deg(stars[at(32349)]!)).toBeCloseTo(101.2872, 3);
    expect(stars[at(32349) + 2]!).toBeLessThan(-1.4); // Sírius, magnitude -1,46
  });
  it('contains every Orion star used by the lines', () => {
    const missing = ORION_HIPS.filter((h) => !meta.hip.includes(h));
    expect(missing, `HIP ausentes do catálogo: ${missing.join(', ')}`).toEqual([]);
    for (const [a, b] of ORION_LINES) expect(ORION_HIPS).toContain(a), expect(ORION_HIPS).toContain(b);
    expect(ORION_LINES.length).toBe(8);
  });
});
