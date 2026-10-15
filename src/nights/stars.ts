// Onde fica a estrela de cada noite: deslocamento angular em volta de Órion, sempre o mesmo para o índice.
import { cyrb128 } from '../seed/hash';
import { sfc32, range } from '../seed/prng';

export interface NightStar {
  /** Graus a partir do centro de Órion: [direita, cima] no plano do céu. */
  offset: [number, number];
  /** Tamanho relativo, 0,7 a 1,3. */
  size: number;
}

const BASE = cyrb128('noites com a Bibi');

export function nightStar(index: number): NightStar {
  const [a, b, c, d] = BASE;
  const rng = sfc32([(a ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0, (b + index) >>> 0, c, d]);
  for (let k = 0; k < 3; k++) rng();
  const angle = range(rng, 0, Math.PI * 2);
  // Raio por área (sqrt) para a faixa não amontoar na borda de dentro.
  const r = Math.sqrt(range(rng, 10 * 10, 26 * 26));
  return { offset: [Math.cos(angle) * r, Math.sin(angle) * r], size: range(rng, 0.7, 1.3) };
}
