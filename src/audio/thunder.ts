import { type Audio, brownNoise } from './context';

const SPEED_OF_SOUND = 343;

/** Atraso do trovão: distância / 343 s, limitado a 0,5 a 6 s (as distâncias da cena são curtas para a física). */
export function thunderDelay(distance: number): number {
  return Math.min(6, Math.max(0.5, distance / SPEED_OF_SOUND));
}

let buffer: AudioBuffer | null = null;

/**
 * Trovão sintetizado em três camadas de ruído marrom: estalo (curto, mais agudo), ribombo (grave, com
 * pulsos) e cauda de 3 a 5 s. Quanto mais longe, mais grave e mais baixo.
 */
export function playThunder({ ctx, master }: Audio, distance: number): void {
  buffer ??= brownNoise(ctx, 9);
  const t0 = ctx.currentTime + thunderDelay(distance);
  const near = Math.min(1, Math.max(0, 1 - (distance - 40) / 200));
  const tail = 3 + Math.random() * 2;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 0.7;
  lp.frequency.setValueAtTime(400 + 1400 * near, t0);
  lp.frequency.exponentialRampToValueAtTime(140 + 120 * near, t0 + 0.6);
  lp.frequency.exponentialRampToValueAtTime(70, t0 + 1 + tail);

  const g = ctx.createGain();
  const peak = 0.5 + 0.5 * near;
  g.gain.setValueAtTime(0.0001, t0);
  // Estalo
  g.gain.exponentialRampToValueAtTime(peak * (0.6 + 0.6 * near), t0 + 0.03);
  g.gain.exponentialRampToValueAtTime(peak * 0.45, t0 + 0.25);
  // Ribombo: alguns pulsos irregulares
  let t = t0 + 0.25;
  for (let i = 0; i < 4; i++) {
    t += 0.15 + Math.random() * 0.25;
    g.gain.linearRampToValueAtTime(peak * (0.55 + Math.random() * 0.45), t);
    t += 0.1 + Math.random() * 0.2;
    g.gain.linearRampToValueAtTime(peak * (0.3 + Math.random() * 0.2), t);
  }
  // Cauda
  g.gain.exponentialRampToValueAtTime(0.0001, t + tail);

  src.connect(lp).connect(g).connect(master);
  src.start(t0, Math.random() * 1.5);
  src.stop(t + tail + 0.1);
}
