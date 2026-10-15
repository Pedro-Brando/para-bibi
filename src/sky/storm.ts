// A tempestade segue a cobertura de nuvens: quando o céu abre, chuva e relâmpagos param juntos.

/** Cobertura em que os relâmpagos param; a chuva já está abaixo da metade aqui. */
export const LIGHTNING_MIN_COVERAGE = 0.65;

export function stormFromCoverage(coverage: number): { rain: number; lightning: boolean } {
  const x = Math.min(1, Math.max(0, (coverage - 0.4) / 0.5));
  return { rain: x * x * (3 - 2 * x), lightning: coverage >= LIGHTNING_MIN_COVERAGE };
}
