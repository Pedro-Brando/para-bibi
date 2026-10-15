// Órion por números HIP (os ids do catálogo do d3-celestial).
export const ORION = {
  betelgeuse: 27989, bellatrix: 25336, mintaka: 25930, alnilam: 26311,
  alnitak: 26727, saiph: 27366, rigel: 24436, meissa: 26207,
} as const;

export const ORION_HIPS: number[] = Object.values(ORION);

/** Ordem de desenho: cabeça e ombros, cinturão, depois as pernas. */
export const ORION_LINES: [number, number][] = [
  [27989, 26207], [26207, 25336], [27989, 26727], [25336, 25930],
  [25930, 26311], [26311, 26727], [26727, 27366], [25930, 24436],
];
