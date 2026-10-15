// AudioContext só nasce depois de um gesto do usuário: o clique da tela de entrada (startAudio). Nas capturas
// sem tela de entrada, o primeiro clique na página.

/** `master`: a tempestade (chuva e trovão); `out`: tudo, inclusive a música (o botão de som). */
export interface Audio { ctx: AudioContext; master: GainNode; out: GainNode }

const MASTER_GAIN = 0.35;
let audio: Audio | null = null;
const waiting: ((a: Audio) => void)[] = [];

export function getAudio(): Audio | null {
  return audio;
}

/** Chama `fn` quando o som estiver ligado (na hora, se já estiver). */
export function onAudioReady(fn: (a: Audio) => void): void {
  if (audio) fn(audio);
  else waiting.push(fn);
}

/** Cria o AudioContext; chamar dentro do gesto do usuário. */
export function startAudio(): Audio {
  if (audio) return audio;
  const ctx = new AudioContext();
  const out = ctx.createGain();
  out.connect(ctx.destination);
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(out);
  audio = { ctx, master, out };
  void ctx.resume();
  for (const fn of waiting.splice(0)) fn(audio);
  return audio;
}

export function enableAudioOnFirstGesture(target: EventTarget = window): void {
  const start = () => {
    target.removeEventListener('pointerdown', start);
    target.removeEventListener('keydown', start);
    startAudio();
  };
  target.addEventListener('pointerdown', start);
  target.addEventListener('keydown', start);
}

/** Ruído marrom (passeio aleatório integrado): grave e encorpado, base do trovão. */
export function brownNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}

/** Ruído rosa (filtro de Paul Kellet): o chiado natural da chuva. */
export function pinkNoise(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}
