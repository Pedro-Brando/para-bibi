export interface AppOptions {
  backend: 'auto' | 'webgl';
  growth: number | null;
  freeze: boolean;
  dev: boolean;
  seed: 'name' | string;
  /** 'full': Quarrymill inteira; 'flower': só a flor no fundo escuro, como na fase 1. */
  scene: 'full' | 'flower';
}

export function parseOptions(search: string): AppOptions {
  const q = new URLSearchParams(search);
  const g = q.get('growth');
  const gNum = g === null ? NaN : Number(g);
  return {
    backend: q.get('backend') === 'webgl' ? 'webgl' : 'auto',
    growth: Number.isFinite(gNum) ? Math.min(1, Math.max(0, gNum)) : null,
    freeze: q.get('freeze') === '1',
    dev: q.get('dev') === '1',
    seed: q.get('seed') ?? 'name',
    scene: q.get('scene') === 'flower' ? 'flower' : 'full',
  };
}
