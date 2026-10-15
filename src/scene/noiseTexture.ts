import * as THREE from 'three/webgpu';
import { texture } from 'three/tsl';

const SIZE = 256;

/** Ruído de gradiente 2D periódico (período `period` células), para a textura ladrilhar sem emenda. */
function perlinPeriodic(seed: number) {
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = seed >>> 0;
  const rnd = () => { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return s / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j]!, p[i]!]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]!;
  const grad = (h: number, x: number, y: number) => {
    const a = (h / 256) * Math.PI * 2;
    return Math.cos(a) * x + Math.sin(a) * y;
  };
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number, period: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const h = (i: number, j: number) => perm[perm[((i % period) + period) % period]! + (((j % period) + period) % period)]!;
    const u = fade(xf), v = fade(yf);
    const n00 = grad(h(xi, yi), xf, yf), n10 = grad(h(xi + 1, yi), xf - 1, yf);
    const n01 = grad(h(xi, yi + 1), xf, yf - 1), n11 = grad(h(xi + 1, yi + 1), xf - 1, yf - 1);
    const a = n00 + (n10 - n00) * u, b = n01 + (n11 - n01) * u;
    return a + (b - a) * v;
  };
}

/** fbm periódico em [0, 1] com contraste normalizado (percentis 2 e 98 viram 0,12 e 0,88). */
function fbmChannel(seed: number, basePeriod: number, octaves: number, gain: number): Float32Array {
  const noise = perlinPeriodic(seed);
  const out = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let sum = 0, amp = 1, period = basePeriod;
      for (let o = 0; o < octaves; o++) {
        sum += amp * noise((x / SIZE) * period, (y / SIZE) * period, period);
        amp *= gain; period *= 2;
      }
      out[y * SIZE + x] = sum;
    }
  }
  const sorted = Float32Array.from(out).sort();
  const lo = sorted[Math.floor(sorted.length * 0.02)]!, hi = sorted[Math.floor(sorted.length * 0.98)]!;
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, Math.max(0, 0.12 + 0.76 * (out[i]! - lo) / (hi - lo)));
  return out;
}

let cached: THREE.DataTexture | null = null;

/**
 * Ruído assado uma vez na carga: fbm ladrilhável 256 x 256, R grosso (5 oitavas) e G fino (3 oitavas).
 * Nuvens, véu e chão leem esta textura (uma ou duas amostras) em vez de calcular fbm por pixel.
 */
export function noiseTexture(): THREE.DataTexture {
  if (cached) return cached;
  const r = fbmChannel(0x51a7e, 4, 5, 0.55);
  const g = fbmChannel(0xb1b1, 8, 3, 0.5);
  const data = new Uint8Array(SIZE * SIZE * 4);
  for (let i = 0; i < SIZE * SIZE; i++) {
    data[i * 4] = Math.round(r[i]! * 255);
    data[i * 4 + 1] = Math.round(g[i]! * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

/** Nó de amostra da textura de ruído nas coordenadas `uvNode` (em ladrilhos). */
export const sampleNoise = (uvNode: Parameters<typeof texture>[1]) => texture(noiseTexture(), uvNode);
