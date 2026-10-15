import * as THREE from 'three/webgpu';
import { toBufferGeometry } from './toGeometry';
import { createFlowerMaterials } from './materials';
import { flowerPalette, type FlowerParams } from '../../flower/params';
import type { buildFlower } from './build';
import type { MeshData } from './meshdata';

/** A flor da fase 1 como grupo de meshes, mais a esfera da semente (que some quando a flor cresce). */
export function createFlowerGroup(params: FlowerParams, meshes: ReturnType<typeof buildFlower>['meshes']) {
  const mats = createFlowerMaterials(flowerPalette(params));
  const seedMesh = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), mats.seed);
  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(toBufferGeometry(meshes.stem), mats.stem),
    new THREE.Mesh(toBufferGeometry(meshes.leaves), mats.leaf),
    new THREE.Mesh(toBufferGeometry(meshes.petals), mats.petal),
    new THREE.Mesh(toBufferGeometry(meshes.stamens), mats.stamen),
    seedMesh,
  );
  for (const child of group.children) child.frustumCulled = false;
  return { group, seedMesh, head: topHeadCenter(meshes.stamens) };
}

/** Miolo da cabeça principal (a de cima): média dos vértices de estame perto do topo. A flor do nome olha para ele. */
function topHeadCenter(stamens: MeshData): THREE.Vector3 {
  const p = stamens.position;
  let top = -Infinity;
  for (let i = 1; i < p.length; i += 3) top = Math.max(top, p[i]!);
  const c = new THREE.Vector3();
  let n = 0;
  for (let i = 0; i < p.length; i += 3) if (p[i + 1]! > top - 0.06) { c.x += p[i]!; c.y += p[i + 1]!; c.z += p[i + 2]!; n++; }
  return n ? c.divideScalar(n) : c;
}
