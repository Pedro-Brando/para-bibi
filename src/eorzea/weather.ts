// Clima de Eorzea pelo algoritmo da comunidade (o mesmo do pacote eorzea-weather). Domínio puro, sem three.

export type Weather = 'fog' | 'thunderstorms' | 'thunder' | 'clouds' | 'fairSkies' | 'clearSkies';

/** Chance de 0 a 99 da janela de 8 horas de Eorzea (1400 s reais) que contém `unixSeconds`. */
export function weatherChance(unixSeconds: number): number {
  const bell = Math.floor(unixSeconds / 175);
  const inc = (bell + 8 - (bell % 8)) % 24;
  const days = Math.floor(unixSeconds / 4200);
  const base = (days * 100 + inc) >>> 0;
  const s1 = ((base << 11) ^ base) >>> 0;
  const s2 = ((s1 >>> 8) ^ s1) >>> 0;
  return s2 % 100;
}

export function southShroudWeather(chance: number): Weather {
  if (chance < 5) return 'fog';
  if (chance < 10) return 'thunderstorms';
  if (chance < 25) return 'thunder';
  if (chance < 30) return 'fog';
  if (chance < 40) return 'clouds';
  if (chance < 70) return 'fairSkies';
  return 'clearSkies';
}

const LABELS: Record<Weather, string> = {
  thunder: 'Trovoada',
  thunderstorms: 'Tempestade',
  fog: 'Neblina',
  clouds: 'Nublado',
  fairSkies: 'Céu bom',
  clearSkies: 'Céu limpo',
};

export const weatherLabelPt = (w: Weather): string => LABELS[w];
