// Passos da experiência: posições fixas em `p` para as setas e o teclado. O scroll livre continua valendo;
// os passos só dão um caminho controlado, um de cada vez. Puro: sem three, sem DOM.
import { ACTS, NAME_STAGES, POEM_SLOTS } from './timeline';
import type { Seed128 } from '../seed/hash';
import { sfc32 } from '../seed/prng';
import { flowerParams } from '../flower/params';

export interface Step {
  id: string;
  p: number;
  /** Duração da transição que chega neste passo (e da volta dele), em segundos; sem isso, pela distância. */
  dur?: number;
}

const namePos = (x: number) => ACTS.name[0] + (x / NAME_STAGES) * (ACTS.name[1] - ACTS.name[0]);
const poemPos = (x: number) => ACTS.poem[0] + (x / POEM_SLOTS) * (ACTS.poem[1] - ACTS.poem[0]);

export const STEPS: readonly Step[] = [
  { id: 'seed', p: 0 },
  { id: 'flower', p: ACTS.flower[1], dur: 6 },
  { id: 'name-1', p: namePos(1), dur: 2.2 },
  { id: 'name-2', p: namePos(2), dur: 4.5 },
  { id: 'name-3', p: namePos(3), dur: 3 },
  { id: 'name-4', p: namePos(4), dur: 2.4 },
  { id: 'ascent', p: 0.46 },
  { id: 'storm', p: 0.585 },
  { id: 'sky', p: 0.7 },
  { id: 'orion', p: 0.755 },
  // Cada verso fica inteiro (inglês e tradução) em i + 0,65; a vaga 9 é só céu; o dístico inteiro em 11,8.
  ...Array.from({ length: 9 }, (_, i) => ({ id: `poem-${i + 1}`, p: poemPos(i + 0.65), dur: 2 })),
  { id: 'poem-blank', p: poemPos(9.5), dur: 2 },
  { id: 'poem-couplet', p: poemPos(11.8), dur: 3.5 },
  { id: 'nights', p: 1, dur: 3.5 },
];

const SECONDS_PER_P = 30;

/** Duração do trecho entre o passo i - 1 e o passo i. */
export function stepDuration(i: number, steps: readonly Step[] = STEPS): number {
  const s = steps[i]!;
  if (s.dur !== undefined) return s.dur;
  return Math.min(4, Math.max(1.2, (s.p - steps[i - 1]!.p) * SECONDS_PER_P));
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const EPS = 1e-4;

/**
 * Navegação por passos: cada comando anima `p` até o próximo passo naquela direção (nunca pula um passo);
 * durante uma transição, guarda no máximo um comando para depois.
 */
export class StepNav {
  private anim: { from: number; to: number; t: number; dur: number } | null = null;
  private queued: 1 | -1 | null = null;

  constructor(private readonly steps: readonly Step[] = STEPS) {}

  get busy(): boolean { return this.anim !== null; }

  /** Índice do passo alvo a partir de `p` na direção `dir`, ou -1 se não houver. */
  target(dir: 1 | -1, p: number): number {
    if (dir > 0) return this.steps.findIndex((s) => s.p > p + EPS);
    for (let i = this.steps.length - 1; i >= 0; i--) if (this.steps[i]!.p < p - EPS) return i;
    return -1;
  }

  command(dir: 1 | -1, p: number) {
    if (this.anim) { this.queued = dir; return; }
    this.start(dir, p);
  }

  cancel() { this.anim = null; this.queued = null; }

  private start(dir: 1 | -1, p: number) {
    const i = this.target(dir, p);
    if (i < 0) return;
    // A volta usa a duração do mesmo trecho na ida.
    const dur = stepDuration(dir > 0 ? i : Math.min(i + 1, this.steps.length - 1), this.steps);
    this.anim = { from: p, to: this.steps[i]!.p, t: 0, dur };
  }

  /** Avança a transição; devolve o `p` animado, ou null quando não há transição (o scroll livre manda). */
  update(dt: number): number | null {
    const a = this.anim;
    if (!a) return null;
    a.t = Math.min(1, a.t + dt / a.dur);
    if (a.t < 1) return a.from + (a.to - a.from) * easeInOut(a.t);
    this.anim = null;
    const q = this.queued;
    this.queued = null;
    if (q) this.start(q, a.to);
    return a.to;
  }
}

/** A seed como 32 dígitos hexadecimais, em grupos de 8. */
export const seedHex = (seed: Seed128) => seed.map((n) => (n >>> 0).toString(16).padStart(8, '0')).join(' ');

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** As características da flor, lidas dos parâmetros da própria seed. */
export function nameFacts(seed: Seed128): string {
  const p = flowerParams(sfc32(seed));
  return [
    plural(p.petalCount, 'pétala', 'pétalas'),
    plural(p.petalLayers, 'camada', 'camadas'),
    plural(p.sideBuds, 'botão', 'botões'),
    plural(p.leafCount, 'folha', 'folhas'),
    `rosa ${Math.round(p.hue)}°`,
  ].join(' · ');
}
