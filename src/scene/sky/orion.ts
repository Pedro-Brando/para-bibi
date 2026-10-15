import * as THREE from 'three/webgpu';
import { attribute, color, positionGeometry, smoothstep } from 'three/tsl';
import { ORION_LINES } from '../../sky/orion';
import { raDecToVector, type Vec3 } from '../../sky/frame';
import { uEqToHor, uOrion, uWorldBlend } from './uniforms';

const RADIUS = 375;
const HALF_WIDTH = (0.09 * Math.PI) / 180;
const STEPS = 12;
/** Folga angular em volta de cada estrela (no máximo 22% da linha): a linha não encosta no ponto. */
const GAP = (0.5 * Math.PI) / 180;

/**
 * Linhas de Órion em rosa neon: fitas finas sobre a esfera, em coordenadas equatoriais, giradas pela mesma
 * matriz das estrelas. Cada linha tem a sua vez em `uOrion` (0 a 1) e cresce da primeira estrela para a segunda.
 * `positions`: HIP para [raRad, decRad].
 */
export function createOrionLines(positions: Map<number, [number, number]>) {
  const pos: number[] = [], prog: number[] = [], idx: number[] = [];
  const n = ORION_LINES.length;
  ORION_LINES.forEach(([ha, hb], k) => {
    const a = raDecToVector(...positions.get(ha)!), b = raDecToVector(...positions.get(hb)!);
    const ang = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const side = normalize(cross(a, b));
    const gap = Math.min(GAP, 0.22 * ang);
    for (let s = 0; s <= STEPS; s++) {
      const t = gap / ang + (s / STEPS) * (1 - (2 * gap) / ang);
      const p = slerp(a, b, ang, t);
      const base = pos.length / 3;
      for (const sign of [1, -1]) {
        pos.push(p[0] + sign * HALF_WIDTH * side[0], p[1] + sign * HALF_WIDTH * side[1], p[2] + sign * HALF_WIDTH * side[2]);
        prog.push((k + s / STEPS) / n);
      }
      if (s < STEPS) idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('progress', new THREE.Float32BufferAttribute(prog, 1));
  geo.setIndex(idx);

  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  m.fog = false;
  const dir = uEqToHor.mul(positionGeometry);
  m.positionNode = dir.mul(RADIUS);
  const drawn = smoothstep(0, 0.004, uOrion.sub(attribute('progress', 'float')));
  const above = smoothstep(0.0, 0.05, dir.y);
  m.colorNode = color('#ff4fa8').mul(1.6);
  m.opacityNode = drawn.mul(above).mul(uWorldBlend);
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = -5;
  mesh.frustumCulled = false;
  return mesh;
}

const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: Vec3): Vec3 => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
function slerp(a: Vec3, b: Vec3, ang: number, t: number): Vec3 {
  const s = Math.sin(ang), wa = Math.sin((1 - t) * ang) / s, wb = Math.sin(t * ang) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}
