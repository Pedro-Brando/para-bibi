// As duas cidades do céu real. Latitude e longitude em graus (oeste negativo), altura em metros.
export interface City { lat: number; lon: number; height: number }

export const CITIES = {
  saoPaulo: { lat: -23.55, lon: -46.63, height: 700 },
  valadares: { lat: -18.85, lon: -41.95, height: 700 },
} as const satisfies Record<string, City>;

/** 0 = São Paulo, 1 = Governador Valadares; interpolação linear (as cidades estão perto). */
export function cityAt(blend: number): City {
  const t = Math.min(1, Math.max(0, blend));
  if (t === 0) return { ...CITIES.saoPaulo };
  if (t === 1) return { ...CITIES.valadares };
  const a = CITIES.saoPaulo, b = CITIES.valadares;
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, height: a.height };
}
