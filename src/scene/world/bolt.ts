// Raio ramificado por deslocamento de ponto médio e cronograma de raios. Puro: sem three, testável em Node.
import { type Rng, range, int } from '../../seed/prng';
import { type Vec3, add, sub, scale, length, dot, normalize } from '../../lsystem/vec3';

/** Deslocamento do nível k é LEN * AMP * DECAY^k; a soma geométrica fica em 0,244 do comprimento (< 25%). */
const AMP = 0.11;
const DECAY = 0.55;
const MAX_DEVIATION = 0.24;

function randomPerpendicular(rng: Rng, dir: Vec3): Vec3 {
  const r: Vec3 = [rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1];
  return normalize(sub(r, scale(dir, dot(r, dir))));
}

function midpointPath(rng: Rng, a: Vec3, b: Vec3, depth: number, len: number): Vec3[] {
  let pts: Vec3[] = [a, b];
  for (let k = 0; k < depth; k++) {
    const amp = len * AMP * DECAY ** k;
    const next: Vec3[] = [pts[0]!];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i]!, q = pts[i + 1]!;
      const dir = normalize(sub(q, p));
      const mid = add(scale(add(p, q), 0.5), scale(randomPerpendicular(rng, dir), amp * (rng() * 2 - 1)));
      next.push(mid, q);
    }
    pts = next;
  }
  return pts;
}

/** Puxa o ponto para dentro do cilindro de raio MAX_DEVIATION * len em volta do segmento start-end. */
function clampToLine(p: Vec3, start: Vec3, end: Vec3, len: number): Vec3 {
  const ab = sub(end, start);
  const t = Math.min(1, Math.max(0, dot(sub(p, start), ab) / dot(ab, ab)));
  const onLine = add(start, scale(ab, t));
  const off = sub(p, onLine);
  const d = length(off);
  const max = MAX_DEVIATION * len;
  return d <= max ? p : add(onLine, scale(off, max / d));
}

/**
 * Canal principal (primeiro caminho, de `start` a `end`, 2^depth + 1 pontos) e ramos que saem dele.
 * Nenhum ponto fica a mais de 25% do comprimento da reta start-end.
 */
export function boltPoints(rng: Rng, start: Vec3, end: Vec3, depth: number): Vec3[][] {
  const len = length(sub(end, start));
  const main = midpointPath(rng, start, end, depth, len);
  const paths: Vec3[][] = [main];
  if (depth < 3) return paths;
  const axis = normalize(sub(end, start));
  const branches = int(rng, 2, 4);
  for (let b = 0; b < branches; b++) {
    const i = Math.floor(range(rng, 0.15, 0.7) * (main.length - 1));
    const from = main[i]!;
    const bLen = len * range(rng, 0.15, 0.32);
    const dir = normalize(add(axis, scale(randomPerpendicular(rng, axis), range(rng, 0.5, 1.1))));
    const to = add(from, scale(dir, bLen));
    paths.push(midpointPath(rng, from, to, depth - 2, bLen).map((p) => clampToLine(p, start, end, len)));
  }
  return paths;
}

/**
 * Instantes (s) dos raios em [0, durationSeconds]. O primeiro cai cedo (1,5 a 3,5 s) para a tempestade
 * se anunciar logo; daí em diante os intervalos ficam entre 6 e 14 s.
 */
export function lightningSchedule(rng: Rng, durationSeconds: number): number[] {
  const out: number[] = [];
  let t = range(rng, 1.5, 3.5);
  while (t <= durationSeconds) {
    out.push(t);
    t += range(rng, 6, 14);
  }
  return out;
}
