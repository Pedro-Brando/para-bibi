import * as THREE from 'three/webgpu';
import {
  color, float, vec2, vec3, mix, smoothstep, abs, length, fract, floor, pow, max, dot, normalize, step,
  positionWorld, cameraPosition, mx_noise_float, mx_cell_noise_float, time, transformNormalToView,
} from 'three/tsl';
import { STREAM_PATH, STREAM_HALF_WIDTH, WATER_Y } from './layout';
import { uRain } from './uniforms';
import { uFlash } from '../flower/materials';

function ribbon(halfWidth: number): THREE.BufferGeometry {
  const n = STREAM_PATH.length;
  const pos = new Float32Array(n * 2 * 3);
  const index: number[] = [];
  for (let i = 0; i < n; i++) {
    const [x, z] = STREAM_PATH[i]!;
    const [ax, az] = STREAM_PATH[Math.max(0, i - 1)]!;
    const [bx, bz] = STREAM_PATH[Math.min(n - 1, i + 1)]!;
    const l = Math.hypot(bx - ax, bz - az);
    const px = -(bz - az) / l, pz = (bx - ax) / l;
    pos.set([x + px * halfWidth, WATER_Y, z + pz * halfWidth, x - px * halfWidth, WATER_Y, z - pz * halfWidth], i * 6);
    if (i < n - 1) {
      const a = i * 2;
      // Ordem anti-horária vista de cima: a normal da face aponta para +y (o contrário era descartado).
      index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 2 * 3).map((_, k) => (k % 3 === 1 ? 1 : 0)), 3));
  g.setIndex(index);
  return g;
}

/** Anéis de gotas: uma célula por gota, cada uma com fase própria; só acendem as células abaixo de uRain. */
function rainRings(scale: number, speed: number) {
  const p = positionWorld.xz.mul(scale);
  const cell = floor(p);
  const local = fract(p).sub(0.5);
  const h1 = mx_cell_noise_float(cell);
  const h2 = mx_cell_noise_float(cell.add(vec2(17.3, 5.1)));
  const t = fract(time.mul(speed).add(h1));
  const center = vec2(h2.sub(0.5), h1.sub(0.5)).mul(0.4);
  const r = length(local.sub(center));
  const ring = smoothstep(0.0, 0.05, abs(r.sub(t.mul(0.4)))).oneMinus().mul(t.oneMinus());
  // Só uma fração das células acende, para os anéis não virarem padrão.
  return ring.mul(step(h2, uRain.mul(0.35)));
}

export function createStream() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.12, metalness: 0 });
  const flowT = time.mul(0.25);
  const q = positionWorld.xz.mul(1.6);
  const nx = mx_noise_float(vec3(q.x.add(flowT), q.y, flowT));
  const nz = mx_noise_float(vec3(q.x, q.y.sub(flowT), flowT.add(7)));
  const rings = rainRings(3.2, 0.9);
  m.normalNode = transformNormalToView(normalize(vec3(nx.mul(0.22), float(1), nz.mul(0.22))));
  m.colorNode = color('#04070d');

  // Sem reflexo planar: um brilho de Fresnel com a cor do céu de tempestade faz o papel do reflexo.
  const V = normalize(cameraPosition.sub(positionWorld));
  const fres = pow(max(float(1).sub(max(dot(V, vec3(0, 1, 0)), 0)), 0), float(2.5));
  const sky = mix(color('#34406a'), color('#a6acd6'), uFlash);
  // Base um pouco acesa e brilhos móveis: o riacho precisa se ler como uma linha clara no plano fixo.
  m.emissiveNode = sky.mul(fres.mul(0.55).add(0.05))
    .add(color('#8a96c4').mul(rings.mul(0.25)))
    .add(color('#8a90c0').mul(smoothstep(0.3, 0.6, nx).mul(0.08)));
  const mesh = new THREE.Mesh(ribbon(STREAM_HALF_WIDTH * 1.35), m);
  return mesh;
}
