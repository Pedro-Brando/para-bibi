import * as THREE from 'three/webgpu';
import type { Node } from 'three/webgpu';
import { float, vec2, uv, length, smoothstep, instancedBufferAttribute } from 'three/tsl';
import { nightStar } from '../nights/stars';
import { uPixelAngle } from './sky/uniforms';
import { STAR_RADIUS } from './sky/stars';

/** Sprites instanciados com posição, cor, tamanho (px) e alfa escritos pela CPU a cada quadro. */
function spriteCloud(max: number, halo = 0.25) {
  const pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
  const look = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); // rgb, alfa
  const size = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
  for (const a of [pos, look, size]) a.setUsage(THREE.DynamicDrawUsage);
  const aPos = instancedBufferAttribute(pos, 'vec3') as unknown as Node<'vec3'>;
  const aLook = instancedBufferAttribute(look, 'vec4') as unknown as Node<'vec4'>;
  const aSize = instancedBufferAttribute(size, 'float') as unknown as Node<'float'>;
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.sizeAttenuation = false;
  m.fog = false;
  m.positionNode = aPos;
  m.scaleNode = vec2(aSize.mul(uPixelAngle));
  const r = length(uv().sub(0.5)).mul(2);
  // Núcleo firme e um halo largo: lê como estrela, não como disco.
  const glow = smoothstep(1, 0, r).pow(8).mul(1.1).add(smoothstep(1, 0.0, r).pow(2.5).mul(halo));
  m.colorNode = aLook.xyz.mul(aLook.w);
  m.opacityNode = glow.mul(float(1));
  const sprite = new THREE.Sprite(m);
  sprite.count = max;
  sprite.frustumCulled = false;
  sprite.renderOrder = -6;
  const set = (i: number, p: THREE.Vector3, rgb: [number, number, number], alpha: number, px: number) => {
    pos.setXYZ(i, p.x, p.y, p.z);
    look.setXYZW(i, rgb[0], rgb[1], rgb[2], alpha);
    size.setX(i, alpha > 0.002 ? px : 0);
  };
  const flush = () => { pos.needsUpdate = true; look.needsUpdate = true; size.needsUpdate = true; };
  return { sprite, set, flush };
}

const GOLD_PINK: [number, number, number] = [2.4, 1.6, 1.85];
const DRIFT_WHITE: [number, number, number] = [0.85, 0.88, 1.0];
const DRIFT_POOL = 360;
/** Uma estrela comum nova a cada tantos segundos depois do poema. */
const DRIFT_EVERY = 2.2;
const FALL_SECONDS = 1.8;
const deg = THREE.MathUtils.degToRad;

const fract = (v: number) => v - Math.floor(v);
const hash = (n: number) => fract(Math.sin(n * 91.345 + 7.13) * 43758.5453);

/**
 * As noites juntos: uma estrela dourado-rosada por noite numa faixa em volta de Órion, acendendo uma a uma
 * com `nights` (0 a 1). As que nasceram desde a última visita chegam caindo. Depois, estrelas comuns
 * continuam surgindo devagar, sem fim (um anel de sprites reaproveitados).
 */
export function createNights(count: number, firstNew: number) {
  const nights = spriteCloud(count, 0.5);
  const drift = spriteCloud(DRIFT_POOL);
  const object = new THREE.Group();
  object.add(nights.sprite, drift.sprite);
  const stars = Array.from({ length: count }, (_, i) => nightStar(i));
  const litAt = new Float32Array(count).fill(-1);
  const right = new THREE.Vector3(), up = new THREE.Vector3(), p = new THREE.Vector3(), tmp = new THREE.Vector3();
  let clock = 0;
  let driftClock = 0;

  /** Direção a (x, y) graus do centro, no plano tangente do céu em volta de `center`. */
  const at = (center: THREE.Vector3, x: number, y: number, out: THREE.Vector3) => {
    out.copy(center).addScaledVector(right, Math.tan(deg(x))).addScaledVector(up, Math.tan(deg(y)));
    return out.normalize().multiplyScalar(STAR_RADIUS - 5);
  };

  return {
    object,
    /** `center`: direção de Órion; `amount`: o `nights` da linha do tempo; `after`: o poema acabou. */
    update(dt: number, center: THREE.Vector3, amount: number, after: boolean) {
      clock += dt;
      right.crossVectors(center, tmp.set(0, 1, 0)).normalize();
      up.crossVectors(right, center).normalize();
      for (let i = 0; i < count; i++) {
        const s = stars[i]!;
        const on = Math.min(1, Math.max(0, amount * count - i));
        if (on > 0 && litAt[i]! < 0) litAt[i] = clock;
        if (on === 0) litAt[i] = -1;
        let [x, y] = s.offset;
        let boost = 1;
        if (i >= firstNew && litAt[i]! >= 0) {
          // Estrela nova desde a última visita: cai de cima, em diagonal, e assenta.
          const f = Math.min(1, (clock - litAt[i]!) / FALL_SECONDS);
          const e = 1 - (1 - f) ** 3;
          x += (1 - e) * 9;
          y += (1 - e) * 22;
          boost = 1 + (1 - f) * 1.5;
        }
        nights.set(i, at(center, x, y, p), GOLD_PINK, on * boost, 22 * s.size * boost);
      }
      nights.flush();

      driftClock = after ? driftClock + dt : 0;
      const born = Math.floor(driftClock / DRIFT_EVERY);
      for (let k = 0; k < DRIFT_POOL; k++) {
        // O sprite k mostra a estrela mais recente com índice = k (mod o anel); a mais velha some quando é trocada.
        const idx = born - ((born - k) % DRIFT_POOL + DRIFT_POOL) % DRIFT_POOL;
        if (!after || idx < 0 || idx > born) { drift.set(k, p.set(0, 0, 0), DRIFT_WHITE, 0, 0); continue; }
        const age = driftClock - idx * DRIFT_EVERY;
        const fadeIn = Math.min(1, age / 6);
        const ang = hash(idx) * Math.PI * 2, rad = 4 + Math.sqrt(hash(idx + 0.5)) * 34;
        drift.set(k, at(center, Math.cos(ang) * rad, Math.sin(ang) * rad * 0.7, p), DRIFT_WHITE, fadeIn * (0.35 + hash(idx + 0.3) * 0.5), 4 + hash(idx + 0.7) * 2.5);
      }
      drift.flush();
    },
  };
}
