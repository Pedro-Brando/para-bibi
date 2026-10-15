import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { color, mix, mx_noise_float, positionWorld, smoothstep } from 'three/tsl';
import { terrainHeight, STREAM_PATH, STREAM_HALF_WIDTH, distanceToStream } from './layout';
import { sfc32, range } from '../../seed/prng';
import { treeSeed } from './layout';

function terrainGeometry(size: number, segments: number, drop: number) {
  // Centro deslocado para trás da flor (a câmera olha para -x -z), onde o chão aparece.
  const g = new THREE.PlaneGeometry(size, size, segments, segments);
  g.rotateX(-Math.PI / 2);
  g.translate(-4, 0, -8);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setY(i, terrainHeight(p.getX(i), p.getZ(i)) - drop);
  g.computeVertexNormals();
  return g;
}

function groundMaterial() {
  const m = new THREE.MeshStandardNodeMaterial({ roughness: 0.95, metalness: 0 });
  const n = mx_noise_float(positionWorld.xz.mul(0.7)).mul(0.5).add(0.5);
  const fine = mx_noise_float(positionWorld.xz.mul(6)).mul(0.5).add(0.5);
  // Musgo escuro azulado, com manchas mais verdes e terra molhada perto da água.
  const moss = mix(color('#0d1a1f'), color('#16302a'), smoothstep(0.3, 0.8, n));
  const mud = color('#120f12');
  const wet = smoothstep(-0.25, -0.05, positionWorld.y).oneMinus();
  m.colorNode = mix(moss, mud, wet).mul(fine.mul(0.5).add(0.75));
  return m;
}

function rockGeometry(rng: () => number) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const k = [range(rng, 1.5, 3), range(rng, 1.5, 3), range(rng, 0, 6)];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const s = 1 + 0.18 * Math.sin(x * k[0]! + k[2]!) * Math.cos(z * k[1]! - y * 2);
    p.setXYZ(i, x * s, Math.max(y, -0.3) * s, z * s);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * Faixa de chão na frente das silhuetas (com o leito do riacho) e pedras na margem, numa malha só.
 * A primeira camada de silhueta fica a 3,4 da flor, então 40 x 40 sobra.
 */
export function createGround() {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(terrainGeometry(40, 160, 0), groundMaterial()));

  const rockMat = new THREE.MeshStandardNodeMaterial({ roughness: 0.85, metalness: 0 });
  rockMat.colorNode = mix(color('#1b1f2a'), color('#2a2d36'), mx_noise_float(positionWorld.mul(3)).mul(0.5).add(0.5));
  const rng = sfc32(treeSeed(30_000));
  const rocks: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 14; i++) {
    const idx = Math.floor(range(rng, 18, 110));
    const [x, z] = STREAM_PATH[idx]!;
    const [nx, nz] = STREAM_PATH[idx + 1]!;
    const len = Math.hypot(nx - x, nz - z);
    const side = rng() < 0.5 ? -1 : 1;
    const off = STREAM_HALF_WIDTH * range(rng, 0.9, 1.5);
    const px = x + (-(nz - z) / len) * off * side, pz = z + ((nx - x) / len) * off * side;
    if (Math.hypot(px, pz) < 1.3) continue;
    const rock = rockGeometry(rng);
    const s = range(rng, 0.18, 0.45);
    rock.scale(s * range(rng, 1, 1.6), s * range(rng, 0.5, 0.8), s);
    rock.rotateY(rng() * Math.PI * 2);
    rock.translate(px, terrainHeight(px, pz, distanceToStream(px, pz)) - 0.05, pz);
    rocks.push(rock);
  }
  group.add(new THREE.Mesh(mergeGeometries(rocks), rockMat));
  return group;
}
