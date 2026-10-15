import * as THREE from 'three/webgpu';
import {
  color, float, vec3, mod, normalize, cross, step, instanceIndex, hash, time, positionGeometry, cameraPosition, smoothstep, length,
} from 'three/tsl';
import { uRain } from './uniforms';
import { uFlash } from '../flower/materials';

// Calibrado com o dono: a tempestade (uRain = 1) tem a cara que uRain = 0,1 tinha com 7000 gotas.
// 400 gotas (PC fraco), um pouco mais opacas para a tempestade não perder corpo.
const DROPS = 400;
const BOX = 26; // lado da caixa de chuva em volta da câmera
const HEIGHT = 18;
const SPEED = 15;

/**
 * Chuva sem estado: cada instância é um traço cuja posição sai do índice e do tempo. A caixa acompanha a
 * câmera dando a volta (mod), então a chuva não acaba quando a câmera anda.
 */
export function createRain() {
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const i = float(instanceIndex);
  const h1 = hash(i.add(1)), h2 = hash(i.add(2)), h3 = hash(i.add(3)), h4 = hash(i.add(4)), h5 = hash(i.add(5));
  const half = BOX / 2;
  const x = cameraPosition.x.sub(half).add(mod(h1.mul(BOX).sub(cameraPosition.x.sub(half)), BOX));
  const z = cameraPosition.z.sub(half).add(mod(h2.mul(BOX).sub(cameraPosition.z.sub(half)), BOX));
  const fall = time.mul(float(SPEED).mul(h3.mul(0.4).add(0.8))).add(h4.mul(HEIGHT));
  const y = cameraPosition.y.add(HEIGHT * 0.6).sub(mod(fall, HEIGHT));
  const head = vec3(x, y, z);
  const dir = normalize(vec3(0.12, -1, 0.05));
  const right = normalize(cross(dir, head.sub(cameraPosition)));
  // Só as gotas com h5 < uRain aparecem: a densidade acompanha a intensidade.
  const on = step(h5, uRain);
  const along = positionGeometry.y.add(0.5); // 0 na cabeça, 1 na cauda
  const side = positionGeometry.x.mul(2);
  m.positionNode = head.sub(dir.mul(along.mul(0.55))).add(right.mul(side.mul(0.006).mul(on)));
  m.colorNode = color('#9aa6cc').mul(float(0.5).add(uFlash.mul(2.5)));
  // Gotas a menos de 2 da câmera virariam faixas enormes na tela: somem.
  const near = smoothstep(2, 5, length(head.sub(cameraPosition)));
  m.opacityNode = along.oneMinus().mul(0.17).mul(on).mul(near);
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), m, DROPS);
  mesh.frustumCulled = false;
  return mesh;
}
