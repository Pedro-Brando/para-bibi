import { type Vec3, add, rotate, scale, sub, normalize } from '../../lsystem/vec3';

export interface MeshData {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  aAge: Float32Array;
  aPivot: Float32Array;
  aAxis: Float32Array;
  aClosed: Float32Array;
  aGrow: Float32Array;
}

export const vertexCount = (m: MeshData) => m.position.length / 3;

export function emptyMeshData(): MeshData {
  return {
    position: new Float32Array(0), normal: new Float32Array(0), uv: new Float32Array(0), index: new Uint32Array(0),
    aAge: new Float32Array(0), aPivot: new Float32Array(0), aAxis: new Float32Array(0), aClosed: new Float32Array(0), aGrow: new Float32Array(0),
  };
}

export function mergeMeshData(list: readonly MeshData[]): MeshData {
  if (list.length === 0) return emptyMeshData();
  const keys = ['position', 'normal', 'uv', 'aAge', 'aPivot', 'aAxis', 'aClosed', 'aGrow'] as const;
  const out = emptyMeshData();
  for (const k of keys) {
    const total = list.reduce((s, m) => s + m[k].length, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const m of list) { arr.set(m[k], o); o += m[k].length; }
    out[k] = arr;
  }
  const index = new Uint32Array(list.reduce((s, m) => s + m.index.length, 0));
  let io = 0, vo = 0;
  for (const m of list) {
    for (let i = 0; i < m.index.length; i++) index[io + i] = m.index[i]! + vo;
    io += m.index.length;
    vo += vertexCount(m);
  }
  out.index = index;
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Espelho exato do nó TSL de crescimento (Task 7). Mantenha os dois iguais. */
export function growVertex(p: Vec3, age: number, pivot: Vec3, axis: Vec3, closed: number, grow: [number, number], g: number): Vec3 {
  const s = smoothstep(age - grow[0], age, g);
  const open = smoothstep(age, age + grow[1], g);
  const angle = closed * (1 - open);
  return add(pivot, scale(rotate(sub(p, pivot), normalize(axis), angle), s));
}
