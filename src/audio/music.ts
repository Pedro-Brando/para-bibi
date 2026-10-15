import type { Audio } from './context';

const LEVEL = 0.55;
const FADE_IN = 4;

/** A música (Neath Dark Waters) em laço, com fade in, e abaixando um pouco a cada trovão. */
export function createMusic(a: Audio, url: string) {
  const el = new window.Audio(url);
  el.loop = true;
  el.preload = 'auto';
  const gain = a.ctx.createGain();
  gain.gain.value = 0;
  a.ctx.createMediaElementSource(el).connect(gain).connect(a.out);
  return {
    /** Chamar dentro do gesto (clique de entrada). */
    start() {
      void el.play().catch(() => {});
      const now = a.ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(LEVEL, now + FADE_IN);
    },
    duck() {
      const now = a.ctx.currentTime;
      if (now < FADE_IN + 0.5) return; // não atropela o fade in
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(LEVEL * 0.55, now, 0.08);
      gain.gain.setTargetAtTime(LEVEL, now + 1.4, 1.2);
    },
  };
}

/** Liga e desliga tudo (música e tempestade) com uma rampa curta. */
export function setSound(a: Audio, on: boolean) {
  const now = a.ctx.currentTime;
  a.out.gain.cancelScheduledValues(now);
  a.out.gain.setTargetAtTime(on ? 1 : 0, now, 0.15);
}
