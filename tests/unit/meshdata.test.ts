import { describe, it, expect } from 'vitest';
import { growVertex, mergeMeshData, vertexCount } from '../../src/scene/flower/meshdata';
import { buildTube } from '../../src/scene/flower/tube';
import { buildPatch, placePatch } from '../../src/scene/flower/patch';
import { interpret } from '../../src/lsystem/turtle';
import { mod } from '../../src/lsystem/grammar';

const allFinite = (a: Float32Array) => a.every(Number.isFinite);

describe('growVertex', () => {
  it('collapses to the pivot before birth and is identity when grown', () => {
    const p: [number, number, number] = [1, 2, 3];
    const pivot: [number, number, number] = [0, 0, 0];
    expect(growVertex(p, 0.5, pivot, [1, 0, 0], 1, [0.1, 0.2], 0)).toEqual([0, 0, 0]);
    const g1 = growVertex(p, 0.5, pivot, [1, 0, 0], 1, [0.1, 0.2], 1);
    g1.forEach((v, i) => expect(v).toBeCloseTo(p[i]!, 6));
  });
  it('rotates by the closed angle while still closed', () => {
    const out = growVertex([0, 1, 0], 0.5, [0, 0, 0], [1, 0, 0], Math.PI / 2, [0.1, 0.2], 0.5);
    expect(out[1]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(1, 6);
  });
});

describe('buildTube', () => {
  it('has (nodes x (radial+1)) vertices, finite normals, pivots at previous node', () => {
    const s = interpret([mod('F', 1, 0.02), mod('F', 1, 0.0)], { tropismStrength: 0, substeps: 2 });
    const t = buildTube(s.branches[0]!, 8);
    expect(vertexCount(t)).toBe(s.branches[0]!.nodes.length * 9);
    expect(allFinite(t.normal)).toBe(true);
    expect(allFinite(t.position)).toBe(true);
    expect(Array.from(t.aPivot.slice(9 * 3, 9 * 3 + 3))).toEqual([0, 0, 0]);
  });
});

describe('buildPatch / placePatch', () => {
  const shape = { length: 0.3, width: 0.14, curl: 0.6, ruffle: 0.5, twist: 0.2, reflex: 0.3, profile: 'petal' as const };
  it('produces a finite grid with uv in [0,1]', () => {
    const p = buildPatch(shape, 12, 16);
    expect(p.position.length / 3).toBe(13 * 17);
    expect(allFinite(p.normal)).toBe(true);
    p.uv.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
  it('closed state points the petal tip along the head up axis', () => {
    // Mesma convenção de head.ts: up = +Y, out = +X, width = cross(up, out) = -Z.
    const local = buildPatch(shape, 6, 8);
    const open = 70 * (Math.PI / 180);
    const length: [number, number, number] = [Math.sin(open), Math.cos(open), 0];
    const width: [number, number, number] = [0, 0, -1];
    const normal: [number, number, number] = [Math.cos(open), -Math.sin(open), 0];
    const m = placePatch(local, { origin: [0, 0, 0], width, length, normal }, { age: 0.5, closed: -open, swell: 0.12, open: 0.22 });
    const tipIndex = Math.floor(6 / 2) + 8 * 7;
    const tip: [number, number, number] = [m.position[tipIndex * 3]!, m.position[tipIndex * 3 + 1]!, m.position[tipIndex * 3 + 2]!];
    const pivot: [number, number, number] = [m.aPivot[0]!, m.aPivot[1]!, m.aPivot[2]!];
    const axis: [number, number, number] = [m.aAxis[0]!, m.aAxis[1]!, m.aAxis[2]!];
    const closedTip = growVertex(tip, 0.5, pivot, axis, m.aClosed[0]!, [0.12, 0.22], 0.5);
    const n = Math.hypot(...closedTip);
    expect(closedTip[1] / n).toBeGreaterThan(0.9);
  });
  it('merge concatenates and offsets indices', () => {
    const local = buildPatch(shape, 2, 2);
    const frame = { origin: [0, 0, 0] as [number, number, number], width: [1, 0, 0] as [number, number, number], length: [0, 1, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
    const g = { age: 0.5, closed: 0, swell: 0.1, open: 0.1 };
    const a = placePatch(local, frame, g);
    const merged = mergeMeshData([a, a]);
    expect(vertexCount(merged)).toBe(2 * vertexCount(a));
    expect(Math.max(...merged.index)).toBe(2 * vertexCount(a) - 1);
  });
});
