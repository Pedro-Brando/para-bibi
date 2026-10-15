import { type Vec3, add, cross, normalize, rotate, scale, sub } from '../../lsystem/vec3';
import type { MeshData } from './meshdata';

export interface PatchShape {
  length: number;
  width: number;
  curl: number;
  ruffle: number;
  twist: number;
  reflex: number;
  profile: 'petal' | 'leaf';
}

const B3 = (t: number): [number, number, number, number] => {
  const s = 1 - t;
  return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
};

/** Patch de Bézier bicúbico: i atravessa a largura, j vai da base à ponta. */
function controlPoints(sh: PatchShape): Vec3[][] {
  const along = [0, 0.33, 0.7, 1].map((f) => f * sh.length);
  const halfW = (sh.profile === 'petal' ? [0.12, 0.95, 1.0, 0.3] : [0.08, 0.8, 0.7, 0.02]).map((f) => f * sh.width);
  const across = [-1, -0.35, 0.35, 1];
  return across.map((xf) =>
    along.map((y, j) => {
      const w = halfW[j]!;
      const x = xf * w;
      const cup = sh.curl * w * 0.8 * xf * xf;
      const bend = -sh.reflex * (y * y) / Math.max(sh.length, 1e-6) * 0.6;
      const p: Vec3 = [x, y, cup + bend];
      return rotate(p, [0, 1, 0], (sh.twist * y) / Math.max(sh.length, 1e-6));
    }),
  );
}

function evalPatch(cp: Vec3[][], u: number, v: number): Vec3 {
  const bu = B3(u), bv = B3(v);
  let p: Vec3 = [0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) p = add(p, scale(cp[i]![j]!, bu[i]! * bv[j]!));
  return p;
}

function surface(sh: PatchShape, cp: Vec3[][], u: number, v: number): Vec3 {
  const p = evalPatch(cp, u, v);
  const edge = Math.abs(2 * u - 1);
  const s = Math.min(1, Math.max(0, (v - 0.3) / 0.7));
  const ruffle = sh.ruffle * 0.012 * Math.sin(u * Math.PI * 2 * 3 + v * 4) * s * s * edge;
  return [p[0], p[1], p[2] + ruffle];
}

export function buildPatch(sh: PatchShape, uSeg: number, vSeg: number) {
  const cp = controlPoints(sh);
  const cols = uSeg + 1, rows = vSeg + 1;
  const position = new Float32Array(cols * rows * 3), normal = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2);
  const h = 1e-3;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / uSeg, v = j / vSeg;
      const p = surface(sh, cp, u, v);
      const du = sub(surface(sh, cp, Math.min(1, u + h), v), surface(sh, cp, Math.max(0, u - h), v));
      const dv = sub(surface(sh, cp, u, Math.min(1, v + h)), surface(sh, cp, u, Math.max(0, v - h)));
      let n = cross(du, dv);
      n = Math.hypot(...n) < 1e-12 ? [0, 0, 1] : normalize(n);
      const k = j * cols + i;
      position.set(p, k * 3);
      normal.set(n, k * 3);
      uv.set([u, v], k * 2);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  return { position, normal, uv, index: new Uint32Array(index) };
}

export function placePatch(
  local: ReturnType<typeof buildPatch>,
  frame: { origin: Vec3; width: Vec3; length: Vec3; normal: Vec3 },
  growth: { age: number; closed: number; swell: number; open: number },
): MeshData {
  const n = local.position.length / 3;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  const aAge = new Float32Array(n).fill(growth.age), aClosed = new Float32Array(n).fill(growth.closed);
  const aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3), aGrow = new Float32Array(n * 2);
  const W = normalize(frame.width), L = normalize(frame.length), N = normalize(frame.normal);
  for (let k = 0; k < n; k++) {
    const x = local.position[k * 3]!, y = local.position[k * 3 + 1]!, z = local.position[k * 3 + 2]!;
    const nx = local.normal[k * 3]!, ny = local.normal[k * 3 + 1]!, nz = local.normal[k * 3 + 2]!;
    position.set(add(frame.origin, add(add(scale(W, x), scale(L, y)), scale(N, z))), k * 3);
    normal.set(normalize(add(add(scale(W, nx), scale(L, ny)), scale(N, nz))), k * 3);
    aPivot.set(frame.origin, k * 3);
    aAxis.set(W, k * 3);
    aGrow.set([growth.swell, growth.open], k * 2);
  }
  return { position, normal, uv: local.uv.slice(), index: local.index.slice(), aAge, aPivot, aAxis, aClosed, aGrow };
}
