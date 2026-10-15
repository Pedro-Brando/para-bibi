import type { Attachment } from '../../lsystem/turtle';
import type { FlowerParams } from '../../flower/params';
import { type Rng, range } from '../../seed/prng';
import { type Vec3, add, cross, normalize, scale } from '../../lsystem/vec3';
import { type MeshData, mergeMeshData } from './meshdata';
import { buildPatch, placePatch } from './patch';

const GOLDEN = 137.507764 * (Math.PI / 180);
const DEG = Math.PI / 180;

export function buildHead(head: Attachment, p: FlowerParams, rng: Rng): { petals: MeshData; stamens: MeshData } {
  const up = normalize(head.heading);
  const ref = normalize(head.up);
  const side = normalize(cross(up, ref));
  const coreR = 0.022 * head.scale;
  const total = p.petalCount * p.petalLayers;
  const isBud = head.scale < 1;
  const petals: MeshData[] = [];
  let order = 0;

  for (let layer = 0; layer < p.petalLayers; layer++) {
    const layerScale = Math.pow(0.8, layer) * head.scale;
    const openAngle = (62 - layer * 16) * DEG; // mais fechado: cálice de tulipa/peônia, não margarida
    const local = buildPatch(
      {
        length: p.petalLength * layerScale * range(rng, 0.93, 1.05),
        width: p.petalWidth * layerScale,
        curl: p.petalCurl, ruffle: p.petalRuffle, twist: p.petalTwist,
        reflex: p.petalReflex * (1 - layer * 0.3), profile: 'petal',
      },
      12, 16,
    );
    for (let k = 0; k < p.petalCount; k++) {
      const phi = (k / p.petalCount) * Math.PI * 2 + layer * GOLDEN;
      const out = normalize(add(scale(ref, Math.cos(phi)), scale(side, Math.sin(phi))));
      const width = normalize(cross(up, out));
      const length = normalize(add(scale(up, Math.cos(openAngle)), scale(out, Math.sin(openAngle))));
      const normal = normalize(cross(length, width));
      const origin = add(add(head.position, scale(out, coreR * (1 - layer * 0.25))), scale(up, layer * 0.004));
      const age = Math.min(0.76, head.age + 0.08 + (0.22 * order) / Math.max(1, total - 1));
      order++;
      petals.push(
        placePatch(local, { origin, width, length, normal }, {
          age,
          closed: -(openAngle - 6 * DEG) * (isBud ? 0.6 : 1),
          swell: 0.12,
          open: 0.22,
        }),
      );
    }
  }

  // Estames: disco de Vogel com 34 pontos (Fibonacci), cúpula baixa.
  const stamens: MeshData[] = [];
  const count = 34;
  for (let i = 0; i < count; i++) {
    const r = coreR * 0.9 * Math.sqrt((i + 0.5) / count);
    const a = i * GOLDEN;
    const dir = add(scale(ref, Math.cos(a) * r), scale(side, Math.sin(a) * r));
    const h = 0.012 * head.scale * (1 - (r / coreR) ** 2) + 0.004;
    const center = add(add(head.position, dir), scale(up, h));
    stamens.push(sphere(center, 0.0035 * head.scale, head.position, head.age + 0.3));
  }
  return { petals: mergeMeshData(petals), stamens: mergeMeshData(stamens) };
}

export function buildLeaf(leaf: Attachment, rng: Rng): MeshData {
  const length = normalize(leaf.heading);
  const width = normalize(leaf.left);
  const normal = normalize(cross(length, width));
  const local = buildPatch(
    { length: 0.2 * leaf.scale, width: 0.06 * leaf.scale, curl: 0.35, ruffle: 0.15, twist: range(rng, -0.3, 0.3), reflex: 0.35, profile: 'leaf' },
    8, 14,
  );
  return placePatch(local, { origin: leaf.position, width, length, normal }, { age: leaf.age + 0.03, closed: -50 * DEG, swell: 0.06, open: 0.15 });
}

function sphere(center: Vec3, radius: number, pivot: Vec3, age: number): MeshData {
  const seg = 6, rings = 4;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, th = v * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, ph = u * Math.PI * 2;
      const n: Vec3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      pos.push(...add(center, scale(n, radius)));
      nor.push(...n);
      uv.push(u, v);
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = y * (seg + 1) + x, b = a + seg + 1;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const n = pos.length / 3;
  const aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3), aGrow = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { aPivot.set(pivot, i * 3); aAxis.set([0, 1, 0], i * 3); aGrow.set([0.15, 0.0001], i * 2); }
  return {
    position: new Float32Array(pos), normal: new Float32Array(nor), uv: new Float32Array(uv), index: new Uint32Array(idx),
    aAge: new Float32Array(n).fill(age), aPivot, aAxis, aClosed: new Float32Array(n), aGrow,
  };
}
