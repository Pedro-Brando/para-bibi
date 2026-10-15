// Linha do tempo do site: o progresso do scroll (0 a 1) vira todos os controles da cena. Puro: sem three.

/** Atos (spec seção 3), em fração do scroll. */
export const ACTS = {
  seed: [0, 0.15],
  flower: [0.15, 0.35],
  ascent: [0.35, 0.5],
  storm: [0.5, 0.6],
  opening: [0.6, 0.7],
  realSky: [0.7, 0.78],
  poem: [0.78, 0.97],
  nights: [0.97, 1],
} as const;

/** Vagas do poema: 9 versos, a linha em branco, e o dístico final (que ocupa as duas últimas vagas). */
export const POEM_SLOTS = 12;

export interface SceneState {
  growth: number;
  /** Parâmetro na spline da câmera, 0 a 1. */
  cameraT: number;
  rain: number;
  coverage: number;
  worldBlend: number;
  orion: number;
  cityBlend: number;
  /** Vaga do verso visível, fracionária (0 a POEM_SLOTS) para os fades. */
  poemLine: number;
  /** Quanto das estrelas das noites já acendeu, 0 a 1. */
  nights: number;
  /** Opacidade do rótulo do canto; `realLabel` diz qual dos dois textos ele mostra. */
  labelOpacity: number;
  realLabel: boolean;
  /** A frase das duas cidades, sobre o céu real. */
  phraseOpacity: number;
  /** As duas camadas de silhueta mais perto: saem enquanto a câmera sobe, porque as copas cobririam Órion. */
  nearLayers: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Smoothstep de a até b (0 antes, 1 depois). */
const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lin = (a: number, b: number, x: number) => clamp01((x - a) / (b - a));

/** Marcos da câmera: linear por trechos (smoothstep pararia a câmera em cada marco). */
const CAMERA_KEYS: [number, number][] = [[0, 0], [0.15, 0.08], [0.35, 0.25], [0.5, 0.62], [0.6, 0.8], [0.7, 1]];

function cameraAt(p: number): number {
  for (let i = 1; i < CAMERA_KEYS.length; i++) {
    const [p1, t1] = CAMERA_KEYS[i]!;
    if (p <= p1) {
      const [p0, t0] = CAMERA_KEYS[i - 1]!;
      return t0 + (t1 - t0) * lin(p0, p1, p);
    }
  }
  return 1;
}

export function stateAt(progress: number): SceneState {
  const p = Number.isFinite(progress) ? clamp01(progress) : 0;
  const clearing = 1 - ss(0.6, 0.7, p);
  const realLabel = p >= 0.67;
  return {
    growth: ss(ACTS.flower[0], ACTS.flower[1], p),
    cameraT: cameraAt(p),
    rain: clearing,
    coverage: clearing,
    worldBlend: ss(0.64, 0.7, p),
    orion: ss(ACTS.realSky[0], ACTS.realSky[1], p),
    cityBlend: 0,
    poemLine: lin(ACTS.poem[0], ACTS.poem[1], p) * POEM_SLOTS,
    nights: lin(ACTS.nights[0], ACTS.nights[1], p),
    labelOpacity: realLabel ? ss(0.68, 0.72, p) : 1 - ss(0.62, 0.66, p),
    realLabel,
    phraseOpacity: ss(0.705, 0.725, p) * (1 - ss(0.76, 0.78, p)),
    nearLayers: 1 - ss(0.42, 0.55, p),
  };
}
