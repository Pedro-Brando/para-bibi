import type { Module } from './grammar';
import { type Vec3, add, cross, length, normalize, rotate, scale } from './vec3';

export interface SkeletonNode { position: Vec3; tangent: Vec3; radius: number; arc: number; age: number }
export interface Branch { nodes: SkeletonNode[] }
export interface Attachment {
  kind: 'leaf' | 'head';
  position: Vec3;
  heading: Vec3;
  left: Vec3;
  up: Vec3;
  scale: number;
  age: number;
}
export interface Skeleton { branches: Branch[]; attachments: Attachment[] }

interface State { pos: Vec3; H: Vec3; L: Vec3; U: Vec3; arc: number; radius: number; branch: number }

const DEG = Math.PI / 180;
const AGE_START = 0.03;
const AGE_SPAN = 0.42;
const AGE_MAX = 0.6;

export function interpret(
  modules: readonly Module[],
  opts: { tropism?: Vec3; tropismStrength?: number; substeps?: number } = {},
): Skeleton {
  const T = normalize(opts.tropism ?? [0, 1, 0]);
  const e = opts.tropismStrength ?? 0.12;
  const substeps = opts.substeps ?? 4;

  // Heading +Y, left -X, up +Z.
  let s: State = { pos: [0, 0, 0], H: [0, 1, 0], L: [-1, 0, 0], U: [0, 0, 1], arc: 0, radius: 0.02, branch: 0 };
  const stack: State[] = [];
  const branches: Branch[] = [{ nodes: [{ position: [0, 0, 0], tangent: [0, 1, 0], radius: s.radius, arc: 0, age: 0 }] }];
  const attachments: Attachment[] = [];

  const turn = (axis: Vec3, deg: number) => {
    const a = deg * DEG;
    s = { ...s, H: normalize(rotate(s.H, axis, a)), L: normalize(rotate(s.L, axis, a)), U: normalize(rotate(s.U, axis, a)) };
  };

  for (const m of modules) {
    switch (m.sym) {
      case 'F': {
        const len = m.args[0] ?? 0.1;
        const r = m.args[1] ?? s.radius;
        for (let i = 0; i < substeps; i++) {
          const bend = cross(s.H, T);
          const mag = length(bend);
          if (e > 0 && mag > 1e-9) turn(normalize(bend), (e * mag) / DEG / substeps);
          const r0 = s.radius;
          s = { ...s, pos: add(s.pos, scale(s.H, len / substeps)), arc: s.arc + len / substeps };
          const radius = r0 + (r - r0) * ((i + 1) / substeps);
          s.radius = radius;
          branches[s.branch]!.nodes.push({ position: s.pos, tangent: s.H, radius, arc: s.arc, age: 0 });
        }
        break;
      }
      case '+': turn(s.U, m.args[0] ?? 0); break;
      case '&': turn(s.L, m.args[0] ?? 0); break;
      case '/': turn(s.H, m.args[0] ?? 0); break;
      case '[': {
        stack.push(s);
        branches.push({ nodes: [{ position: s.pos, tangent: s.H, radius: s.radius, arc: s.arc, age: 0 }] });
        s = { ...s, branch: branches.length - 1 };
        break;
      }
      case ']': {
        const prev = stack.pop();
        if (!prev) throw new Error('turtle: unbalanced ]');
        s = prev;
        break;
      }
      case 'L':
      case 'H':
        attachments.push({
          kind: m.sym === 'L' ? 'leaf' : 'head',
          position: s.pos, heading: s.H, left: s.L, up: s.U,
          scale: m.args[0] ?? 1, age: s.arc,
        });
        break;
      default:
        break;
    }
  }

  const mainArc = Math.max(1e-6, branches[0]!.nodes.at(-1)!.arc);
  const ageOf = (arc: number) => Math.min(AGE_MAX, AGE_START + (AGE_SPAN * arc) / mainArc);
  for (const b of branches) for (const n of b.nodes) n.age = ageOf(n.arc);
  for (const a of attachments) a.age = ageOf(a.age);
  return { branches: branches.filter((b) => b.nodes.length > 1), attachments };
}
