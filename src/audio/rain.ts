import { type Audio, pinkNoise } from './context';

/** Leito discreto por baixo do trovão (o dono achou 0,5 forte demais). */
const RAIN_GAIN = 0.06;

/** Chuva sintetizada: ruído rosa em laço, sem graves e com o agudo aparado. Volume segue `uRain`. */
export function createRainSound({ ctx, master }: Audio) {
  const src = ctx.createBufferSource();
  src.buffer = pinkNoise(ctx, 4);
  src.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 400;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(hp).connect(lp).connect(g).connect(master);
  src.start();
  let last = -1;
  return {
    setIntensity(rain: number) {
      if (Math.abs(rain - last) < 0.01) return;
      last = rain;
      g.gain.setTargetAtTime(RAIN_GAIN * rain, ctx.currentTime, 0.4);
    },
  };
}
