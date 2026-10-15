import { describe, it, expect } from 'vitest';
import { equatorialToHorizontalMatrix, altitudeDeg, applyMat3, raDecToVector } from '../../src/sky/frame';
import { bodies } from '../../src/sky/bodies';
import { bvToRgb } from '../../src/sky/color';
import { CITIES, cityAt } from '../../src/sky/cities';
import { stormFromCoverage } from '../../src/sky/storm';

// 2026-10-03 06:53 UTC (03:53 BRT). Valores conferidos com astronomy-engine.
const DATE = new Date('2026-10-03T06:53:00Z');
const rad = (d: number) => (d * Math.PI) / 180;
// J2000 (graus): ascensão reta, declinação.
const STARS = {
  rigel: [78.6345, -8.2016], betelgeuse: [88.7929, 7.4071], sirius: [101.2872, -16.7161],
  canopus: [95.988, -52.6957], acrux: [186.6496, -63.0991],
} as const;
const alt = (star: keyof typeof STARS, m: number[]) => altitudeDeg(rad(STARS[star][0]), rad(STARS[star][1]), m);
const altOf = (v: [number, number, number]) => (Math.asin(v[1]) * 180) / Math.PI;

describe('equatorialToHorizontalMatrix', () => {
  const sp = equatorialToHorizontalMatrix(DATE, CITIES.saoPaulo.lat, CITIES.saoPaulo.lon);
  const gv = equatorialToHorizontalMatrix(DATE, CITIES.valadares.lat, CITIES.valadares.lon);
  it('is a 3x3 rotation (9 numbers, orthonormal)', () => {
    expect(sp).toHaveLength(9);
    const v = applyMat3(sp, raDecToVector(1.1, -0.4));
    expect(Math.hypot(...v)).toBeCloseTo(1, 6);
  });
  it('São Paulo altitudes', () => {
    expect(Math.abs(alt('rigel', sp) - 72)).toBeLessThan(0.5);
    expect(Math.abs(alt('betelgeuse', sp) - 53)).toBeLessThan(0.5);
    // O plano dizia 59°; o astronomy-engine dá 58,38° tanto por esta matriz quanto por Equator + Horizon
    // (as outras quatro batem), então o valor do plano estava arredondado de outro cálculo.
    expect(Math.abs(alt('sirius', sp) - 58.4)).toBeLessThan(0.5);
    expect(Math.abs(alt('canopus', sp) - 54)).toBeLessThan(0.5);
    expect(Math.abs(alt('acrux', sp) - 9)).toBeLessThan(0.5);
  });
  it('Governador Valadares altitudes', () => {
    expect(Math.abs(alt('rigel', gv) - 78)).toBeLessThan(0.5);
    expect(Math.abs(alt('sirius', gv) - 63)).toBeLessThan(0.5);
    expect(Math.abs(alt('acrux', gv) - 7)).toBeLessThan(0.5);
  });
  it('scene axes: south celestial pole is south (+z) and up by the latitude', () => {
    const pole = applyMat3(sp, [0, 0, -1]);
    expect(altOf(pole)).toBeCloseTo(23.55, 0);
    expect(pole[2]).toBeGreaterThan(0.8); // -z é norte, então o sul fica em +z
    expect(Math.abs(pole[0])).toBeLessThan(0.05);
  });
});

describe('bodies', () => {
  const sp = bodies(DATE, CITIES.saoPaulo);
  const gv = bodies(DATE, CITIES.valadares);
  it('Moon is 53% lit, 31° up in SP and 37° in GV', () => {
    expect(Math.abs(sp.moon.fraction - 0.53)).toBeLessThan(0.01);
    expect(Math.abs(altOf(sp.moon.dir) - 31)).toBeLessThan(1);
    expect(Math.abs(altOf(gv.moon.dir) - 37)).toBeLessThan(1);
  });
  it('sun direction lights the Moon at its phase', () => {
    const cos = sp.moon.dir.reduce((s, x, i) => s + x * sp.moon.sunDir[i]!, 0);
    // fração iluminada = (1 + cos(ângulo de fase)) / 2, e o ângulo de fase ≈ 180° − elongação.
    expect(Math.abs((1 - cos) / 2 - sp.moon.fraction)).toBeLessThan(0.02);
    expect(Math.hypot(...sp.moon.sunDir)).toBeCloseTo(1, 6);
  });
  it('Mars 19°, Jupiter 8°, Saturn 29° in SP', () => {
    const byName = Object.fromEntries(sp.planets.map((p) => [p.name, p]));
    expect(Math.abs(altOf(byName.mars!.dir) - 19)).toBeLessThan(1);
    expect(Math.abs(altOf(byName.jupiter!.dir) - 8)).toBeLessThan(1);
    expect(Math.abs(altOf(byName.saturn!.dir) - 29)).toBeLessThan(1);
    expect(byName.jupiter!.mag).toBeLessThan(-1.5);
  });
});

describe('cities', () => {
  it('blends latitude and longitude from SP (0) to GV (1)', () => {
    expect(cityAt(0)).toEqual(CITIES.saoPaulo);
    expect(cityAt(1)).toEqual(CITIES.valadares);
    expect(cityAt(0.5).lat).toBeCloseTo((-23.55 - 18.85) / 2, 6);
    expect(CITIES.saoPaulo.height).toBe(700);
  });
});

describe('bvToRgb', () => {
  it('bv 0.0 is bluish white', () => {
    const [r, g, b] = bvToRgb(0);
    expect(b).toBeGreaterThanOrEqual(r);
    expect(Math.min(r, g, b)).toBeGreaterThan(0.5);
    expect(Math.max(r, g, b)).toBeCloseTo(1, 6);
  });
  it('bv 1.5 is orange', () => {
    const [r, g, b] = bvToRgb(1.5);
    expect(r).toBeGreaterThan(b);
    expect(r).toBeGreaterThan(g);
  });
});

describe('stormFromCoverage', () => {
  it('storm at 1, clear at 0, rain and lightning stop together', () => {
    expect(stormFromCoverage(1)).toEqual({ rain: 1, lightning: true });
    expect(stormFromCoverage(0)).toEqual({ rain: 0, lightning: false });
    let prev = 0;
    for (let c = 0; c <= 1.0001; c += 0.05) {
      const s = stormFromCoverage(c);
      expect(s.rain).toBeGreaterThanOrEqual(prev);
      if (!s.lightning) expect(s.rain).toBeLessThan(0.5);
      prev = s.rain;
    }
  });
});
