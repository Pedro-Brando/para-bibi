import { describe, it, expect } from 'vitest';
import { stateAt, ACTS, POEM_SLOTS } from '../../src/timeline/timeline';

describe('stateAt', () => {
  it('starts as a seed under the Eorzea storm', () => {
    const s = stateAt(0);
    expect(s).toMatchObject({ growth: 0, cameraT: 0, rain: 1, coverage: 1, worldBlend: 0, orion: 0, cityBlend: 0, poemLine: 0, nights: 0, labelOpacity: 1 });
    expect(s.realLabel).toBe(false);
  });
  it('grows the flower during the flower act only', () => {
    expect(stateAt(ACTS.flower[0]).growth).toBe(0);
    expect(stateAt(0.25).growth).toBeCloseTo(0.5, 5);
    expect(stateAt(ACTS.flower[1]).growth).toBe(1);
    expect(stateAt(0.9).growth).toBe(1);
  });
  it('keeps the storm until the sky opens, then clears it', () => {
    expect(stateAt(0.6)).toMatchObject({ rain: 1, coverage: 1, worldBlend: 0 });
    expect(stateAt(0.64).worldBlend).toBe(0);
    expect(stateAt(0.7)).toMatchObject({ rain: 0, coverage: 0, worldBlend: 1 });
    expect(stateAt(0.65).coverage).toBeCloseTo(0.5, 5);
  });
  it('draws Orion over the real sky act', () => {
    expect(stateAt(0.7).orion).toBe(0);
    expect(stateAt(0.78).orion).toBe(1);
    expect(stateAt(0.74).phraseOpacity).toBeGreaterThan(0.9);
    expect(stateAt(0.6).phraseOpacity).toBe(0);
  });
  it('walks the poem lines over the poem act and the nights at the end', () => {
    expect(stateAt(0.78).poemLine).toBe(0);
    expect(stateAt(0.97).poemLine).toBe(POEM_SLOTS);
    expect(stateAt(0.875).poemLine).toBeCloseTo(POEM_SLOTS / 2, 5);
    expect(stateAt(0.97).nights).toBe(0);
    expect(stateAt(1).nights).toBe(1);
  });
  it('swaps the Eorzea label for the real one when the sky becomes real', () => {
    expect(stateAt(0.5)).toMatchObject({ labelOpacity: 1, realLabel: false });
    expect(stateAt(0.8)).toMatchObject({ labelOpacity: 1, realLabel: true });
  });
  it('moves the camera forward along the whole path and holds at the end', () => {
    expect(stateAt(ACTS.realSky[0]).cameraT).toBe(1);
    expect(stateAt(1).cameraT).toBe(1);
  });
  it('is monotonic in growth, coverage, worldBlend and cameraT', () => {
    let prev = stateAt(0);
    for (let i = 1; i <= 1000; i++) {
      const s = stateAt(i / 1000);
      expect(s.growth).toBeGreaterThanOrEqual(prev.growth);
      expect(s.coverage).toBeLessThanOrEqual(prev.coverage);
      expect(s.worldBlend).toBeGreaterThanOrEqual(prev.worldBlend);
      expect(s.cameraT).toBeGreaterThanOrEqual(prev.cameraT);
      prev = s;
    }
  });
  it('fades the near silhouette layers, then the mill layer, as the camera rises to the sky', () => {
    expect(stateAt(0.45)).toMatchObject({ nearLayers: 1, midLayer: 1 });
    expect(stateAt(0.6).nearLayers).toBe(0);
    expect(stateAt(0.6).midLayer).toBeGreaterThan(0);
    expect(stateAt(0.66).midLayer).toBe(0);
  });
  it('clamps p outside [0, 1]', () => {
    expect(stateAt(-3)).toEqual(stateAt(0));
    expect(stateAt(7)).toEqual(stateAt(1));
    expect(stateAt(Number.NaN)).toEqual(stateAt(0));
  });
});
