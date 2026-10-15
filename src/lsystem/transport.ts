import { type Vec3, cross, dot, length, normalize, rotate, scale, sub } from './vec3';

/** Frames que minimizam rotação: a normal anda junto com a tangente sem girar em torno dela. */
export function parallelTransport(tangents: readonly Vec3[], firstNormal: Vec3): Vec3[] {
  if (tangents.length === 0) return [];
  const orth = (n: Vec3, t: Vec3) => normalize(sub(n, scale(t, dot(n, t))));
  const out: Vec3[] = [orth(firstNormal, tangents[0]!)];
  for (let i = 1; i < tangents.length; i++) {
    const a = tangents[i - 1]!, b = tangents[i]!;
    const axis = cross(a, b);
    let n = out[i - 1]!;
    if (length(axis) > 1e-9) {
      const angle = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
      n = rotate(n, normalize(axis), angle);
    }
    out.push(orth(n, b));
  }
  return out;
}
