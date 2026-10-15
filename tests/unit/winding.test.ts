import { describe, it, expect } from 'vitest';
import { buildFlower } from '../../src/scene/flower/build';
import { buildTube } from '../../src/scene/flower/tube';
import { buildHead, buildLeaf } from '../../src/scene/flower/head';
import type { MeshData } from '../../src/scene/flower/meshdata';
import { interpret, type Attachment } from '../../src/lsystem/turtle';
import { mod } from '../../src/lsystem/grammar';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';
import { NAME_SEED } from '../../src/seed/constants';

// A GPU decide a face da frente pela ordem dos índices (anti-horária). Com FrontSide o caule e os estames
// descartam as faces de trás, e com DoubleSide a normal é invertida nas faces de trás; os dois só funcionam
// se o sentido de cada triângulo concordar com as normais dos seus vértices:
// dot(cross(p1 - p0, p2 - p0), n0 + n1 + n2) > 0.
function windingAgreement(m: MeshData): { agree: number; disagree: number } {
  let agree = 0, disagree = 0;
  for (let t = 0; t < m.index.length; t += 3) {
    const [ia, ib, ic] = [m.index[t]!, m.index[t + 1]!, m.index[t + 2]!];
    const p = (i: number) => [m.position[i * 3]!, m.position[i * 3 + 1]!, m.position[i * 3 + 2]!] as const;
    const n = (i: number) => [m.normal[i * 3]!, m.normal[i * 3 + 1]!, m.normal[i * 3 + 2]!] as const;
    const a = p(ia), b = p(ib), c = p(ic);
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const w = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
    if (Math.hypot(w[0]!, w[1]!, w[2]!) < 1e-12) continue; // triângulo degenerado (polo da esfera, base da pétala)
    const na = n(ia), nb = n(ib), nc = n(ic);
    const mean = [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]];
    const d = w[0]! * mean[0]! + w[1]! * mean[1]! + w[2]! * mean[2]!;
    if (d > 0) agree++; else disagree++;
  }
  return { agree, disagree };
}

function expectCounterClockwise(meshes: Record<string, MeshData>) {
  const bad: string[] = [];
  for (const [name, m] of Object.entries(meshes)) {
    const { agree, disagree } = windingAgreement(m);
    expect(agree + disagree, `${name} has triangles`).toBeGreaterThan(0);
    if (disagree > 0) bad.push(`${name}: ${disagree} of ${agree + disagree} triangles wound against their normals`);
  }
  expect(bad).toEqual([]);
}

describe('triangle winding matches vertex normals', () => {
  it('buildTube', () => {
    const s = interpret([mod('F', 1, 0.02), mod('F', 1, 0.0)], { tropismStrength: 0, substeps: 2 });
    expectCounterClockwise({ tube: buildTube(s.branches[0]!, 8) });
  });

  it('buildHead petals and stamens', () => {
    const p = flowerParams(sfc32(NAME_SEED));
    const head: Attachment = { kind: 'head', position: [0, 1, 0], heading: [0, 1, 0], left: [-1, 0, 0], up: [0, 0, 1], scale: 1, age: 0.45 };
    const { petals, stamens } = buildHead(head, p, sfc32(NAME_SEED));
    expectCounterClockwise({ petals, stamens });
  });

  it('buildLeaf', () => {
    const leaf: Attachment = { kind: 'leaf', position: [0, 0.5, 0], heading: [0.6, 0.8, 0], left: [0, 0, -1], up: [-0.8, 0.6, 0], scale: 1, age: 0.3 };
    expectCounterClockwise({ leaf: buildLeaf(leaf, sfc32(NAME_SEED)) });
  });

  it('all four buildFlower(NAME_SEED) meshes', () => {
    const { meshes } = buildFlower(NAME_SEED);
    expectCounterClockwise({ stem: meshes.stem, leaves: meshes.leaves, petals: meshes.petals, stamens: meshes.stamens });
  });
});
