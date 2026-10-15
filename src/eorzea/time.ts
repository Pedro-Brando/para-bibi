// Hora de Eorzea: 1 hora de Eorzea = 175 s reais (1 dia = 70 min). Domínio puro, sem three.

/** 2026-10-03 03:53 BRT, o primeiro encontro. */
export const FIRST_DATE_UNIX = 1791010380;

export function eorzeaTime(unixSeconds: number): { hours: number; minutes: number } {
  const et = (unixSeconds * 3600) / 175;
  return { hours: Math.floor(et / 3600) % 24, minutes: Math.floor(et / 60) % 60 };
}

export const formatEt = (t: { hours: number; minutes: number }) =>
  `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`;
