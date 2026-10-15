import type { Branch } from '../../lsystem/turtle';
import { parallelTransport } from '../../lsystem/transport';
import { type Vec3, cross, normalize, add, scale } from '../../lsystem/vec3';
import type { MeshData } from './meshdata';

const pickNormal = (t: Vec3): Vec3 => (Math.abs(t[1]) < 0.9 ? normalize(cross(t, [0, 1, 0])) : normalize(cross(t, [1, 0, 0])));

export function buildTube(branch: Branch, radialSegments: number): MeshData {
  const nodes = branch.nodes;
  const ring = radialSegments + 1;
  const n = nodes.length * ring;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const aAge = new Float32Array(n), aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3);
  const aClosed = new Float32Array(n), aGrow = new Float32Array(n * 2);
  const tangents = nodes.map((nd) => nd.tangent);
  const normals = parallelTransport(tangents, pickNormal(tangents[0]!));
  const totalArc = Math.max(1e-6, nodes.at(-1)!.arc - nodes[0]!.arc);

  nodes.forEach((nd, i) => {
    const N = normals[i]!;
    const B = normalize(cross(nd.tangent, N));
    const pivot = i === 0 ? nd.position : nodes[i - 1]!.position;
    for (let j = 0; j < ring; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const dir = normalize(add(scale(N, Math.cos(a)), scale(B, Math.sin(a))));
      const p = add(nd.position, scale(dir, nd.radius));
      const v = i * ring + j;
      position.set(p, v * 3);
      normal.set(dir, v * 3);
      uv.set([j / radialSegments, (nd.arc - nodes[0]!.arc) / totalArc], v * 2);
      aAge[v] = nd.age;
      aPivot.set(pivot, v * 3);
      aAxis.set([0, 1, 0], v * 3);
      aClosed[v] = 0;
      aGrow.set([0.03, 0.0001], v * 2);
    }
  });

  const index: number[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j, b = a + ring, c = b + 1, d = a + 1;
      index.push(a, b, d, b, c, d);
    }
  }
  return { position, normal, uv, index: new Uint32Array(index), aAge, aPivot, aAxis, aClosed, aGrow };
}
