import { describe, it, expect } from 'vitest';
import { frameFlower, type Framing, type Vec3 } from '../../src/core/framing';
import { buildFlower } from '../../src/scene/flower/build';
import { cyrb128 } from '../../src/seed/hash';
import { NAME_SEED } from '../../src/seed/constants';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (a: Vec3): Vec3 => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };

// Coordenada vertical normalizada do ponto na tela (-1 em baixo, 1 em cima), como uma câmera de perspectiva
// olhando do `position` para o `target` com o eixo Y do mundo para cima. Independe da largura da janela.
function verticalNdc(f: Framing, p: Vec3): number {
  const forward = normalize(sub(f.target, f.position));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const d = sub(p, f.position);
  const depth = dot(d, forward);
  expect(depth).toBeGreaterThan(0);
  return dot(d, up) / (depth * Math.tan((f.fov / 2) * (Math.PI / 180)));
}

describe('frameFlower', () => {
  it('keeps the hand-tuned framing for the name seed', () => {
    const { meshes } = buildFlower(NAME_SEED);
    const f = frameFlower(meshes.height);
    expect(f.fov).toBe(36);
    expect(f.target[1]).toBeCloseTo(0.62, 1);
    expect(f.position[0]).toBeCloseTo(0.9, 1);
    expect(f.position[1]).toBeCloseTo(1.08, 1);
    expect(f.position[2]).toBeCloseTo(2.1, 1);
  });

  it('frames the seed at y = 0 and the closed petal top for 100 seeds', () => {
    for (let i = 0; i < 100; i++) {
      const { params, meshes } = buildFlower(cyrb128(`frame-${i}`));
      const f = frameFlower(meshes.height);
      const top = verticalNdc(f, [0, meshes.height + params.petalLength, 0]);
      const bottom = verticalNdc(f, [0, 0, 0]);
      expect(top, `seed frame-${i}: petal top (height ${meshes.height.toFixed(2)})`).toBeLessThan(0.95);
      expect(bottom, `seed frame-${i}: seed at the base`).toBeGreaterThan(-0.95);
    }
  }, 20_000); // constrói 100 flores: uns 3 a 5 s, perto demais do limite padrão de 5 s
});
