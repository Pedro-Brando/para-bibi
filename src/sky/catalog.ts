// Catálogo de estrelas gerado por scripts/build-catalog.mjs. Domínio puro, sem three.

/** Floats por estrela em stars.bin: [raRad, decRad, mag, bv]. */
export const STAR_STRIDE = 4;

export interface CatalogMeta {
  count: number;
  stride: number;
  source: string;
  license: string;
  /** Número HIP de cada estrela, na mesma ordem de stars.bin. */
  hip: number[];
}

export const decodeCatalog = (buf: ArrayBuffer) => new Float32Array(buf);
