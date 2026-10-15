// Cor das estrelas a partir do índice B-V. Domínio puro, sem three.

/** Ballesteros (2012): temperatura efetiva em kelvin. */
export const bvToKelvin = (bv: number) => 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/**
 * Corpo negro aproximado por ajuste (Tanner Helland, 1000 K a 40000 K) em sRGB, convertido para RGB linear e
 * normalizado para o maior canal valer 1 (o brilho vem da magnitude, não daqui).
 */
export function kelvinToRgb(kelvin: number): [number, number, number] {
  const t = Math.min(40000, Math.max(1000, kelvin)) / 100;
  const clamp = (x: number) => Math.min(255, Math.max(0, x)) / 255;
  const r = t <= 66 ? 1 : clamp(329.698727446 * (t - 60) ** -0.1332047592);
  const g = t <= 66 ? clamp(99.4708025861 * Math.log(t) - 161.1195681661) : clamp(288.1221695283 * (t - 60) ** -0.0755148492);
  const b = t >= 66 ? 1 : t <= 19 ? 0 : clamp(138.5177312231 * Math.log(t - 10) - 305.0447927307);
  const lin = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const max = Math.max(...lin);
  return [lin[0]! / max, lin[1]! / max, lin[2]! / max];
}

export const bvToRgb = (bv: number) => kelvinToRgb(bvToKelvin(bv));
