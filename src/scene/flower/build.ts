import type { Seed128 } from '../../seed/hash';
import { sfc32 } from '../../seed/prng';
import { flowerParams, type FlowerParams } from '../../flower/params';
import { flowerModules } from '../../lsystem/flower';
import { interpret } from '../../lsystem/turtle';
import { type MeshData, mergeMeshData } from './meshdata';
import { buildTube } from './tube';
import { buildHead, buildLeaf } from './head';

export interface FlowerMeshes { stem: MeshData; leaves: MeshData; petals: MeshData; stamens: MeshData; height: number }

export function buildFlower(seed: Seed128): { params: FlowerParams; meshes: FlowerMeshes } {
  const rng = sfc32(seed);
  const params = flowerParams(rng);
  const skeleton = interpret(flowerModules(params, rng));
  const stem = mergeMeshData(skeleton.branches.map((b) => buildTube(b, 10)));
  const leaves = mergeMeshData(skeleton.attachments.filter((a) => a.kind === 'leaf').map((a) => buildLeaf(a, rng)));
  const heads = skeleton.attachments.filter((a) => a.kind === 'head').map((a) => buildHead(a, params, rng));
  const petals = mergeMeshData(heads.map((h) => h.petals));
  const stamens = mergeMeshData(heads.map((h) => h.stamens));
  const height = Math.max(...skeleton.branches.flatMap((b) => b.nodes.map((n) => n.position[1])));
  return { params, meshes: { stem, leaves, petals, stamens, height } };
}
