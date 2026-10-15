import * as THREE from 'three/webgpu';
import { color } from 'three/tsl';
import { boltPoints } from './bolt';
import { type Rng, range } from '../../seed/prng';
import type { Vec3 } from '../../lsystem/vec3';
import { uBolt } from './uniforms';

const BOLT_SECONDS = 0.3;
/** Direção (ângulo no plano xz) para onde a câmera inicial olha: metade dos raios cai nesse leque. */
const VIEW_ANGLE = -1.97;

const MAX_VERTS = 1200;
/** As silhuetas agora são opacas e escrevem profundidade: o teste de profundidade põe a fita entre as copas. */
const BOLT_RENDER_ORDER = 11.5;

/**
 * Fita voltada para a câmera ao longo de cada caminho do raio, escrita num buffer pré-alocado (nada é
 * alocado na GPU por raio; só os atributos sobem de novo). Devolve o número de índices usados.
 */
function writeRibbon(paths: Vec3[][], eye: THREE.Vector3, pos: Float32Array, idx: Uint16Array): number {
  let v = 0, n = 0;
  paths.forEach((path, k) => {
    const width = k === 0 ? 0.55 : 0.25;
    if (v + path.length * 2 > MAX_VERTS) return;
    for (let i = 0; i < path.length; i++) {
      _p.fromArray(path[i]!);
      if (i < path.length - 1) _d.fromArray(path[i + 1]!).sub(_p).normalize();
      _e.subVectors(eye, _p).normalize();
      _s.crossVectors(_d, _e).normalize().multiplyScalar(width * (1 - (0.6 * i) / path.length));
      pos[v * 3] = _p.x + _s.x; pos[v * 3 + 1] = _p.y + _s.y; pos[v * 3 + 2] = _p.z + _s.z;
      pos[v * 3 + 3] = _p.x - _s.x; pos[v * 3 + 4] = _p.y - _s.y; pos[v * 3 + 5] = _p.z - _s.z;
      if (i < path.length - 1) { idx.set([v, v + 1, v + 2, v + 1, v + 3, v + 2], n); n += 6; }
      v += 2;
    }
  });
  return n;
}
const _p = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Vector3(), _s = new THREE.Vector3();

export function createLightning(rng: Rng, camera: THREE.Camera) {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  m.colorNode = color('#ffe6f4').mul(uBolt.mul(6));
  m.fog = false;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(MAX_VERTS * 3);
  const idx = new Uint16Array(MAX_VERTS * 3);
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const idxAttr = new THREE.BufferAttribute(idx, 1).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setIndex(idxAttr);
  const mesh = new THREE.Mesh(geo, m);
  mesh.renderOrder = BOLT_RENDER_ORDER;
  mesh.frustumCulled = false;
  mesh.visible = false;
  // Luz do raio para a floresta (a PointLight da fase 1 só alcança a flor).
  const light = new THREE.DirectionalLight('#d8dcff', 0);
  let t = 0;

  return {
    objects: [mesh, light, light.target] as THREE.Object3D[],
    /** Dispara um raio e devolve a distância (unidades de cena) até a câmera. */
    strike(): number {
      // A câmera é fixa: os raios caem dentro do quadro, entre a camada de longe e a penúltima, onde o céu
      // aparece entre as copas; o renderOrder põe a fita na frente da camada de longe e atrás das outras.
      const ang = VIEW_ANGLE + range(rng, -0.38, 0.38);
      const dist = range(rng, 24, 36);
      const ex = Math.cos(ang) * dist, ez = Math.sin(ang) * dist;
      const end: Vec3 = [ex, -0.5, ez];
      const start: Vec3 = [ex + range(rng, -6, 6), 22 + dist * 0.3, ez + range(rng, -6, 6)];
      geo.setDrawRange(0, writeRibbon(boltPoints(rng, start, end, 7), camera.position, pos, idx));
      posAttr.needsUpdate = true;
      idxAttr.needsUpdate = true;
      mesh.visible = true;
      light.position.set(start[0], start[1], start[2]);
      t = 1;
      return camera.position.distanceTo(_p.set(end[0], end[1], end[2]));
    },
    update(dt: number) {
      t = Math.max(0, t - dt / BOLT_SECONDS);
      const flicker = t > 0 ? t * (0.55 + 0.45 * Math.abs(Math.sin(t * 37))) : 0;
      uBolt.value = flicker;
      light.intensity = flicker * 2.5;
      mesh.visible = t > 0;
    },
  };
}
