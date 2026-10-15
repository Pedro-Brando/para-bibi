import * as THREE from 'three/webgpu';
import { toBufferGeometry } from './toGeometry';
import { createFlowerMaterials } from './materials';
import { flowerPalette, type FlowerParams } from '../../flower/params';
import type { buildFlower } from './build';

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
  return { group, seedMesh };
}
