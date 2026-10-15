// Estrelas de Eorzea: um céu inventado, mas com a distribuição de magnitudes do real. Domínio puro, sem three.
import { FIRST_DATE_UNIX } from '../eorzea/time';
import { cyrb128 } from '../seed/hash';
import { sfc32 } from '../seed/prng';
import { STAR_STRIDE } from './catalog';

export const EORZEA_STAR_COUNT = 1600;

/** Mesmo formato de stars.bin ([raRad, decRad, mag, bv]); seed derivada de FIRST_DATE_UNIX. */
export function eorzeaStars(): Float32Array {
  const rng = sfc32(cyrb128(`eorzea-sky:${FIRST_DATE_UNIX}`));
  const out = new Float32Array(EORZEA_STAR_COUNT * STAR_STRIDE);
  for (let i = 0; i < EORZEA_STAR_COUNT; i++) {
    const ra = rng() * 2 * Math.PI;
    const dec = Math.asin(2 * rng() - 1);
    // Contagem acumulada cresce como 10^(0,5 m): poucas brilhantes, muitas fracas.
    const mag = Math.max(-1, 6 + 2 * Math.log10(Math.max(rng(), 1e-6)));
    const bv = -0.2 + 1.8 * rng() ** 1.6;
    out.set([ra, dec, mag, bv], i * STAR_STRIDE);
  }
  return out;
}
