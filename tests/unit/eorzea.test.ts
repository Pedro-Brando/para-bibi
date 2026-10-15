import { describe, it, expect } from 'vitest';
import { eorzeaTime, FIRST_DATE_UNIX } from '../../src/eorzea/time';
import { weatherChance, southShroudWeather, weatherLabelPt } from '../../src/eorzea/weather';

// Horários em BRT (UTC-3) de 2026-10-03, como deslocamento a partir de 03:53:00 (FIRST_DATE_UNIX).
const brt = (h: number, m: number, s = 0) => FIRST_DATE_UNIX + (h * 3600 + m * 60 + s) - (3 * 3600 + 53 * 60);
const windowOf = (unix: number) => unix - (unix % 1400);

describe('eorzeaTime', () => {
  it('FIRST_DATE_UNIX is 01:01 ET', () => {
    expect(FIRST_DATE_UNIX).toBe(1791010380);
    expect(eorzeaTime(FIRST_DATE_UNIX)).toEqual({ hours: 1, minutes: 1 });
  });
  it('one Eorzea hour is 175 real seconds', () => {
    expect(eorzeaTime(0)).toEqual({ hours: 0, minutes: 0 });
    expect(eorzeaTime(175)).toEqual({ hours: 1, minutes: 0 });
    expect(eorzeaTime(175 * 24)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('weatherChance (checked against eorzea-weather 3.2.0)', () => {
  it.each([
    [brt(3, 26, 40), 14],
    [brt(3, 50, 0), 10],
    [brt(4, 13, 20), 82],
    [brt(4, 36, 40), 42],
    [brt(3, 3, 20), 90],
  ])('window %i has chance %i', (unix, chance) => {
    expect(windowOf(unix)).toBe(unix);
    expect(weatherChance(unix)).toBe(chance);
  });
  it('stays in 0..99', () => {
    for (let u = 1_700_000_000; u < 1_700_000_000 + 1400 * 200; u += 1400) {
      const c = weatherChance(u);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(99);
    }
  });
});

describe('southShroudWeather', () => {
  it('maps the evening of the first date', () => {
    expect(southShroudWeather(weatherChance(brt(3, 30)))).toBe('thunder');
    expect(southShroudWeather(weatherChance(brt(3, 53)))).toBe('thunder');
    expect(southShroudWeather(weatherChance(brt(4, 20)))).toBe('clearSkies');
  });
  it('uses the community thresholds', () => {
    expect([0, 4, 5, 9, 10, 24, 25, 29, 30, 39, 40, 69, 70, 99].map(southShroudWeather)).toEqual([
      'fog', 'fog', 'thunderstorms', 'thunderstorms', 'thunder', 'thunder', 'fog', 'fog',
      'clouds', 'clouds', 'fairSkies', 'fairSkies', 'clearSkies', 'clearSkies',
    ]);
  });
  it('labels in Portuguese', () => {
    expect(weatherLabelPt('thunder')).toBe('Trovoada');
    expect(weatherLabelPt('thunderstorms')).toBe('Tempestade');
    expect(weatherLabelPt('fog')).toBe('Neblina');
    expect(weatherLabelPt('clouds')).toBe('Nublado');
    expect(weatherLabelPt('fairSkies')).toBe('Céu bom');
    expect(weatherLabelPt('clearSkies')).toBe('Céu limpo');
  });
});
