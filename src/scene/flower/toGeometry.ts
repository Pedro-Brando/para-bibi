import * as THREE from 'three/webgpu';
import type { MeshData } from './meshdata';

export function toBufferGeometry(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
  g.setAttribute('aAge', new THREE.BufferAttribute(m.aAge, 1));
  g.setAttribute('aPivot', new THREE.BufferAttribute(m.aPivot, 3));
  g.setAttribute('aAxis', new THREE.BufferAttribute(m.aAxis, 3));
  g.setAttribute('aClosed', new THREE.BufferAttribute(m.aClosed, 1));
  g.setAttribute('aGrow', new THREE.BufferAttribute(m.aGrow, 2));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  // Crescimento move vértices na GPU; a caixa precisa cobrir a flor aberta e fechada.
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius *= 1.5;
  return g;
}
