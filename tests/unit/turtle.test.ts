import { describe, it, expect } from 'vitest';
import { interpret } from '../../src/lsystem/turtle';
import { parallelTransport } from '../../src/lsystem/transport';
import { mod } from '../../src/lsystem/grammar';
import { dot, length, type Vec3 } from '../../src/lsystem/vec3';

describe('parallelTransport', () => {
  it('keeps the normal constant along a straight line', () => {
    const t: Vec3[] = [[0, 1, 0], [0, 1, 0], [0, 1, 0]];
    const n = parallelTransport(t, [1, 0, 0]);
    n.forEach((v) => {
      expect(v[0]).toBeCloseTo(1, 6);
      expect(v[1]).toBeCloseTo(0, 6);
      expect(v[2]).toBeCloseTo(0, 6);
    });
  });
  it('produces unit normals orthogonal to tangents along a curve', () => {
    const t: Vec3[] = Array.from({ length: 40 }, (_, i) => {
      const a = i * 0.08;
      return [Math.sin(a), Math.cos(a), 0.3 * Math.sin(2 * a)];
    }).map((v) => {
      const l = Math.hypot(...v);
      return [v[0] / l, v[1] / l, v[2] / l] as Vec3;
    });
    const n = parallelTransport(t, [0, 0, 1]);
    n.forEach((v, i) => {
      expect(length(v)).toBeCloseTo(1, 6);
      expect(Math.abs(dot(v, t[i]!))).toBeLessThan(1e-6);
    });
    for (let i = 1; i < n.length; i++) expect(dot(n[i]!, n[i - 1]!)).toBeGreaterThan(0.95);
  });
});

describe('interpret', () => {
  it('walks forward along +Y and records arc length', () => {
    const s = interpret([mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0, substeps: 1 });
    const nodes = s.branches[0]!.nodes;
    expect(nodes.length).toBe(3);
    expect(nodes[2]!.position[1]).toBeCloseTo(2, 6);
    expect(nodes[2]!.arc).toBeCloseTo(2, 6);
  });
  it('pitch turns the heading and brackets restore state', () => {
    const s = interpret(
      [mod('F', 1, 0.1), mod('['), mod('&', 90), mod('F', 1, 0.05), mod('L', 1), mod(']'), mod('F', 1, 0.1), mod('H', 1)],
      { tropismStrength: 0, substeps: 1 },
    );
    expect(s.branches.length).toBe(2);
    const head = s.attachments.find((a) => a.kind === 'head')!;
    expect(head.position[1]).toBeCloseTo(2, 6);
    const leaf = s.attachments.find((a) => a.kind === 'leaf')!;
    expect(leaf.position[1]).toBeCloseTo(1, 6);
    expect(Math.hypot(leaf.position[0], leaf.position[2])).toBeCloseTo(1, 6);
  });
  it('tropism bends a tilted stem back towards up', () => {
    const straight = interpret([mod('&', 40), mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0 });
    const bent = interpret([mod('&', 40), mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0.3 });
    const tipY = (s: typeof straight) => s.branches[0]!.nodes.at(-1)!.position[1];
    expect(tipY(bent)).toBeGreaterThan(tipY(straight));
  });
  it('ages grow monotonically along the main stem within [0.03, 0.6]', () => {
    const s = interpret(Array.from({ length: 5 }, () => mod('F', 0.2, 0.02)));
    const ages = s.branches[0]!.nodes.map((n) => n.age);
    for (let i = 1; i < ages.length; i++) expect(ages[i]!).toBeGreaterThanOrEqual(ages[i - 1]!);
    expect(ages[0]).toBeCloseTo(0.03, 6);
    expect(ages.at(-1)).toBeCloseTo(0.45, 6);
  });
});
