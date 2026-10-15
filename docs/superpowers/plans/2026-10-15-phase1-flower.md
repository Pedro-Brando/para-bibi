# Fase 1: a flor. Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** uma página que mostra, sozinha, a flor gerada a partir da seed do nome dela, crescendo na GPU da semente até a flor aberta, com o material rosa translúcido e bioluminescente e bloom, pronta para aprovação visual.

**Architecture:** módulos de domínio puros e sem Three.js (`seed`, `color`, `lsystem`) geram parâmetros, uma string de L-system e um esqueleto 3D. Construtores de malha (`scene/flower`) transformam o esqueleto em arrays tipados com atributos de crescimento. Um único nó TSL de crescimento deforma todos os vértices a partir de `uGrowth`, então o crescimento é reversível e não toca a CPU. O renderizador é o `WebGPURenderer` do Three.js, com fallback automático para WebGL2.

**Tech Stack:** TypeScript, Vite, Three.js (WebGPURenderer + TSL), Vitest, Playwright, lil-gui (só em modo dev), pngjs (só nos testes).

**Spec:** `docs/superpowers/specs/2026-10-15-quarrymill-design.md` (seções 4, 5, 11, 12 são as que esta fase implementa)

## Global Constraints

- Versões exatas, sem `^` nem `~`: `three@0.186.1`, `@types/three@0.186.0`, `vite@8.3.1`, `vitest@5.0.3`, `typescript@7.0.2`, `@playwright/test@1.63.0`, `lil-gui@0.21.0`, `pngjs@7.0.0`, `@types/pngjs@6.0.5`. Se `typescript@7.0.2` não rodar `tsc --noEmit` neste projeto, usar `typescript@5.9.3` e registrar a troca no commit.
- Node 20.20 e npm 10 (já instalados). Usar npm, não pnpm.
- Os módulos em `src/seed`, `src/color`, `src/lsystem` e `src/core` não importam `three`.
- O nome completo dela nunca aparece no repositório: nem em código, nem em teste, nem em commit, nem em comentário. Só a constante numérica `NAME_SEED`.
- A versão de `three` não é atualizada durante o projeto. Toda API de `three/webgpu` e `three/tsl` usada deve ser conferida no código instalado em `node_modules/three` (exemplos em `node_modules/three/examples/` com prefixo `webgpu_`), não na memória.
- Fundo da cena: `#07060d`. Matiz do rosa: 330° a 355° em OKLCH.
- Alvo de desempenho: 60 fps em 1440p em GPU intermediária; `devicePixelRatio` limitado a 2.
- Texto visível ao usuário em português do Brasil; nenhum travessão longo (o caractere U+2014) em texto, comentários ou commits.
- Commits terminam com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Usar `git commit -F -` com heredoc no Bash.
- Os implementadores rodam como Fable 5.1 com esforço max.

## Review Focus

1. **Sem WebGPU** (`navigator.gpu` ausente, ou `?backend=webgl`): a flor deve aparecer igual pelo backend WebGL2. Teste e2e na Task 7.
2. **Crescimento nos extremos e de trás para frente:** em `growth=0` só a semente brilha e nenhuma pétala aparece; em `growth=1` tudo aberto; voltar de 1 para 0 nunca gera NaN (anel de raio zero, normal degenerada). Testes na Task 6 (normais finitas, `growVertex` em 0) e na Task 7 (contagem de pixels rosa em 0 e em 1).
3. **Seeds extremas** (13 pétalas, 3 camadas, 2 botões, 5 folhas): a geometria precisa ser construída em menos de 200 ms e ficar abaixo de 200 mil vértices. Teste na Task 6.
4. **Redimensionar a janela e DPR alto:** nenhum erro no console e DPR efetivo nunca acima de 2. Teste e2e na Task 7.
5. **Aba escondida e retomada:** o passo de tempo é limitado a 0,1 s para a animação não pular. Teste unitário na Task 7.

---

## Mapa de arquivos

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, .gitignore, index.html
src/
  main.ts                       inicialização, parâmetros de URL, laço
  core/clock.ts                 relógio com dt limitado
  core/url.ts                   leitura dos parâmetros de URL
  seed/hash.ts                  cyrb128
  seed/prng.ts                  sfc32 e utilitários (range, int, weighted, shuffle)
  seed/constants.ts             NAME_SEED
  color/oklch.ts                OKLCH -> sRGB linear
  lsystem/vec3.ts               álgebra de vetores em tuplas
  lsystem/grammar.ts            L-system paramétrico estocástico genérico
  lsystem/flower.ts             gramática da flor a partir dos parâmetros
  lsystem/turtle.ts             interpretação 3D, tropismo, idades
  lsystem/transport.ts          transporte paralelo de frames
  flower/params.ts              seed -> FlowerParams
  scene/flower/meshdata.ts      tipo MeshData, merge, growVertex (espelho do shader)
  scene/flower/tube.ts          tubos do caule
  scene/flower/patch.ts         patch de Bézier bicúbico (pétala e folha)
  scene/flower/head.ts          pétalas por filotaxia e estames
  scene/flower/build.ts         monta a flor inteira
  scene/flower/toGeometry.ts    MeshData -> THREE.BufferGeometry
  scene/flower/growthNode.ts    nó TSL de crescimento
  scene/flower/materials.ts     materiais de caule, folha, pétala, estame, semente
  scene/stage.ts                renderizador, câmera, luzes, bloom, resize
  dev/gui.ts                    lil-gui (só com ?dev)
scripts/seed.mjs                gera NAME_SEED a partir de um nome passado na linha de comando
tests/unit/*.test.ts            Vitest
tests/e2e/*.spec.ts             Playwright
```

---

### Task 1: Projeto base

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`, `index.html`, `src/main.ts`
- Test: `tests/unit/smoke.test.ts`

**Interfaces:**
- Consumes: nada
- Produces: scripts `npm test`, `npm run typecheck`, `npm run dev`, `npm run build`, `npm run test:e2e`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "quarrymill",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port 5179 --strictPort",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 5179 --strictPort",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "three": "0.186.1"
  },
  "devDependencies": {
    "@playwright/test": "1.63.0",
    "@types/pngjs": "6.0.5",
    "@types/three": "0.186.0",
    "lil-gui": "0.21.0",
    "pngjs": "7.0.0",
    "typescript": "7.0.2",
    "vite": "8.3.1",
    "vitest": "5.0.3"
  }
}
```

- [ ] **Step 2: Criar `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `.gitignore`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests", "vite.config.ts", "vitest.config.ts", "playwright.config.ts"]
}
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2022' },
});
```

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
```

```
node_modules
dist
test-results
playwright-report
gallery
```

- [ ] **Step 3: Criar `index.html` e `src/main.ts` mínimo**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Quarrymill</title>
    <style>
      html, body { margin: 0; height: 100%; background: #07060d; overflow: hidden; }
      canvas { display: block; width: 100vw; height: 100vh; }
    </style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

```ts
// src/main.ts
export {};
```

- [ ] **Step 4: Escrever o teste de fumaça**

```ts
// tests/unit/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Instalar e rodar**

Run: `npm install && npm test && npm run typecheck && npx playwright install chromium`
Expected: 1 teste passa; typecheck sem erros. Se `tsc` do TypeScript 7 falhar por incompatibilidade, trocar para `5.9.3` (ver Global Constraints).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -F - <<'EOF'
chore: scaffold Vite, TypeScript, Vitest and Playwright

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Seed e gerador pseudoaleatório

**Files:**
- Create: `src/seed/hash.ts`, `src/seed/prng.ts`, `src/seed/constants.ts`, `scripts/seed.mjs`
- Test: `tests/unit/seed.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `type Seed128 = readonly [number, number, number, number]`
  - `cyrb128(str: string): Seed128` (normaliza com NFC e `trim()` antes)
  - `type Rng = () => number` (valores em [0, 1))
  - `sfc32(seed: Seed128): Rng`
  - `range(rng: Rng, min: number, max: number): number`
  - `int(rng: Rng, min: number, max: number): number` (inclusivo)
  - `weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T`
  - `sampleDistinct(rng: Rng, pool: readonly number[], count: number): number[]`
  - `NAME_SEED: Seed128`

- [ ] **Step 1: Escrever os testes**

Os valores dourados foram calculados com a implementação de referência de cyrb128 e sfc32.

```ts
// tests/unit/seed.test.ts
import { describe, it, expect } from 'vitest';
import { cyrb128 } from '../../src/seed/hash';
import { sfc32, range, int, weighted, sampleDistinct } from '../../src/seed/prng';
import { NAME_SEED } from '../../src/seed/constants';

describe('cyrb128', () => {
  it('matches reference values', () => {
    expect(cyrb128('Bibi Bilota')).toEqual([72183447, 1154968852, 1883980313, 902418664]);
    expect(cyrb128('abc')).toEqual([1181011423, 830437656, 3964173471, 1611500297]);
  });
  it('normalizes NFC and trims', () => {
    expect(cyrb128('  abc ')).toEqual(cyrb128('abc'));
    expect(cyrb128('José')).toEqual(cyrb128('José'));
  });
});

describe('sfc32', () => {
  it('matches reference sequence', () => {
    const r = sfc32(cyrb128('Bibi Bilota'));
    expect(r()).toBeCloseTo(0.495829378022, 10);
    expect(r()).toBeCloseTo(0.427309657447, 10);
    expect(r()).toBeCloseTo(0.983035505982, 10);
  });
  it('is deterministic and in [0,1)', () => {
    const a = sfc32(NAME_SEED);
    const b = sfc32(NAME_SEED);
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it('NAME_SEED starts the expected sequence', () => {
    const r = sfc32(NAME_SEED);
    expect(r()).toBeCloseTo(0.440792766865, 10);
  });
});

describe('helpers', () => {
  it('int is inclusive and bounded', () => {
    const r = sfc32(cyrb128('abc'));
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = int(r, 2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5]);
  });
  it('range is bounded', () => {
    const r = sfc32(cyrb128('abc'));
    for (let i = 0; i < 1000; i++) {
      const v = range(r, -1, 3);
      expect(v).toBeGreaterThanOrEqual(-1);
      expect(v).toBeLessThan(3);
    }
  });
  it('weighted respects zero weights', () => {
    const r = sfc32(cyrb128('abc'));
    for (let i = 0; i < 500; i++) {
      expect(weighted(r, [['a', 1], ['b', 0]])).toBe('a');
    }
  });
  it('sampleDistinct returns distinct members, capped by pool size', () => {
    const r = sfc32(cyrb128('abc'));
    const s = sampleDistinct(r, [1, 2, 3, 4, 5], 3);
    expect(new Set(s).size).toBe(3);
    s.forEach((v) => expect([1, 2, 3, 4, 5]).toContain(v));
    expect(sampleDistinct(r, [1, 2], 5).sort()).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/seed.test.ts`
Expected: FAIL, módulos não existem.

- [ ] **Step 3: Implementar**

```ts
// src/seed/hash.ts
export type Seed128 = readonly [number, number, number, number];

export function cyrb128(input: string): Seed128 {
  const str = input.normalize('NFC').trim();
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
```

```ts
// src/seed/prng.ts
import type { Seed128 } from './hash';

export type Rng = () => number;

export function sfc32(seed: Seed128): Rng {
  let [a, b, c, d] = seed;
  return () => {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function range(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

export function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function weighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = rng() * total;
  for (const [item, w] of items) {
    if (w <= 0) continue;
    if (x < w) return item;
    x -= w;
  }
  const last = [...items].reverse().find(([, w]) => w > 0);
  if (!last) throw new Error('weighted: all weights are zero');
  return last[0];
}

export function sampleDistinct(rng: Rng, pool: readonly number[], count: number): number[] {
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, Math.min(count, copy.length));
}
```

```ts
// src/seed/constants.ts
import type { Seed128 } from './hash';

// cyrb128 do nome completo dela. Gerado com scripts/seed.mjs; o nome não fica no repositório.
export const NAME_SEED: Seed128 = [2348695553, 242873266, 1731696672, 3596588995];
```

```js
// scripts/seed.mjs
// Uso: node scripts/seed.mjs "Nome"  (imprime a Seed128; não grave o nome em arquivo)
const input = (process.argv[2] ?? '').normalize('NFC').trim();
if (!input) {
  console.error('uso: node scripts/seed.mjs "Nome"');
  process.exit(1);
}
let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
for (let i = 0; i < input.length; i++) {
  const k = input.charCodeAt(i);
  h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
  h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
  h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
  h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
}
h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
console.log(JSON.stringify([h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0]));
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/seed.test.ts && npm run typecheck`
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat: add cyrb128 seed and sfc32 PRNG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Cor OKLCH e parâmetros da flor

**Files:**
- Create: `src/color/oklch.ts`, `src/flower/params.ts`
- Test: `tests/unit/color.test.ts`, `tests/unit/params.test.ts`

**Interfaces:**
- Consumes: `Rng`, `range`, `int`, `weighted` (Task 2)
- Produces:
  - `oklchToLinearSrgb(L: number, C: number, hueDeg: number): [number, number, number]` (sem clamp)
  - `clampRgb(rgb: [number, number, number]): [number, number, number]`
  - `interface FlowerParams { petalCount: number; petalLayers: 1 | 2 | 3; petalLength: number; petalWidth: number; petalCurl: number; petalRuffle: number; petalTwist: number; petalReflex: number; sideBuds: 0 | 1 | 2; leafCount: number; hue: number; stemHeight: number; stemBend: number }`
  - `PARAM_RANGES` (constante com min e max de cada campo numérico)
  - `flowerParams(rng: Rng): FlowerParams`
  - `interface FlowerPalette { petalBase: RGB; petalTip: RGB; core: RGB; vein: RGB; leaf: RGB; stem: RGB }` com `type RGB = [number, number, number]` em sRGB linear
  - `flowerPalette(p: FlowerParams): FlowerPalette`

- [ ] **Step 1: Escrever os testes**

```ts
// tests/unit/color.test.ts
import { describe, it, expect } from 'vitest';
import { oklchToLinearSrgb, clampRgb } from '../../src/color/oklch';

describe('oklchToLinearSrgb', () => {
  it('maps the OKLCH coordinates of sRGB red to (1,0,0)', () => {
    const [r, g, b] = oklchToLinearSrgb(0.627955, 0.257683, 29.2339);
    expect(r).toBeCloseTo(1, 3);
    expect(g).toBeCloseTo(0, 3);
    expect(b).toBeCloseTo(0, 3);
  });
  it('maps L=1, C=0 to white', () => {
    oklchToLinearSrgb(1, 0, 0).forEach((c) => expect(c).toBeCloseTo(1, 4));
  });
  it('clamps into [0,1]', () => {
    expect(clampRgb([1.2, -0.1, 0.5])).toEqual([1, 0, 0.5]);
  });
});
```

```ts
// tests/unit/params.test.ts
import { describe, it, expect } from 'vitest';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';
import { NAME_SEED } from '../../src/seed/constants';
import { flowerParams, flowerPalette, PARAM_RANGES } from '../../src/flower/params';

const seeds = Array.from({ length: 300 }, (_, i) => cyrb128(`seed-${i}`));

describe('flowerParams', () => {
  it('is deterministic for NAME_SEED', () => {
    expect(flowerParams(sfc32(NAME_SEED))).toEqual(flowerParams(sfc32(NAME_SEED)));
  });
  it('stays inside every range for many seeds', () => {
    for (const s of seeds) {
      const p = flowerParams(sfc32(s));
      for (const [key, [min, max]] of Object.entries(PARAM_RANGES)) {
        const v = p[key as keyof typeof p] as number;
        expect(v, key).toBeGreaterThanOrEqual(min);
        expect(v, key).toBeLessThanOrEqual(max);
      }
      expect([1, 2, 3]).toContain(p.petalLayers);
      expect([0, 1, 2]).toContain(p.sideBuds);
      expect(Number.isInteger(p.petalCount)).toBe(true);
      expect(Number.isInteger(p.leafCount)).toBe(true);
    }
  });
  it('prefers Fibonacci petal counts', () => {
    const counts = seeds.map((s) => flowerParams(sfc32(s)).petalCount);
    const fib = counts.filter((c) => c === 5 || c === 8 || c === 13).length;
    expect(fib / counts.length).toBeGreaterThan(0.5);
  });
});

describe('flowerPalette', () => {
  it('produces pinks: red channel dominates green for petals', () => {
    for (const s of seeds.slice(0, 50)) {
      const pal = flowerPalette(flowerParams(sfc32(s)));
      for (const c of [pal.petalBase, pal.petalTip, pal.core]) {
        expect(c[0]).toBeGreaterThan(c[1]);
        c.forEach((x) => {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(1);
        });
      }
    }
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/color.test.ts tests/unit/params.test.ts`
Expected: FAIL, módulos não existem.

- [ ] **Step 3: Implementar**

```ts
// src/color/oklch.ts
export type RGB = [number, number, number];

export function oklchToLinearSrgb(L: number, C: number, hueDeg: number): RGB {
  const h = (hueDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function clampRgb(rgb: RGB): RGB {
  return rgb.map((c) => Math.min(1, Math.max(0, c))) as RGB;
}
```

```ts
// src/flower/params.ts
import { type Rng, range, int, weighted } from '../seed/prng';
import { type RGB, oklchToLinearSrgb, clampRgb } from '../color/oklch';

export interface FlowerParams {
  petalCount: number;
  petalLayers: 1 | 2 | 3;
  petalLength: number;
  petalWidth: number;
  petalCurl: number;
  petalRuffle: number;
  petalTwist: number;
  petalReflex: number;
  sideBuds: 0 | 1 | 2;
  leafCount: number;
  hue: number;
  stemHeight: number;
  stemBend: number;
}

// Unidades de cena: a flor inteira tem cerca de 1,2 de altura.
export const PARAM_RANGES = {
  petalCount: [5, 13],
  petalLayers: [1, 3],
  petalLength: [0.22, 0.36],
  petalWidth: [0.1, 0.18],
  petalCurl: [0, 1],
  petalRuffle: [0, 1],
  petalTwist: [-0.4, 0.4],
  petalReflex: [0, 0.6],
  sideBuds: [0, 2],
  leafCount: [2, 5],
  hue: [330, 355],
  stemHeight: [0.9, 1.3],
  stemBend: [0, 0.35],
} as const satisfies Record<keyof FlowerParams, readonly [number, number]>;

export function flowerParams(rng: Rng): FlowerParams {
  const R = PARAM_RANGES;
  const petalCount = weighted(rng, [
    [5, 3], [8, 3], [13, 2], [6, 1], [7, 1], [9, 1], [10, 1], [11, 1], [12, 1],
  ] as const);
  return {
    petalCount,
    petalLayers: weighted(rng, [[1, 1], [2, 2], [3, 1]] as const),
    petalLength: range(rng, R.petalLength[0], R.petalLength[1]),
    petalWidth: range(rng, R.petalWidth[0], R.petalWidth[1]),
    petalCurl: range(rng, R.petalCurl[0], R.petalCurl[1]),
    petalRuffle: range(rng, R.petalRuffle[0], R.petalRuffle[1]),
    petalTwist: range(rng, R.petalTwist[0], R.petalTwist[1]),
    petalReflex: range(rng, R.petalReflex[0], R.petalReflex[1]),
    sideBuds: weighted(rng, [[0, 1], [1, 2], [2, 1]] as const),
    leafCount: int(rng, R.leafCount[0], R.leafCount[1]),
    hue: range(rng, R.hue[0], R.hue[1]),
    stemHeight: range(rng, R.stemHeight[0], R.stemHeight[1]),
    stemBend: range(rng, R.stemBend[0], R.stemBend[1]),
  };
}

export interface FlowerPalette {
  petalBase: RGB;
  petalTip: RGB;
  core: RGB;
  vein: RGB;
  leaf: RGB;
  stem: RGB;
}

export function flowerPalette(p: FlowerParams): FlowerPalette {
  const c = (L: number, C: number, h: number) => clampRgb(oklchToLinearSrgb(L, C, h));
  return {
    petalBase: c(0.62, 0.2, p.hue - 5),
    petalTip: c(0.86, 0.08, p.hue),
    core: c(0.6, 0.22, p.hue - 10),
    vein: c(0.72, 0.19, p.hue - 8),
    leaf: c(0.38, 0.07, 175),
    stem: c(0.34, 0.06, 165),
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/color.test.ts tests/unit/params.test.ts && npm run typecheck`
Expected: todos passam. Se algum tom de `flowerPalette` sair do gamut e o teste de rosa falhar, reduzir o croma daquele tom em passos de 0,02 até passar; não mexer na faixa de matiz.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat: derive flower params and OKLCH pink palette from the seed

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: L-system paramétrico e estocástico

**Files:**
- Create: `src/lsystem/grammar.ts`
- Test: `tests/unit/grammar.test.ts`

**Interfaces:**
- Consumes: `Rng` (Task 2)
- Produces:
  - `interface Module { sym: string; args: number[] }`
  - `mod(sym: string, ...args: number[]): Module`
  - `type Rule = (m: Module, rng: Rng) => Module[] | null` (`null` mantém o módulo)
  - `type Rules = Readonly<Record<string, Rule>>`
  - `expand(axiom: readonly Module[], rules: Rules, iterations: number, rng: Rng): Module[]`
  - `toText(modules: readonly Module[]): string` (ex.: `F(0.1,0.02)[+(30)L(1)]`, números com até 4 casas)

- [ ] **Step 1: Escrever os testes**

```ts
// tests/unit/grammar.test.ts
import { describe, it, expect } from 'vitest';
import { expand, mod, toText, type Rules } from '../../src/lsystem/grammar';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';

const rng = () => sfc32(cyrb128('grammar'));

describe('expand', () => {
  it('reproduces Lindenmayer algae', () => {
    const rules: Rules = {
      A: () => [mod('A'), mod('B')],
      B: () => [mod('A')],
    };
    const out = expand([mod('A')], rules, 5, rng());
    expect(out.map((m) => m.sym).join('')).toBe('ABAABABAABAAB');
  });

  it('supports parametric rules and terminates', () => {
    const rules: Rules = {
      A: (m) => (m.args[0]! > 0 ? [mod('F', m.args[0]!), mod('A', m.args[0]! - 1)] : [mod('X')]),
    };
    const out = expand([mod('A', 3)], rules, 10, rng());
    expect(toText(out)).toBe('F(3)F(2)F(1)X');
  });

  it('keeps modules whose rule returns null', () => {
    const rules: Rules = { A: () => null };
    expect(toText(expand([mod('A', 1)], rules, 3, rng()))).toBe('A(1)');
  });

  it('stochastic rules are deterministic for the same seed and vary across seeds', () => {
    const rules: Rules = {
      A: (_m, r) => (r() < 0.5 ? [mod('A'), mod('L')] : [mod('A'), mod('R')]),
    };
    const a = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s1'))));
    const b = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s1'))));
    const c = toText(expand([mod('A')], rules, 20, sfc32(cyrb128('s2'))));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });

  it('formats numbers with up to 4 decimals', () => {
    expect(toText([mod('F', 0.123456, 2)])).toBe('F(0.1235,2)');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/grammar.test.ts`
Expected: FAIL, módulo não existe.

- [ ] **Step 3: Implementar**

```ts
// src/lsystem/grammar.ts
import type { Rng } from '../seed/prng';

export interface Module {
  sym: string;
  args: number[];
}

export function mod(sym: string, ...args: number[]): Module {
  return { sym, args };
}

export type Rule = (m: Module, rng: Rng) => Module[] | null;
export type Rules = Readonly<Record<string, Rule>>;

export function expand(axiom: readonly Module[], rules: Rules, iterations: number, rng: Rng): Module[] {
  let current: Module[] = [...axiom];
  for (let i = 0; i < iterations; i++) {
    const next: Module[] = [];
    let changed = false;
    for (const m of current) {
      const rule = rules[m.sym];
      const out = rule ? rule(m, rng) : null;
      if (out) {
        next.push(...out);
        changed = true;
      } else {
        next.push(m);
      }
    }
    current = next;
    if (!changed) break;
  }
  return current;
}

export function toText(modules: readonly Module[]): string {
  return modules
    .map((m) => (m.args.length ? `${m.sym}(${m.args.map((a) => +a.toFixed(4)).join(',')})` : m.sym))
    .join('');
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/unit/grammar.test.ts && npm run typecheck`
Expected: todos passam.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat: add parametric stochastic L-system expander

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Gramática da flor, tartaruga 3D e transporte paralelo

**Files:**
- Create: `src/lsystem/vec3.ts`, `src/lsystem/transport.ts`, `src/lsystem/turtle.ts`, `src/lsystem/flower.ts`
- Test: `tests/unit/turtle.test.ts`, `tests/unit/flower-grammar.test.ts`

**Interfaces:**
- Consumes: `Module`, `mod`, `expand`, `Rules` (Task 4); `Rng`, `sampleDistinct`, `range` (Task 2); `FlowerParams` (Task 3)
- Produces:
  - `type Vec3 = [number, number, number]` e funções `add, sub, scale, dot, cross, length, normalize, rotate(v, axis, angle)` (Rodrigues; `normalize` de vetor nulo devolve `[0, 1, 0]`)
  - `parallelTransport(tangents: readonly Vec3[], firstNormal: Vec3): Vec3[]`
  - `interface SkeletonNode { position: Vec3; tangent: Vec3; radius: number; arc: number; age: number }`
  - `interface Branch { nodes: SkeletonNode[] }`
  - `interface Attachment { kind: 'leaf' | 'head'; position: Vec3; heading: Vec3; left: Vec3; up: Vec3; scale: number; age: number }`
  - `interface Skeleton { branches: Branch[]; attachments: Attachment[] }`
  - `interpret(modules: readonly Module[], opts?: { tropism?: Vec3; tropismStrength?: number; substeps?: number }): Skeleton`
  - `STEM_SEGMENTS = 12`
  - `flowerModules(p: FlowerParams, rng: Rng): Module[]`
  - Símbolos da tartaruga: `F(len, radius)`, `+(deg)` gira em torno de up, `&(deg)` em torno de left, `/(deg)` em torno de heading, `[` e `]`, `L(scale)` folha, `H(scale)` cabeça de flor. Ângulos em graus.
  - Idades: `age = 0.03 + 0.42 * arc / mainArc`, limitado a 0,6, onde `mainArc` é o comprimento do ramo 0. Anexos recebem a idade do ponto onde estão.

- [ ] **Step 1: Escrever os testes**

```ts
// tests/unit/turtle.test.ts
import { describe, it, expect } from 'vitest';
import { interpret } from '../../src/lsystem/turtle';
import { parallelTransport } from '../../src/lsystem/transport';
import { mod } from '../../src/lsystem/grammar';
import { dot, length, type Vec3 } from '../../src/lsystem/vec3';

describe('parallelTransport', () => {
  it('keeps the normal constant along a straight line', () => {
    const t: Vec3[] = [[0, 1, 0], [0, 1, 0], [0, 1, 0]];
    const n = parallelTransport(t, [1, 0, 0]);
    n.forEach((v) => {
      expect(v[0]).toBeCloseTo(1, 6);
      expect(v[1]).toBeCloseTo(0, 6);
      expect(v[2]).toBeCloseTo(0, 6);
    });
  });
  it('produces unit normals orthogonal to tangents along a curve', () => {
    const t: Vec3[] = Array.from({ length: 40 }, (_, i) => {
      const a = i * 0.08;
      return [Math.sin(a), Math.cos(a), 0.3 * Math.sin(2 * a)];
    }).map((v) => {
      const l = Math.hypot(...v);
      return [v[0] / l, v[1] / l, v[2] / l] as Vec3;
    });
    const n = parallelTransport(t, [0, 0, 1]);
    n.forEach((v, i) => {
      expect(length(v)).toBeCloseTo(1, 6);
      expect(Math.abs(dot(v, t[i]!))).toBeLessThan(1e-6);
    });
    for (let i = 1; i < n.length; i++) expect(dot(n[i]!, n[i - 1]!)).toBeGreaterThan(0.95);
  });
});

describe('interpret', () => {
  it('walks forward along +Y and records arc length', () => {
    const s = interpret([mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0, substeps: 1 });
    const nodes = s.branches[0]!.nodes;
    expect(nodes.length).toBe(3);
    expect(nodes[2]!.position[1]).toBeCloseTo(2, 6);
    expect(nodes[2]!.arc).toBeCloseTo(2, 6);
  });
  it('pitch turns the heading and brackets restore state', () => {
    const s = interpret(
      [mod('F', 1, 0.1), mod('['), mod('&', 90), mod('F', 1, 0.05), mod('L', 1), mod(']'), mod('F', 1, 0.1), mod('H', 1)],
      { tropismStrength: 0, substeps: 1 },
    );
    expect(s.branches.length).toBe(2);
    const head = s.attachments.find((a) => a.kind === 'head')!;
    expect(head.position[1]).toBeCloseTo(2, 6);
    const leaf = s.attachments.find((a) => a.kind === 'leaf')!;
    expect(leaf.position[1]).toBeCloseTo(1, 6);
    expect(Math.hypot(leaf.position[0], leaf.position[2])).toBeCloseTo(1, 6);
  });
  it('tropism bends a tilted stem back towards up', () => {
    const straight = interpret([mod('&', 40), mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0 });
    const bent = interpret([mod('&', 40), mod('F', 1, 0.1), mod('F', 1, 0.1)], { tropismStrength: 0.3 });
    const tipY = (s: typeof straight) => s.branches[0]!.nodes.at(-1)!.position[1];
    expect(tipY(bent)).toBeGreaterThan(tipY(straight));
  });
  it('ages grow monotonically along the main stem within [0.03, 0.6]', () => {
    const s = interpret(Array.from({ length: 5 }, () => mod('F', 0.2, 0.02)));
    const ages = s.branches[0]!.nodes.map((n) => n.age);
    for (let i = 1; i < ages.length; i++) expect(ages[i]!).toBeGreaterThanOrEqual(ages[i - 1]!);
    expect(ages[0]).toBeCloseTo(0.03, 6);
    expect(ages.at(-1)).toBeCloseTo(0.45, 6);
  });
});
```

```ts
// tests/unit/flower-grammar.test.ts
import { describe, it, expect } from 'vitest';
import { flowerModules, STEM_SEGMENTS } from '../../src/lsystem/flower';
import { interpret } from '../../src/lsystem/turtle';
import { toText } from '../../src/lsystem/grammar';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';
import { cyrb128 } from '../../src/seed/hash';
import { NAME_SEED } from '../../src/seed/constants';

function build(seed: readonly [number, number, number, number]) {
  const rng = sfc32(seed);
  const p = flowerParams(rng);
  return { p, modules: flowerModules(p, rng) };
}

describe('flowerModules', () => {
  it('is deterministic for NAME_SEED', () => {
    expect(toText(build(NAME_SEED).modules)).toBe(toText(build(NAME_SEED).modules));
  });
  it('has the right number of stem segments, leaves and heads', () => {
    for (let i = 0; i < 100; i++) {
      const { p, modules } = build(cyrb128(`fg-${i}`));
      const syms = modules.map((m) => m.sym);
      expect(syms.filter((s) => s === 'L').length).toBe(p.leafCount);
      expect(syms.filter((s) => s === 'H').length).toBe(1 + p.sideBuds);
      expect(syms.filter((s) => s === '[').length).toBe(syms.filter((s) => s === ']').length);
      const skel = interpret(modules);
      expect(skel.branches[0]!.nodes.length).toBeGreaterThan(STEM_SEGMENTS);
    }
  });
  it('the main head sits near stemHeight', () => {
    const { p, modules } = build(NAME_SEED);
    const head = interpret(modules).attachments.find((a) => a.kind === 'head' && a.scale === 1)!;
    expect(head.position[1]).toBeGreaterThan(p.stemHeight * 0.75);
    expect(head.position[1]).toBeLessThan(p.stemHeight * 1.05);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/turtle.test.ts tests/unit/flower-grammar.test.ts`
Expected: FAIL, módulos não existem.

- [ ] **Step 3: Implementar `vec3.ts` e `transport.ts`**

```ts
// src/lsystem/vec3.ts
export type Vec3 = [number, number, number];

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export function normalize(a: Vec3): Vec3 {
  const l = length(a);
  return l < 1e-12 ? [0, 1, 0] : [a[0] / l, a[1] / l, a[2] / l];
}
/** Rotação de Rodrigues; `axis` precisa ser unitário. */
export function rotate(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const k = axis;
  return add(add(scale(v, c), scale(cross(k, v), s)), scale(k, dot(k, v) * (1 - c)));
}
```

```ts
// src/lsystem/transport.ts
import { type Vec3, cross, dot, length, normalize, rotate, scale, sub } from './vec3';

/** Frames que minimizam rotação: a normal anda junto com a tangente sem girar em torno dela. */
export function parallelTransport(tangents: readonly Vec3[], firstNormal: Vec3): Vec3[] {
  if (tangents.length === 0) return [];
  const orth = (n: Vec3, t: Vec3) => normalize(sub(n, scale(t, dot(n, t))));
  const out: Vec3[] = [orth(firstNormal, tangents[0]!)];
  for (let i = 1; i < tangents.length; i++) {
    const a = tangents[i - 1]!, b = tangents[i]!;
    const axis = cross(a, b);
    let n = out[i - 1]!;
    if (length(axis) > 1e-9) {
      const angle = Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
      n = rotate(n, normalize(axis), angle);
    }
    out.push(orth(n, b));
  }
  return out;
}
```

- [ ] **Step 4: Implementar `turtle.ts`**

```ts
// src/lsystem/turtle.ts
import type { Module } from './grammar';
import { type Vec3, add, cross, length, normalize, rotate, scale } from './vec3';

export interface SkeletonNode { position: Vec3; tangent: Vec3; radius: number; arc: number; age: number }
export interface Branch { nodes: SkeletonNode[] }
export interface Attachment {
  kind: 'leaf' | 'head';
  position: Vec3;
  heading: Vec3;
  left: Vec3;
  up: Vec3;
  scale: number;
  age: number;
}
export interface Skeleton { branches: Branch[]; attachments: Attachment[] }

interface State { pos: Vec3; H: Vec3; L: Vec3; U: Vec3; arc: number; radius: number; branch: number }

const DEG = Math.PI / 180;
const AGE_START = 0.03;
const AGE_SPAN = 0.42;
const AGE_MAX = 0.6;

export function interpret(
  modules: readonly Module[],
  opts: { tropism?: Vec3; tropismStrength?: number; substeps?: number } = {},
): Skeleton {
  const T = normalize(opts.tropism ?? [0, 1, 0]);
  const e = opts.tropismStrength ?? 0.12;
  const substeps = opts.substeps ?? 4;

  // Heading +Y, left -X, up +Z.
  let s: State = { pos: [0, 0, 0], H: [0, 1, 0], L: [-1, 0, 0], U: [0, 0, 1], arc: 0, radius: 0.02, branch: 0 };
  const stack: State[] = [];
  const branches: Branch[] = [{ nodes: [{ position: [0, 0, 0], tangent: [0, 1, 0], radius: s.radius, arc: 0, age: 0 }] }];
  const attachments: Attachment[] = [];

  const turn = (axis: Vec3, deg: number) => {
    const a = deg * DEG;
    s = { ...s, H: normalize(rotate(s.H, axis, a)), L: normalize(rotate(s.L, axis, a)), U: normalize(rotate(s.U, axis, a)) };
  };

  for (const m of modules) {
    switch (m.sym) {
      case 'F': {
        const len = m.args[0] ?? 0.1;
        const r = m.args[1] ?? s.radius;
        for (let i = 0; i < substeps; i++) {
          const bend = cross(s.H, T);
          const mag = length(bend);
          if (e > 0 && mag > 1e-9) turn(normalize(bend), (e * mag) / DEG / substeps);
          const r0 = s.radius;
          s = { ...s, pos: add(s.pos, scale(s.H, len / substeps)), arc: s.arc + len / substeps };
          const radius = r0 + (r - r0) * ((i + 1) / substeps);
          s.radius = radius;
          branches[s.branch]!.nodes.push({ position: s.pos, tangent: s.H, radius, arc: s.arc, age: 0 });
        }
        break;
      }
      case '+': turn(s.U, m.args[0] ?? 0); break;
      case '&': turn(s.L, m.args[0] ?? 0); break;
      case '/': turn(s.H, m.args[0] ?? 0); break;
      case '[': {
        stack.push(s);
        branches.push({ nodes: [{ position: s.pos, tangent: s.H, radius: s.radius, arc: s.arc, age: 0 }] });
        s = { ...s, branch: branches.length - 1 };
        break;
      }
      case ']': {
        const prev = stack.pop();
        if (!prev) throw new Error('turtle: unbalanced ]');
        s = prev;
        break;
      }
      case 'L':
      case 'H':
        attachments.push({
          kind: m.sym === 'L' ? 'leaf' : 'head',
          position: s.pos, heading: s.H, left: s.L, up: s.U,
          scale: m.args[0] ?? 1, age: s.arc,
        });
        break;
      default:
        break;
    }
  }

  const mainArc = Math.max(1e-6, branches[0]!.nodes.at(-1)!.arc);
  const ageOf = (arc: number) => Math.min(AGE_MAX, AGE_START + (AGE_SPAN * arc) / mainArc);
  for (const b of branches) for (const n of b.nodes) n.age = ageOf(n.arc);
  for (const a of attachments) a.age = ageOf(a.age);
  return { branches: branches.filter((b) => b.nodes.length > 1), attachments };
}
```

Observação: o anexo guarda o comprimento de arco em `age` até o pós-processamento converter. Ramos só com o nó inicial (por exemplo, `[` seguido de `L` sem `F`) são descartados no fim. O teste "ages grow monotonically" espera `0.45` no topo porque `0.03 + 0.42 = 0.45`.

- [ ] **Step 5: Implementar `flower.ts`**

```ts
// src/lsystem/flower.ts
import type { FlowerParams } from '../flower/params';
import { type Rng, range, sampleDistinct } from '../seed/prng';
import { type Module, type Rules, expand, mod } from './grammar';

export const STEM_SEGMENTS = 12;
const GOLDEN_DEG = 137.507764;

export function flowerModules(p: FlowerParams, rng: Rng): Module[] {
  const segLen = p.stemHeight / STEM_SEGMENTS;
  const radiusAt = (i: number) => 0.018 * (1 - (0.55 * i) / STEM_SEGMENTS);
  const leafAt = new Set(sampleDistinct(rng, [1, 2, 3, 4, 5, 6, 7], p.leafCount));
  const budPool = [4, 5, 6, 7, 8, 9].filter((i) => !leafAt.has(i));
  const budAt = new Set(sampleDistinct(rng, budPool, p.sideBuds));
  const leanDeg = (p.stemBend * 30) / STEM_SEGMENTS;

  const rules: Rules = {
    A: (m, r) => {
      const i = m.args[0]!;
      if (i >= STEM_SEGMENTS) return [mod('H', 1)];
      const out: Module[] = [mod('F', segLen, radiusAt(i + 1))];
      if (leafAt.has(i)) {
        out.push(mod('['), mod('/', i * GOLDEN_DEG), mod('&', 55), mod('L', range(r, 0.8, 1.15)), mod(']'));
      }
      if (budAt.has(i)) {
        out.push(mod('['), mod('/', i * GOLDEN_DEG + 70), mod('&', 32), mod('S', 3, radiusAt(i) * 0.6), mod(']'));
      }
      out.push(mod('/', range(r, -12, 12)), mod('&', leanDeg + range(r, -2, 2)), mod('A', i + 1));
      return out;
    },
    S: (m) => {
      const k = m.args[0]!;
      const r = m.args[1]!;
      if (k <= 0) return [mod('H', 0.42)];
      return [mod('F', segLen * 0.7, r * 0.85), mod('&', -6), mod('S', k - 1, r * 0.85)];
    },
  };
  return expand([mod('A', 0)], rules, STEM_SEGMENTS + 6, rng);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run tests/unit/turtle.test.ts tests/unit/flower-grammar.test.ts && npm run typecheck`
Expected: todos passam. Se "the main head sits near stemHeight" falhar porque o tropismo e a inclinação baixam demais a cabeça, reduzir `leanDeg` (fator 30) e não afrouxar o teste.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat: interpret the flower L-system with a 3D turtle and growth ages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 6: Malhas da flor com atributos de crescimento

**Files:**
- Create: `src/scene/flower/meshdata.ts`, `src/scene/flower/tube.ts`, `src/scene/flower/patch.ts`, `src/scene/flower/head.ts`, `src/scene/flower/build.ts`
- Test: `tests/unit/meshdata.test.ts`, `tests/unit/build.test.ts`

**Interfaces:**
- Consumes: `Skeleton`, `Branch`, `Attachment`, `interpret` (Task 5); `flowerModules` (Task 5); `parallelTransport`, `Vec3` e utilitários (Task 5); `FlowerParams`, `flowerParams` (Task 3); `Rng`, `sfc32`, `range` (Task 2)
- Produces:
  - `interface MeshData { position: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint32Array; aAge: Float32Array; aPivot: Float32Array; aAxis: Float32Array; aClosed: Float32Array; aGrow: Float32Array }` (itemSize: position, normal, aPivot, aAxis = 3; uv, aGrow = 2; aAge, aClosed = 1)
  - `vertexCount(m: MeshData): number`
  - `mergeMeshData(list: readonly MeshData[]): MeshData`
  - `growVertex(p: Vec3, age: number, pivot: Vec3, axis: Vec3, closed: number, grow: [number, number], g: number): Vec3` (espelho exato do shader da Task 7)
  - `buildTube(branch: Branch, radialSegments: number): MeshData`
  - `interface PatchShape { length: number; width: number; curl: number; ruffle: number; twist: number; reflex: number; profile: 'petal' | 'leaf' }`
  - `buildPatch(shape: PatchShape, uSeg: number, vSeg: number): { position: Float32Array; normal: Float32Array; uv: Float32Array; index: Uint32Array }` (espaço local: largura em X, comprimento em +Y, concavidade em +Z)
  - `placePatch(local, frame: { origin: Vec3; width: Vec3; length: Vec3; normal: Vec3 }, growth: { age: number; closed: number; swell: number; open: number }): MeshData` (pivô na base, eixo = `width`)
  - `buildHead(head: Attachment, p: FlowerParams, rng: Rng): { petals: MeshData; stamens: MeshData }`
  - `buildLeaf(leaf: Attachment, rng: Rng): MeshData`
  - `interface FlowerMeshes { stem: MeshData; leaves: MeshData; petals: MeshData; stamens: MeshData; height: number }`
  - `buildFlower(seed: Seed128): { params: FlowerParams; meshes: FlowerMeshes }`
  - Convenção de crescimento: `scale = smoothstep(age - grow.x, age, g)`, `open = smoothstep(age, age + grow.y, g)`, `p' = pivot + rotate(p - pivot, axis, closed * (1 - open)) * scale`. Para tubos: pivô = posição do nó anterior, `closed = 0`, `grow = [0.03, 0.0001]`. Para pétalas e folhas: pivô = base, eixo = direção da largura, `closed` dobra a pétala até apontar para cima, `grow = [0.12, 0.22]` para pétalas e `[0.06, 0.15]` para folhas. Para estames: pivô = centro da cabeça, `closed = 0`, `grow = [0.15, 0.0001]`.
  - Linha do tempo da cabeça principal: pétalas da camada externa abrem primeiro, a partir de `head.age + 0.08`, escalonadas em `0.22 * ordem / (total - 1)`, com início limitado a 0,76; como cada pétala leva 0,22 para abrir, a última termina até 0,98. Estames: `age = head.age + 0.3`. Botões laterais (`scale < 1`) usam a mesma regra, mas `closed` multiplicado por 0,6 (abrem pela metade).

- [ ] **Step 1: Escrever os testes**

```ts
// tests/unit/meshdata.test.ts
import { describe, it, expect } from 'vitest';
import { growVertex, mergeMeshData, vertexCount } from '../../src/scene/flower/meshdata';
import { buildTube } from '../../src/scene/flower/tube';
import { buildPatch, placePatch } from '../../src/scene/flower/patch';
import { interpret } from '../../src/lsystem/turtle';
import { mod } from '../../src/lsystem/grammar';

const allFinite = (a: Float32Array) => a.every(Number.isFinite);

describe('growVertex', () => {
  it('collapses to the pivot before birth and is identity when grown', () => {
    const p: [number, number, number] = [1, 2, 3];
    const pivot: [number, number, number] = [0, 0, 0];
    expect(growVertex(p, 0.5, pivot, [1, 0, 0], 1, [0.1, 0.2], 0)).toEqual([0, 0, 0]);
    const g1 = growVertex(p, 0.5, pivot, [1, 0, 0], 1, [0.1, 0.2], 1);
    g1.forEach((v, i) => expect(v).toBeCloseTo(p[i]!, 6));
  });
  it('rotates by the closed angle while still closed', () => {
    const out = growVertex([0, 1, 0], 0.5, [0, 0, 0], [1, 0, 0], Math.PI / 2, [0.1, 0.2], 0.5);
    expect(out[1]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(1, 6);
  });
});

describe('buildTube', () => {
  it('has (nodes x (radial+1)) vertices, finite normals, pivots at previous node', () => {
    const s = interpret([mod('F', 1, 0.02), mod('F', 1, 0.0)], { tropismStrength: 0, substeps: 2 });
    const t = buildTube(s.branches[0]!, 8);
    expect(vertexCount(t)).toBe(s.branches[0]!.nodes.length * 9);
    expect(allFinite(t.normal)).toBe(true);
    expect(allFinite(t.position)).toBe(true);
    expect(Array.from(t.aPivot.slice(9 * 3, 9 * 3 + 3))).toEqual([0, 0, 0]);
  });
});

describe('buildPatch / placePatch', () => {
  const shape = { length: 0.3, width: 0.14, curl: 0.6, ruffle: 0.5, twist: 0.2, reflex: 0.3, profile: 'petal' as const };
  it('produces a finite grid with uv in [0,1]', () => {
    const p = buildPatch(shape, 12, 16);
    expect(p.position.length / 3).toBe(13 * 17);
    expect(allFinite(p.normal)).toBe(true);
    p.uv.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
  it('closed state points the petal tip along the head up axis', () => {
    // Mesma convenção de head.ts: up = +Y, out = +X, width = cross(up, out) = -Z.
    const local = buildPatch(shape, 6, 8);
    const open = 70 * (Math.PI / 180);
    const length: [number, number, number] = [Math.sin(open), Math.cos(open), 0];
    const width: [number, number, number] = [0, 0, -1];
    const normal: [number, number, number] = [Math.cos(open), -Math.sin(open), 0];
    const m = placePatch(local, { origin: [0, 0, 0], width, length, normal }, { age: 0.5, closed: -open, swell: 0.12, open: 0.22 });
    const tipIndex = Math.floor(6 / 2) + 8 * 7;
    const tip: [number, number, number] = [m.position[tipIndex * 3]!, m.position[tipIndex * 3 + 1]!, m.position[tipIndex * 3 + 2]!];
    const pivot: [number, number, number] = [m.aPivot[0]!, m.aPivot[1]!, m.aPivot[2]!];
    const axis: [number, number, number] = [m.aAxis[0]!, m.aAxis[1]!, m.aAxis[2]!];
    const closedTip = growVertex(tip, 0.5, pivot, axis, m.aClosed[0]!, [0.12, 0.22], 0.5);
    const n = Math.hypot(...closedTip);
    expect(closedTip[1] / n).toBeGreaterThan(0.9);
  });
  it('merge concatenates and offsets indices', () => {
    const local = buildPatch(shape, 2, 2);
    const frame = { origin: [0, 0, 0] as [number, number, number], width: [1, 0, 0] as [number, number, number], length: [0, 1, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number] };
    const g = { age: 0.5, closed: 0, swell: 0.1, open: 0.1 };
    const a = placePatch(local, frame, g);
    const merged = mergeMeshData([a, a]);
    expect(vertexCount(merged)).toBe(2 * vertexCount(a));
    expect(Math.max(...merged.index)).toBe(2 * vertexCount(a) - 1);
  });
});
```

```ts
// tests/unit/build.test.ts
import { describe, it, expect } from 'vitest';
import { buildFlower } from '../../src/scene/flower/build';
import { vertexCount, growVertex } from '../../src/scene/flower/meshdata';
import { NAME_SEED } from '../../src/seed/constants';
import { cyrb128 } from '../../src/seed/hash';

describe('buildFlower', () => {
  it('is deterministic', () => {
    const a = buildFlower(NAME_SEED).meshes.petals.position;
    const b = buildFlower(NAME_SEED).meshes.petals.position;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('every attribute is finite for many seeds', () => {
    for (let i = 0; i < 40; i++) {
      const { meshes } = buildFlower(cyrb128(`b-${i}`));
      for (const m of [meshes.stem, meshes.leaves, meshes.petals, meshes.stamens]) {
        for (const arr of [m.position, m.normal, m.uv, m.aAge, m.aPivot, m.aAxis, m.aClosed, m.aGrow]) {
          expect(arr.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('nothing but the stem base exists at growth 0 (Review Focus 2)', () => {
    const { meshes } = buildFlower(NAME_SEED);
    const m = meshes.petals;
    for (let v = 0; v < vertexCount(m); v += 7) {
      const p = growVertex(
        [m.position[v * 3]!, m.position[v * 3 + 1]!, m.position[v * 3 + 2]!],
        m.aAge[v]!,
        [m.aPivot[v * 3]!, m.aPivot[v * 3 + 1]!, m.aPivot[v * 3 + 2]!],
        [m.aAxis[v * 3]!, m.aAxis[v * 3 + 1]!, m.aAxis[v * 3 + 2]!],
        m.aClosed[v]!,
        [m.aGrow[v * 2]!, m.aGrow[v * 2 + 1]!],
        0,
      );
      expect(p).toEqual([m.aPivot[v * 3], m.aPivot[v * 3 + 1], m.aPivot[v * 3 + 2]]);
    }
  });

  it('petal ages end before 1 so the flower is fully open at growth 1', () => {
    const { meshes } = buildFlower(NAME_SEED);
    let maxEnd = 0;
    for (let v = 0; v < vertexCount(meshes.petals); v++) {
      maxEnd = Math.max(maxEnd, meshes.petals.aAge[v]! + meshes.petals.aGrow[v * 2 + 1]!);
    }
    expect(maxEnd).toBeLessThanOrEqual(1);
  });

  it('extreme seeds build fast and under the vertex budget (Review Focus 3)', () => {
    let worst = 0;
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) {
      const { meshes } = buildFlower(cyrb128(`x-${i}`));
      worst = Math.max(worst, vertexCount(meshes.stem) + vertexCount(meshes.leaves) + vertexCount(meshes.petals) + vertexCount(meshes.stamens));
    }
    const per = (performance.now() - t0) / 20;
    expect(per).toBeLessThan(200);
    expect(worst).toBeLessThan(200_000);
  });
});
```

O teste "extreme seeds" percorre 20 seeds; ele também precisa cobrir o pior caso garantido. Adicionar ao mesmo arquivo um teste que força os parâmetros máximos chamando `buildHead` diretamente com `{ ...params, petalCount: 13, petalLayers: 3 }` e um anexo de cabeça sintético, verificando o mesmo orçamento:

```ts
import { buildHead } from '../../src/scene/flower/head';
import { flowerParams } from '../../src/flower/params';
import { sfc32 } from '../../src/seed/prng';

it('the maximum head (13 petals x 3 layers) stays within budget', () => {
  const p = { ...flowerParams(sfc32(NAME_SEED)), petalCount: 13, petalLayers: 3 as const };
  const head = { kind: 'head' as const, position: [0, 1, 0] as [number, number, number], heading: [0, 1, 0] as [number, number, number], left: [-1, 0, 0] as [number, number, number], up: [0, 0, 1] as [number, number, number], scale: 1, age: 0.45 };
  const t0 = performance.now();
  const { petals, stamens } = buildHead(head, p, sfc32(NAME_SEED));
  expect(performance.now() - t0).toBeLessThan(200);
  expect(vertexCount(petals) + vertexCount(stamens)).toBeLessThan(200_000);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/unit/meshdata.test.ts tests/unit/build.test.ts`
Expected: FAIL, módulos não existem.

- [ ] **Step 3: Implementar `meshdata.ts`**

```ts
// src/scene/flower/meshdata.ts
import { type Vec3, add, rotate, scale, sub, normalize } from '../../lsystem/vec3';

export interface MeshData {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  aAge: Float32Array;
  aPivot: Float32Array;
  aAxis: Float32Array;
  aClosed: Float32Array;
  aGrow: Float32Array;
}

export const vertexCount = (m: MeshData) => m.position.length / 3;

export function emptyMeshData(): MeshData {
  return {
    position: new Float32Array(0), normal: new Float32Array(0), uv: new Float32Array(0), index: new Uint32Array(0),
    aAge: new Float32Array(0), aPivot: new Float32Array(0), aAxis: new Float32Array(0), aClosed: new Float32Array(0), aGrow: new Float32Array(0),
  };
}

export function mergeMeshData(list: readonly MeshData[]): MeshData {
  if (list.length === 0) return emptyMeshData();
  const keys = ['position', 'normal', 'uv', 'aAge', 'aPivot', 'aAxis', 'aClosed', 'aGrow'] as const;
  const out = emptyMeshData();
  for (const k of keys) {
    const total = list.reduce((s, m) => s + m[k].length, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const m of list) { arr.set(m[k], o); o += m[k].length; }
    out[k] = arr;
  }
  const index = new Uint32Array(list.reduce((s, m) => s + m.index.length, 0));
  let io = 0, vo = 0;
  for (const m of list) {
    for (let i = 0; i < m.index.length; i++) index[io + i] = m.index[i]! + vo;
    io += m.index.length;
    vo += vertexCount(m);
  }
  out.index = index;
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Espelho exato do nó TSL de crescimento (Task 7). Mantenha os dois iguais. */
export function growVertex(p: Vec3, age: number, pivot: Vec3, axis: Vec3, closed: number, grow: [number, number], g: number): Vec3 {
  const s = smoothstep(age - grow[0], age, g);
  const open = smoothstep(age, age + grow[1], g);
  const angle = closed * (1 - open);
  return add(pivot, scale(rotate(sub(p, pivot), normalize(axis), angle), s));
}
```

O teste `collapses to the pivot` compara com `toEqual([0,0,0])`; se aparecer `-0`, trocar por `toBeCloseTo` em cada componente no teste, porque `-0` e `0` são o mesmo ponto.

- [ ] **Step 4: Implementar `tube.ts`**

```ts
// src/scene/flower/tube.ts
import type { Branch } from '../../lsystem/turtle';
import { parallelTransport } from '../../lsystem/transport';
import { type Vec3, cross, normalize, add, scale } from '../../lsystem/vec3';
import type { MeshData } from './meshdata';

const pickNormal = (t: Vec3): Vec3 => (Math.abs(t[1]) < 0.9 ? normalize(cross(t, [0, 1, 0])) : normalize(cross(t, [1, 0, 0])));

export function buildTube(branch: Branch, radialSegments: number): MeshData {
  const nodes = branch.nodes;
  const ring = radialSegments + 1;
  const n = nodes.length * ring;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const aAge = new Float32Array(n), aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3);
  const aClosed = new Float32Array(n), aGrow = new Float32Array(n * 2);
  const tangents = nodes.map((nd) => nd.tangent);
  const normals = parallelTransport(tangents, pickNormal(tangents[0]!));
  const totalArc = Math.max(1e-6, nodes.at(-1)!.arc - nodes[0]!.arc);

  nodes.forEach((nd, i) => {
    const N = normals[i]!;
    const B = normalize(cross(nd.tangent, N));
    const pivot = i === 0 ? nd.position : nodes[i - 1]!.position;
    for (let j = 0; j < ring; j++) {
      const a = (j / radialSegments) * Math.PI * 2;
      const dir = normalize(add(scale(N, Math.cos(a)), scale(B, Math.sin(a))));
      const p = add(nd.position, scale(dir, nd.radius));
      const v = i * ring + j;
      position.set(p, v * 3);
      normal.set(dir, v * 3);
      uv.set([j / radialSegments, (nd.arc - nodes[0]!.arc) / totalArc], v * 2);
      aAge[v] = nd.age;
      aPivot.set(pivot, v * 3);
      aAxis.set([0, 1, 0], v * 3);
      aClosed[v] = 0;
      aGrow.set([0.03, 0.0001], v * 2);
    }
  });

  const index: number[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * ring + j, b = a + ring, c = b + 1, d = a + 1;
      index.push(a, b, d, b, c, d);
    }
  }
  return { position, normal, uv, index: new Uint32Array(index), aAge, aPivot, aAxis, aClosed, aGrow };
}
```

- [ ] **Step 5: Implementar `patch.ts`**

```ts
// src/scene/flower/patch.ts
import { type Vec3, add, cross, normalize, rotate, scale, sub } from '../../lsystem/vec3';
import type { MeshData } from './meshdata';

export interface PatchShape {
  length: number;
  width: number;
  curl: number;
  ruffle: number;
  twist: number;
  reflex: number;
  profile: 'petal' | 'leaf';
}

const B3 = (t: number): [number, number, number, number] => {
  const s = 1 - t;
  return [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t];
};

/** Patch de Bézier bicúbico: i atravessa a largura, j vai da base à ponta. */
function controlPoints(sh: PatchShape): Vec3[][] {
  const along = [0, 0.33, 0.7, 1].map((f) => f * sh.length);
  const halfW = (sh.profile === 'petal' ? [0.12, 0.95, 1.0, 0.3] : [0.08, 0.8, 0.7, 0.02]).map((f) => f * sh.width);
  const across = [-1, -0.35, 0.35, 1];
  return across.map((xf) =>
    along.map((y, j) => {
      const w = halfW[j]!;
      const x = xf * w;
      const cup = sh.curl * w * 0.8 * xf * xf;
      const bend = -sh.reflex * (y * y) / Math.max(sh.length, 1e-6) * 0.6;
      const p: Vec3 = [x, y, cup + bend];
      return rotate(p, [0, 1, 0], (sh.twist * y) / Math.max(sh.length, 1e-6));
    }),
  );
}

function evalPatch(cp: Vec3[][], u: number, v: number): Vec3 {
  const bu = B3(u), bv = B3(v);
  let p: Vec3 = [0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) p = add(p, scale(cp[i]![j]!, bu[i]! * bv[j]!));
  return p;
}

function surface(sh: PatchShape, cp: Vec3[][], u: number, v: number): Vec3 {
  const p = evalPatch(cp, u, v);
  const edge = Math.abs(2 * u - 1);
  const s = Math.min(1, Math.max(0, (v - 0.3) / 0.7));
  const ruffle = sh.ruffle * 0.012 * Math.sin(u * Math.PI * 2 * 3 + v * 4) * s * s * edge;
  return [p[0], p[1], p[2] + ruffle];
}

export function buildPatch(sh: PatchShape, uSeg: number, vSeg: number) {
  const cp = controlPoints(sh);
  const cols = uSeg + 1, rows = vSeg + 1;
  const position = new Float32Array(cols * rows * 3), normal = new Float32Array(cols * rows * 3), uv = new Float32Array(cols * rows * 2);
  const h = 1e-3;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const u = i / uSeg, v = j / vSeg;
      const p = surface(sh, cp, u, v);
      const du = sub(surface(sh, cp, Math.min(1, u + h), v), surface(sh, cp, Math.max(0, u - h), v));
      const dv = sub(surface(sh, cp, u, Math.min(1, v + h)), surface(sh, cp, u, Math.max(0, v - h)));
      let n = cross(du, dv);
      n = Math.hypot(...n) < 1e-12 ? [0, 0, 1] : normalize(n);
      const k = j * cols + i;
      position.set(p, k * 3);
      normal.set(n, k * 3);
      uv.set([u, v], k * 2);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }
  return { position, normal, uv, index: new Uint32Array(index) };
}

export function placePatch(
  local: ReturnType<typeof buildPatch>,
  frame: { origin: Vec3; width: Vec3; length: Vec3; normal: Vec3 },
  growth: { age: number; closed: number; swell: number; open: number },
): MeshData {
  const n = local.position.length / 3;
  const position = new Float32Array(n * 3), normal = new Float32Array(n * 3);
  const aAge = new Float32Array(n).fill(growth.age), aClosed = new Float32Array(n).fill(growth.closed);
  const aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3), aGrow = new Float32Array(n * 2);
  const W = normalize(frame.width), L = normalize(frame.length), N = normalize(frame.normal);
  for (let k = 0; k < n; k++) {
    const x = local.position[k * 3]!, y = local.position[k * 3 + 1]!, z = local.position[k * 3 + 2]!;
    const nx = local.normal[k * 3]!, ny = local.normal[k * 3 + 1]!, nz = local.normal[k * 3 + 2]!;
    position.set(add(frame.origin, add(add(scale(W, x), scale(L, y)), scale(N, z))), k * 3);
    normal.set(normalize(add(add(scale(W, nx), scale(L, ny)), scale(N, nz))), k * 3);
    aPivot.set(frame.origin, k * 3);
    aAxis.set(W, k * 3);
    aGrow.set([growth.swell, growth.open], k * 2);
  }
  return { position, normal, uv: local.uv.slice(), index: local.index.slice(), aAge, aPivot, aAxis, aClosed, aGrow };
}
```

O sinal de `closed` depende da orientação do frame: com `width = cross(up, out)` e `length` inclinada para fora, girar `-openAngle` em torno de `width` leva a ponta de volta para `up`. O teste "closed state points the petal tip along the head up axis" fixa essa convenção; se ele falhar, inverter o sinal em `head.ts`, não no teste.

- [ ] **Step 6: Implementar `head.ts` (pétalas por filotaxia, estames e folhas)**

```ts
// src/scene/flower/head.ts
import type { Attachment } from '../../lsystem/turtle';
import type { FlowerParams } from '../../flower/params';
import { type Rng, range } from '../../seed/prng';
import { type Vec3, add, cross, normalize, scale } from '../../lsystem/vec3';
import { type MeshData, mergeMeshData } from './meshdata';
import { buildPatch, placePatch } from './patch';

const GOLDEN = 137.507764 * (Math.PI / 180);
const DEG = Math.PI / 180;

export function buildHead(head: Attachment, p: FlowerParams, rng: Rng): { petals: MeshData; stamens: MeshData } {
  const up = normalize(head.heading);
  const ref = normalize(head.up);
  const side = normalize(cross(up, ref));
  const coreR = 0.022 * head.scale;
  const total = p.petalCount * p.petalLayers;
  const isBud = head.scale < 1;
  const petals: MeshData[] = [];
  let order = 0;

  for (let layer = 0; layer < p.petalLayers; layer++) {
    const layerScale = Math.pow(0.8, layer) * head.scale;
    const openAngle = (78 - layer * 18) * DEG;
    const local = buildPatch(
      {
        length: p.petalLength * layerScale * range(rng, 0.93, 1.05),
        width: p.petalWidth * layerScale,
        curl: p.petalCurl, ruffle: p.petalRuffle, twist: p.petalTwist,
        reflex: p.petalReflex * (1 - layer * 0.3), profile: 'petal',
      },
      12, 16,
    );
    for (let k = 0; k < p.petalCount; k++) {
      const phi = (k / p.petalCount) * Math.PI * 2 + layer * GOLDEN;
      const out = normalize(add(scale(ref, Math.cos(phi)), scale(side, Math.sin(phi))));
      const width = normalize(cross(up, out));
      const length = normalize(add(scale(up, Math.cos(openAngle)), scale(out, Math.sin(openAngle))));
      const normal = normalize(cross(width, length));
      const origin = add(add(head.position, scale(out, coreR * (1 - layer * 0.25))), scale(up, layer * 0.004));
      const age = Math.min(0.76, head.age + 0.08 + (0.22 * order) / Math.max(1, total - 1));
      order++;
      petals.push(
        placePatch(local, { origin, width, length, normal }, {
          age,
          closed: -(openAngle - 6 * DEG) * (isBud ? 0.6 : 1),
          swell: 0.12,
          open: 0.22,
        }),
      );
    }
  }

  // Estames: disco de Vogel com 34 pontos (Fibonacci), cúpula baixa.
  const stamens: MeshData[] = [];
  const count = 34;
  for (let i = 0; i < count; i++) {
    const r = coreR * 0.9 * Math.sqrt((i + 0.5) / count);
    const a = i * GOLDEN;
    const dir = add(scale(ref, Math.cos(a) * r), scale(side, Math.sin(a) * r));
    const h = 0.012 * head.scale * (1 - (r / coreR) ** 2) + 0.004;
    const center = add(add(head.position, dir), scale(up, h));
    stamens.push(sphere(center, 0.0035 * head.scale, head.position, head.age + 0.3));
  }
  return { petals: mergeMeshData(petals), stamens: mergeMeshData(stamens) };
}

export function buildLeaf(leaf: Attachment, rng: Rng): MeshData {
  const length = normalize(leaf.heading);
  const width = normalize(leaf.left);
  const normal = normalize(cross(width, length));
  const local = buildPatch(
    { length: 0.2 * leaf.scale, width: 0.06 * leaf.scale, curl: 0.35, ruffle: 0.15, twist: range(rng, -0.3, 0.3), reflex: 0.35, profile: 'leaf' },
    8, 14,
  );
  return placePatch(local, { origin: leaf.position, width, length, normal }, { age: leaf.age + 0.03, closed: 50 * DEG, swell: 0.06, open: 0.15 });
}

function sphere(center: Vec3, radius: number, pivot: Vec3, age: number): MeshData {
  const seg = 6, rings = 4;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let y = 0; y <= rings; y++) {
    const v = y / rings, th = v * Math.PI;
    for (let x = 0; x <= seg; x++) {
      const u = x / seg, ph = u * Math.PI * 2;
      const n: Vec3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      pos.push(...add(center, scale(n, radius)));
      nor.push(...n);
      uv.push(u, v);
    }
  }
  for (let y = 0; y < rings; y++) {
    for (let x = 0; x < seg; x++) {
      const a = y * (seg + 1) + x, b = a + seg + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const n = pos.length / 3;
  const aPivot = new Float32Array(n * 3), aAxis = new Float32Array(n * 3), aGrow = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { aPivot.set(pivot, i * 3); aAxis.set([0, 1, 0], i * 3); aGrow.set([0.15, 0.0001], i * 2); }
  return {
    position: new Float32Array(pos), normal: new Float32Array(nor), uv: new Float32Array(uv), index: new Uint32Array(idx),
    aAge: new Float32Array(n).fill(age), aPivot, aAxis, aClosed: new Float32Array(n), aGrow,
  };
}
```

- [ ] **Step 7: Implementar `build.ts`**

```ts
// src/scene/flower/build.ts
import type { Seed128 } from '../../seed/hash';
import { sfc32 } from '../../seed/prng';
import { flowerParams, type FlowerParams } from '../../flower/params';
import { flowerModules } from '../../lsystem/flower';
import { interpret } from '../../lsystem/turtle';
import { type MeshData, mergeMeshData } from './meshdata';
import { buildTube } from './tube';
import { buildHead, buildLeaf } from './head';

export interface FlowerMeshes { stem: MeshData; leaves: MeshData; petals: MeshData; stamens: MeshData; height: number }

export function buildFlower(seed: Seed128): { params: FlowerParams; meshes: FlowerMeshes } {
  const rng = sfc32(seed);
  const params = flowerParams(rng);
  const skeleton = interpret(flowerModules(params, rng));
  const stem = mergeMeshData(skeleton.branches.map((b) => buildTube(b, 10)));
  const leaves = mergeMeshData(skeleton.attachments.filter((a) => a.kind === 'leaf').map((a) => buildLeaf(a, rng)));
  const heads = skeleton.attachments.filter((a) => a.kind === 'head').map((a) => buildHead(a, params, rng));
  const petals = mergeMeshData(heads.map((h) => h.petals));
  const stamens = mergeMeshData(heads.map((h) => h.stamens));
  const height = Math.max(...skeleton.branches.flatMap((b) => b.nodes.map((n) => n.position[1])));
  return { params, meshes: { stem, leaves, petals, stamens, height } };
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run && npm run typecheck`
Expected: todos os testes de todas as tasks passam.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -F - <<'EOF'
feat: build stem, leaf, petal and stamen meshes with growth attributes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Renderização: crescimento na GPU, materiais, bloom e página de protótipo

**Files:**
- Create: `src/core/clock.ts`, `src/core/url.ts`, `src/scene/flower/toGeometry.ts`, `src/scene/flower/growthNode.ts`, `src/scene/flower/materials.ts`, `src/scene/stage.ts`, `src/dev/gui.ts`, `playwright.config.ts`
- Modify: `src/main.ts`
- Test: `tests/unit/clock.test.ts`, `tests/unit/url.test.ts`, `tests/e2e/flower.spec.ts`

**Interfaces:**
- Consumes: `buildFlower`, `FlowerMeshes`, `MeshData`, `growVertex` (Task 6); `flowerPalette`, `FlowerParams` (Task 3); `NAME_SEED`, `cyrb128` (Task 2)
- Produces:
  - `createClock(now?: () => number): { step(): number }` (dt em segundos, limitado a 0,1)
  - `interface AppOptions { backend: 'auto' | 'webgl'; growth: number | null; freeze: boolean; dev: boolean; seed: 'name' | string }`
  - `parseOptions(search: string): AppOptions` (`?backend=webgl`, `?growth=0.6`, `?freeze=1`, `?dev=1`, `?seed=random:3`)
  - `toBufferGeometry(m: MeshData): THREE.BufferGeometry`
  - `uGrowth` (uniform TSL compartilhado) e `growthPositionNode`, `growthNormalNode`
  - `createFlowerMaterials(palette: FlowerPalette): { stem; leaf; petal; stamen; seed }`
  - `window.__quarrymill: { backend: 'webgpu' | 'webgl2'; ready: boolean; setGrowth(g: number): void; dpr(): number }`

- [ ] **Step 1: Testes unitários de relógio e URL (Review Focus 5)**

```ts
// tests/unit/clock.test.ts
import { describe, it, expect } from 'vitest';
import { createClock } from '../../src/core/clock';

describe('createClock', () => {
  it('returns elapsed seconds and clamps long gaps (hidden tab) to 0.1', () => {
    let t = 1000;
    const c = createClock(() => t);
    t += 16;
    expect(c.step()).toBeCloseTo(0.016, 6);
    t += 60_000;
    expect(c.step()).toBe(0.1);
    t += 0;
    expect(c.step()).toBe(0);
  });
});
```

```ts
// tests/unit/url.test.ts
import { describe, it, expect } from 'vitest';
import { parseOptions } from '../../src/core/url';

describe('parseOptions', () => {
  it('defaults', () => {
    expect(parseOptions('')).toEqual({ backend: 'auto', growth: null, freeze: false, dev: false, seed: 'name' });
  });
  it('parses and clamps growth', () => {
    const o = parseOptions('?backend=webgl&growth=1.7&freeze=1&dev=1&seed=random:3');
    expect(o).toEqual({ backend: 'webgl', growth: 1, freeze: true, dev: true, seed: 'random:3' });
    expect(parseOptions('?growth=abc').growth).toBeNull();
    expect(parseOptions('?growth=-1').growth).toBe(0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar, implementar, ver passar**

```ts
// src/core/clock.ts
export function createClock(now: () => number = () => performance.now()) {
  let last = now();
  return {
    step(): number {
      const t = now();
      const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
      last = t;
      return dt;
    },
  };
}
```

```ts
// src/core/url.ts
export interface AppOptions {
  backend: 'auto' | 'webgl';
  growth: number | null;
  freeze: boolean;
  dev: boolean;
  seed: 'name' | string;
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
  };
}
```

Run: `npx vitest run tests/unit/clock.test.ts tests/unit/url.test.ts`
Expected: FAIL antes de criar os arquivos, PASS depois.

- [ ] **Step 3: Conferir a API instalada do Three.js antes de escrever código de render**

Run: `ls node_modules/three/examples | grep -E "^webgpu_(postprocessing_bloom|tsl_|custom_attributes|materials)" | head -20` e ler o exemplo de bloom e um exemplo que use `attribute()` em TSL.

Anotar no próprio commit desta task os nomes conferidos: como importar `WebGPURenderer` e os materiais de nó (`three/webgpu`), os nós TSL (`three/tsl`), o nó de bloom (`three/addons/tsl/display/BloomNode.js`) e a classe de pipeline de pós-processamento (em versões recentes ela pode se chamar `PostProcessing` ou `RenderPipeline`; usar a que existir em 0.186.1). O código abaixo usa os nomes esperados; ajustar só os nomes, não a lógica.

- [ ] **Step 4: Implementar `toGeometry.ts` e `growthNode.ts`**

```ts
// src/scene/flower/toGeometry.ts
import * as THREE from 'three/webgpu';
import type { MeshData } from './meshdata';

export function toBufferGeometry(m: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(m.normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(m.uv, 2));
  g.setAttribute('aAge', new THREE.BufferAttribute(m.aAge, 1));
  g.setAttribute('aPivot', new THREE.BufferAttribute(m.aPivot, 3));
  g.setAttribute('aAxis', new THREE.BufferAttribute(m.aAxis, 3));
  g.setAttribute('aClosed', new THREE.BufferAttribute(m.aClosed, 1));
  g.setAttribute('aGrow', new THREE.BufferAttribute(m.aGrow, 2));
  g.setIndex(new THREE.BufferAttribute(m.index, 1));
  // Crescimento move vértices na GPU; a caixa precisa cobrir a flor aberta e fechada.
  g.computeBoundingSphere();
  if (g.boundingSphere) g.boundingSphere.radius *= 1.5;
  return g;
}
```

```ts
// src/scene/flower/growthNode.ts
// Espelho de growVertex() em meshdata.ts. Mudou um, mude o outro.
import { Fn, attribute, uniform, positionLocal, normalLocal, smoothstep, cos, sin, cross, dot, normalize } from 'three/tsl';

export const uGrowth = uniform(1);

const rodrigues = Fn(([v, k, a]: any[]) => {
  const c = cos(a);
  const s = sin(a);
  return v.mul(c).add(cross(k, v).mul(s)).add(k.mul(dot(k, v)).mul(c.oneMinus()));
});

const growth = () => {
  const age = attribute('aAge', 'float');
  const grow = attribute('aGrow', 'vec2');
  const scale = smoothstep(age.sub(grow.x), age, uGrowth);
  const open = smoothstep(age, age.add(grow.y), uGrowth);
  const angle = attribute('aClosed', 'float').mul(open.oneMinus());
  const axis = normalize(attribute('aAxis', 'vec3'));
  return { scale, angle, axis };
};

export const growthPositionNode = Fn(() => {
  const { scale, angle, axis } = growth();
  const pivot = attribute('aPivot', 'vec3');
  return pivot.add(rodrigues(positionLocal.sub(pivot), axis, angle).mul(scale));
})();

export const growthNormalNode = Fn(() => {
  const { angle, axis } = growth();
  return normalize(rodrigues(normalLocal, axis, angle));
})();
```

Se o material de nó em 0.186.1 esperar a normal em espaço de visão em `normalNode`, usar o nó de transformação de normal local para visão do próprio TSL (`transformNormalToView` ou equivalente conferido no Step 3). Uma normal degenerada não pode virar NaN: `normalize` de vetor nulo na GPU gera NaN, então, se o Step 9 mostrar pixels pretos piscando em `growth` próximo de 0, trocar `normalize(x)` por `x.div(max(length(x), 1e-6))`.

- [ ] **Step 5: Implementar `materials.ts`**

```ts
// src/scene/flower/materials.ts
import * as THREE from 'three/webgpu';
import {
  uniform, uv, vec2, mix, smoothstep, abs, exp, sin, pow, max, dot, normalize,
  positionWorld, cameraPosition, mx_noise_float, color, float, normalWorld,
} from 'three/tsl';
import type { FlowerPalette } from '../../flower/params';
import { growthPositionNode, growthNormalNode, uGrowth } from './growthNode';

export const uLightPos = uniform(new THREE.Vector3(0.3, 1.6, -1.2));
export const uFlash = uniform(0); // relâmpago: 0 a 1
export const uPulse = uniform(0); // graves da música, fase 4; aqui fica em 0

const rgb = (c: [number, number, number]) => color(new THREE.Color(c[0], c[1], c[2]));

function petalMaterial(p: FlowerPalette) {
  const m = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: 0.55, metalness: 0 });
  m.positionNode = growthPositionNode;
  m.normalNode = growthNormalNode;
  const t = uv();
  const across = t.x.mul(2).sub(1);
  m.colorNode = mix(rgb(p.petalBase), rgb(p.petalTip), smoothstep(0.05, 0.9, t.y));

  // Veias: nervura central + nervuras em leque, com o domínio deformado por ruído.
  const warp = mx_noise_float(t.mul(vec2(6, 10))).mul(0.08);
  const fan = across.add(warp).div(t.y.add(0.15));
  const side = pow(abs(sin(fan.mul(9))), float(18));
  const central = exp(abs(across.add(warp)).mul(-38));
  const veins = max(central, side.mul(0.7)).mul(smoothstep(0.02, 0.25, t.y)).mul(smoothstep(1.0, 0.7, t.y));

  // Translucidez: luz atravessando a pétala quando a câmera olha para a luz.
  const V = normalize(positionWorld.sub(cameraPosition));
  const toLight = normalize(uLightPos.sub(positionWorld));
  const back = pow(max(dot(V, toLight), 0), float(3)).mul(float(0.35).add(uFlash.mul(2.5)));
  const rim = pow(float(1).sub(abs(dot(normalWorld, V.negate()))), float(3)).mul(0.25);

  m.emissiveNode = rgb(p.vein).mul(veins.mul(float(0.9).add(uPulse.mul(0.6))))
    .add(rgb(p.petalTip).mul(back))
    .add(rgb(p.petalTip).mul(rim));
  return m;
}

function simpleMaterial(c: [number, number, number], glow: [number, number, number], glowStrength: number, side: THREE.Side) {
  const m = new THREE.MeshStandardNodeMaterial({ side, roughness: 0.7, metalness: 0 });
  m.positionNode = growthPositionNode;
  m.normalNode = growthNormalNode;
  m.colorNode = rgb(c);
  m.emissiveNode = rgb(glow).mul(glowStrength);
  return m;
}

export function createFlowerMaterials(p: FlowerPalette) {
  const seed = new THREE.MeshBasicNodeMaterial();
  // A semente brilha forte no início e some quando o caule já subiu.
  seed.colorNode = rgb(p.core).mul(float(4).mul(smoothstep(0.25, 0.0, uGrowth)));
  return {
    petal: petalMaterial(p),
    stem: simpleMaterial(p.stem, p.vein, 0.04, THREE.FrontSide),
    leaf: simpleMaterial(p.leaf, p.vein, 0.06, THREE.DoubleSide),
    stamen: simpleMaterial(p.core, p.core, 1.6, THREE.FrontSide),
    seed,
  };
}
```

`mx_noise_float` recebe um `vec2` ou `vec3`; se a assinatura em 0.186.1 for outra, conferir em `node_modules/three/src/nodes/materialx/` e ajustar a chamada.

- [ ] **Step 6: Implementar `stage.ts`**

```ts
// src/scene/stage.ts
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const MAX_DPR = 2;

export async function createStage(canvasParent: HTMLElement, forceWebGL: boolean) {
  const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL });
  await renderer.init();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.1;
  canvasParent.appendChild(renderer.domElement);
  const backend: 'webgpu' | 'webgl2' = (renderer.backend as { isWebGPUBackend?: boolean }).isWebGPUBackend ? 'webgpu' : 'webgl2';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07060d');

  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.01, 50);
  camera.position.set(0.9, 1.05, 1.9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.75, 0);
  controls.enableDamping = true;
  controls.update();

  // Luar frio, ambiente quase nulo, contraluz rosa fraca.
  const moon = new THREE.DirectionalLight('#8fa3ff', 0.7);
  moon.position.set(-1.5, 3, 1.2);
  scene.add(moon, new THREE.HemisphereLight('#1b2140', '#050408', 0.25));
  const flash = new THREE.PointLight('#cfd8ff', 0, 8, 1.5);
  flash.position.set(0.3, 1.6, -1.2);
  scene.add(flash);

  // Nome da classe de pipeline conferido no Step 3 (PostProcessing ou RenderPipeline).
  const post = new THREE.PostProcessing(renderer);
  const scenePass = pass(scene, camera);
  const color = scenePass.getTextureNode('output');
  post.outputNode = color.add(bloom(color, 0.8, 0.4, 0.6));

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_DPR));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener('resize', resize);

  return {
    renderer, scene, camera, controls, flash, backend,
    dpr: () => renderer.getPixelRatio(),
    render: () => post.render(),
  };
}
```

- [ ] **Step 7: Implementar `dev/gui.ts` e `main.ts`**

```ts
// src/dev/gui.ts
import GUI from 'lil-gui';
import type { FlowerParams } from '../flower/params';

export function createDevGui(state: { growth: number; playing: boolean; flash: () => void }, params: FlowerParams) {
  const gui = new GUI({ title: 'Quarrymill dev' });
  gui.add(state, 'growth', 0, 1, 0.001).listen();
  gui.add(state, 'playing');
  gui.add(state, 'flash').name('relâmpago');
  const info = gui.addFolder('parâmetros (seed)');
  for (const [k, v] of Object.entries(params)) info.add({ [k]: typeof v === 'number' ? +v.toFixed(3) : v }, k).disable();
  info.close();
  return gui;
}
```

```ts
// src/main.ts
import * as THREE from 'three/webgpu';
import { parseOptions } from './core/url';
import { createClock } from './core/clock';
import { createStage } from './scene/stage';
import { buildFlower } from './scene/flower/build';
import { toBufferGeometry } from './scene/flower/toGeometry';
import { createFlowerMaterials, uFlash } from './scene/flower/materials';
import { uGrowth } from './scene/flower/growthNode';
import { flowerPalette } from './flower/params';
import { NAME_SEED } from './seed/constants';
import { cyrb128 } from './seed/hash';

declare global {
  interface Window {
    __quarrymill?: { backend: 'webgpu' | 'webgl2'; ready: boolean; setGrowth(g: number): void; dpr(): number };
  }
}

const GROW_SECONDS = 12;

async function main() {
  const opts = parseOptions(location.search);
  const stage = await createStage(document.body, opts.backend === 'webgl');
  const seed = opts.seed === 'name' ? NAME_SEED : cyrb128(opts.seed);
  const { params, meshes } = buildFlower(seed);
  const mats = createFlowerMaterials(flowerPalette(params));

  const group = new THREE.Group();
  group.add(
    new THREE.Mesh(toBufferGeometry(meshes.stem), mats.stem),
    new THREE.Mesh(toBufferGeometry(meshes.leaves), mats.leaf),
    new THREE.Mesh(toBufferGeometry(meshes.petals), mats.petal),
    new THREE.Mesh(toBufferGeometry(meshes.stamens), mats.stamen),
    new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), mats.seed),
  );
  for (const child of group.children) child.frustumCulled = false;
  stage.scene.add(group);

  const state = {
    growth: opts.growth ?? 0,
    playing: opts.growth === null && !opts.freeze,
    flashT: 0,
    flash: () => { state.flashT = 1; },
  };
  if (opts.dev) {
    const { createDevGui } = await import('./dev/gui');
    createDevGui(state, params);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'l' || e.key === 'L') state.flash(); });

  window.__quarrymill = {
    backend: stage.backend,
    ready: false,
    setGrowth: (g: number) => { state.growth = Math.min(1, Math.max(0, g)); state.playing = false; },
    dpr: stage.dpr,
  };

  const clock = createClock();
  let frames = 0;
  stage.renderer.setAnimationLoop(() => {
    const dt = opts.freeze ? 0 : clock.step();
    if (state.playing) state.growth = Math.min(1, state.growth + dt / GROW_SECONDS);
    state.flashT = Math.max(0, state.flashT - dt * 2.5);
    const flicker = state.flashT > 0 ? state.flashT * (0.6 + 0.4 * Math.sin(state.flashT * 40)) : 0;
    uGrowth.value = state.growth;
    uFlash.value = flicker;
    stage.flash.intensity = flicker * 30;
    stage.controls.update();
    stage.render();
    if (++frames === 3) window.__quarrymill!.ready = true;
  });
}

main().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', '<p style="color:#ffb3d1;font:16px serif;padding:2rem">Seu navegador não conseguiu abrir a cena 3D.</p>');
});
```

- [ ] **Step 8: Rodar no navegador**

Run: `npm run dev` e abrir `http://localhost:5179/?dev=1`.
Expected: a semente brilha, o caule sobe, as folhas abrem, o botão incha e as pétalas abrem em 12 s; "relâmpago" (ou a tecla L) faz as pétalas acenderem por trás. Sem erros no console. Abrir também `?backend=webgl&dev=1` e confirmar o mesmo resultado.

- [ ] **Step 9: Escrever os testes e2e (Review Focus 1, 2 e 4)**

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu'] },
  },
  webServer: { command: 'npm run dev', url: 'http://localhost:5179', reuseExistingServer: true },
});
```

```ts
// tests/e2e/flower.spec.ts
import { test, expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

const BASE = 'http://localhost:5179/';

async function open(page: Page, query: string) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + query);
  await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 45_000 });
  return errors;
}

async function pinkPixels(page: Page) {
  const png = PNG.sync.read(await page.screenshot());
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]!, g = png.data[i + 1]!, b = png.data[i + 2]!;
    if (r > 120 && r > g + 40 && b > 60) n++;
  }
  return n;
}

for (const backend of ['webgl', 'auto'] as const) {
  test.describe(`backend=${backend}`, () => {
    test('fully grown flower shows plenty of pink', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(500);
      expect(await pinkPixels(page)).toBeGreaterThan(3000);
      expect(errors).toEqual([]);
    });

    test('growth 0 shows no petals', async ({ page }) => {
      await open(page, `?backend=${backend}&growth=0&freeze=1`);
      await page.waitForTimeout(500);
      expect(await pinkPixels(page)).toBeLessThan(400);
    });

    test('scrubbing 1 -> 0 -> 1 is reversible and error-free', async ({ page }) => {
      const errors = await open(page, `?backend=${backend}&growth=1&freeze=1`);
      await page.waitForTimeout(300);
      const full = await pinkPixels(page);
      for (const g of [0.7, 0.3, 0, 0.5, 1]) {
        await page.evaluate((v) => window.__quarrymill!.setGrowth(v), g);
        await page.waitForTimeout(150);
      }
      const again = await pinkPixels(page);
      expect(Math.abs(again - full) / full).toBeLessThan(0.05);
      expect(errors).toEqual([]);
    });
  });
}

test('resize and high DPR keep DPR capped at 2 without errors', async ({ browser }) => {
  const ctx = await browser.newContext({ deviceScaleFactor: 3, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = await open(page, '?backend=webgl&growth=1&freeze=1');
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.__quarrymill!.dpr())).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('reports which backend it used', async ({ page }) => {
  await open(page, '?backend=webgl&growth=1&freeze=1');
  expect(await page.evaluate(() => window.__quarrymill!.backend)).toBe('webgl2');
});
```

Run: `npm run test:e2e`
Expected: todos passam. Os limiares 3000 e 400 pixels são pontos de partida: se a flor da seed ocupar menos tela, ajustar o limiar de "fully grown" para metade da contagem medida, e registrar no commit o valor medido. No caminho `auto` em headless, o Chromium pode não ter WebGPU e cair em WebGL2; isso é aceitável aqui, e o teste continua válido como teste do caminho automático.

- [ ] **Step 10: Rodar tudo e commit**

Run: `npm test && npm run typecheck && npm run build && npm run test:e2e`
Expected: tudo passa; `dist/` gerado.

```bash
git add -A
git commit -F - <<'EOF'
feat: render the growing flower with TSL growth, petal translucency and bloom

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 8: Galeria para aprovação visual

**Files:**
- Create: `tests/e2e/gallery.spec.ts`
- Modify: `package.json` (scripts `gallery` e `test:e2e`)

**Interfaces:**
- Consumes: `?seed=`, `?growth=`, `?freeze=` (Task 7)
- Produces: `gallery/*.png` (fora do git): a flor dela em crescimento 0,25, 0,5, 0,75 e 1 de dois ângulos, mais 8 seeds aleatórias em 1, para mostrar a faixa de variação ao dono do projeto

- [ ] **Step 1: Escrever a galeria**

```ts
// tests/e2e/gallery.spec.ts
import { test } from '@playwright/test';

const BASE = 'http://localhost:5179/';

test('@gallery', async ({ page }) => {
  test.setTimeout(240_000);
  const shots: [string, string][] = [];
  for (const g of [0.25, 0.5, 0.75, 1]) shots.push([`ana-${g}`, `?seed=name&growth=${g}&freeze=1`]);
  for (let i = 1; i <= 8; i++) shots.push([`random-${i}`, `?seed=random:${i}&growth=1&freeze=1`]);
  for (const [name, q] of shots) {
    await page.goto(BASE + q);
    await page.waitForFunction(() => window.__quarrymill?.ready === true, null, { timeout: 45_000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `gallery/${name}.png` });
  }
  await page.goto(BASE + '?seed=name&growth=1&freeze=1');
  await page.waitForFunction(() => window.__quarrymill?.ready === true);
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(900, 330, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'gallery/ana-1-angle2.png' });
});
```

Em `package.json`, trocar `test:e2e` por `"test:e2e": "playwright test --grep-invert @gallery"` e adicionar `"gallery": "playwright test --grep @gallery"`. Criar a pasta antes de gerar: o `page.screenshot` cria `gallery/` sozinho, então não é preciso passo extra.

- [ ] **Step 2: Gerar e revisar**

Run: `npm run gallery`
Expected: 13 imagens em `gallery/`. O implementador olha cada imagem e registra no relatório final: a flor dela é bonita, legível e rosa? As 8 aleatórias mostram variação sem nenhuma quebrada (pétalas atravessando o caule, flor fora do quadro, preto total)? Qualquer seed quebrada vira correção nas faixas de `PARAM_RANGES` ou na geometria, com novo teste quando for um defeito de geometria.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -F - <<'EOF'
test: add visual gallery of the flower for review

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 4: Ponto de parada humano**

A fase 1 termina aqui. O dono do projeto olha a galeria e a página em `?dev=1` e aprova a forma e o rosa, ou pede ajustes, antes de começar a fase 2.
