# Bloco A: Quarrymill e a tempestade

Plano enxuto (decisão do dono do projeto em 15 de outubro: caber em 6 a 8 horas no total, sem Fable, sem revisão por bloco). O implementador escreve o código; este plano fixa arquivos, interfaces, valores e testes que importam. Spec: `docs/superpowers/specs/2026-10-15-quarrymill-design.md` (seções 3, atos 1 a 3; 6.1; 6.2; 8 para o trovão e a chuva). Cortes já decididos: `docs/backlog.md` (não implementar os itens de lá).

## Regras globais

- Repositório `C:/Users/ph00r/source/repos/quarrymill`, branch nova `feat/blockA-quarrymill` a partir de `main`. Node 20.20, npm 10. Não mexer nas versões nem no `overrides` do `package.json`. Sem dependências novas.
- Three.js 0.186.1, `WebGPURenderer` + TSL. Conferir nomes de API em `node_modules/three` (exemplos `webgpu_*`), não de memória. Já conferidos na fase 1: `RenderPipeline`, `NeutralToneMapping`, `transformNormalToView`, `negateOnBackSide`, `mx_noise_float(texcoord, amplitude, pivot)`, `bloom(node, strength, radius, threshold)`.
- Módulos de domínio (`src/eorzea`, `src/core`, `src/seed`, `src/lsystem`) não importam `three`.
- O nome completo dela nunca aparece em nada. Nomes públicos permitidos: "Bibi Bilota", "Ana Beatriz".
- Texto visível em português do Brasil. Nenhum caractere U+2014 em código, comentários ou commits.
- Commits pequenos por item, `git commit -F -` com heredoc, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não usar a porta 5180 (servidor do dono do projeto). Playwright usa 5179.
- A flor e todos os testes da fase 1 continuam passando. Não alterar a geometria nem o material da flor.

## A1. Eorzea: hora e clima (domínio puro, TDD)

Arquivos: `src/eorzea/time.ts`, `src/eorzea/weather.ts`, `tests/unit/eorzea.test.ts`.

- `eorzeaTime(unixSeconds: number): { hours: number; minutes: number }`: 1 hora de Eorzea = 175 s reais; `et = unix * 3600 / 175`.
- `weatherChance(unixSeconds: number): number` (0 a 99), algoritmo da comunidade: `bell = floor(unix / 175)`; `inc = (bell + 8 - (bell % 8)) % 24`; `days = floor(unix / 4200)`; `base = (days * 100 + inc) >>> 0`; `s1 = ((base << 11) ^ base) >>> 0`; `s2 = ((s1 >>> 8) ^ s1) >>> 0`; `chance = s2 % 100`.
- `southShroudWeather(chance: number)`: `<5 'fog'`, `<10 'thunderstorms'`, `<25 'thunder'`, `<30 'fog'`, `<40 'clouds'`, `<70 'fairSkies'`, resto `'clearSkies'`.
- `weatherLabelPt(w)`: rótulos em português (`thunder` = "Trovoada", `thunderstorms` = "Tempestade", `fog` = "Neblina", `clouds` = "Nublado", `fairSkies` = "Céu bom", `clearSkies` = "Céu limpo").
- `FIRST_DATE_UNIX = 1791010380` (2026-10-03 03:53 BRT).
- Testes com valores já verificados contra o pacote `eorzea-weather` 3.2.0:
  - `eorzeaTime(1791010380)` = 01:01.
  - Janelas de 1400 s (`unix - unix % 1400`): 03:26:40 BRT chance 14, 03:50:00 chance 10, 04:13:20 chance 82, 04:36:40 chance 42, 03:03:20 chance 90.
  - Clima: 03:30 e 03:53 BRT `thunder`; 04:20 BRT `clearSkies`.

## A2. Mundo de Quarrymill

Arquivos em `src/scene/world/` (um arquivo por elemento) e `src/scene/world/index.ts` com `createWorld(scene, opts): World`, onde `World` tem `update(dt, t)` e os uniforms expostos abaixo.

Escala: a flor tem cerca de 1,2 de altura e fica na origem, na margem do riacho. A câmera de fase 1 (enquadrada na flor) continua sendo a câmera; o mundo precisa ficar bonito a partir dela e girando com OrbitControls. O bloco C vai mover a câmera para cima até o céu, então as árvores precisam ter troncos altos (15 a 25 de altura) e copa acima.

- **Chão:** plano com deslocamento suave por ruído, musgo escuro azulado, a flor em cima. Algumas pedras simples na margem.
- **Riacho:** faixa de água a 1,5 a 3 da flor, normais animadas por ruído, anéis de gotas de chuva procedurais (intensidade por `uRain`). Sem reflexo planar.
- **Árvores:** 25 a 40 troncos gerados pelo L-system/tartaruga da fase 1 (`src/lsystem`), com seeds derivadas da seed "Bibi Bilota" (`cyrb128('Bibi Bilota')` combinado com o índice), instanciados ou mesclados; copas com cartões de folhagem alfa com folha procedural em TSL. Distribuição deixando uma clareira em volta da flor e do riacho.
- **Roda d'água:** geometria procedural simples ao fundo, girando devagar.
- **Neblina:** neblina de altura (nó de fog do TSL ou cálculo próprio no material), azul-noite, mais 4 a 8 camadas grandes de sprites de neblina derivando devagar. Os relâmpagos clareiam a neblina via `uFlash` existente (`src/scene/flower/materials.ts`).
- **Vaga-lumes:** instanciados, movimento por ruído no vertex shader, brilho rosado-dourado suave; quantidade 40 a 90 vinda de `sfc32(cyrb128('Bibi Bilota'))`.
- **Chuva:** linhas instanciadas sem estado no vertex shader (posição a partir de `time` e índice), intensidade `uRain` (0 a 1). Na tempestade de 03:53, `uRain = 1`.
- **Relâmpagos:** raio ramificado por deslocamento de ponto médio, gerado em `src/scene/world/bolt.ts` com uma função pura `boltPoints(rng, start, end, depth): Vec3[][]` (testável sem three), renderizado como fita emissiva que pisca e some em cerca de 0,3 s. Cronograma determinístico: `lightningSchedule(rng, durationSeconds): number[]` com intervalos de 6 a 14 s. Cada raio dispara o `flash` já existente (`state.flash()` em `main.ts`), clareia neblina e céu.
- **Céu provisório:** fundo de nuvens escuras de tempestade, simples (gradiente + ruído), que o bloco B substitui. Não investir aqui.

Testes unitários: `boltPoints` (determinístico, primeiro ponto = start, último = end, nenhum ponto a mais de 25% da distância fora da linha reta), `lightningSchedule` (determinístico, todos os intervalos em [6, 14]), contagem de vaga-lumes no intervalo.

## A3. Som da tempestade

Arquivos: `src/audio/thunder.ts`, `src/audio/rain.ts`, `src/audio/context.ts`.

- `AudioContext` criado só depois de um gesto do usuário (clique). Por enquanto: o primeiro clique na página liga o som. O bloco C faz a tela de entrada.
- Trovão sintetizado: ruído marrom, filtro passa-baixa, envelope em camadas (estalo, ribombo, cauda de 3 a 5 s), disparado com atraso `distância / 343` segundos (distância do raio em unidades de cena tratadas como metros; limitar o atraso a 0,5 a 6 s).
- Chuva sintetizada: ruído rosa filtrado, volume ligado a `uRain`.
- Volume geral baixo; sem música neste bloco.

## A4. Integração e opções

- `src/core/url.ts`: novo parâmetro `scene` com valores `'full'` (padrão) e `'flower'` (só a flor no fundo escuro, como na fase 1). Teste unitário.
- `src/main.ts`: monta o mundo quando `scene=full`; liga o cronograma de raios ao `flash` existente e ao trovão.
- Rótulo HTML discreto no canto inferior esquerdo: `Bibi Bilota · South Shroud · 01:01 ET · Trovoada`, calculado de A1 com `FIRST_DATE_UNIX` (nada fixo no texto além do nome e da zona). Tipografia serifada, rosa claro, opacidade baixa.
- `?dev=1`: controles para `uRain`, disparar raio, ligar e desligar névoa e árvores.
- Testes e2e da fase 1: passam a abrir com `scene=flower`, sem mudar os limiares. Adicionar um teste e2e de fumaça para `scene=full`: carrega, `ready`, zero erros no console, `black === 0`, `lit` acima de um mínimo medido e registrado em comentário.

## Pronto quando

- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e` passam.
- Capturas em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockA/`: cena completa em repouso, durante um raio, e de um segundo ângulo. O implementador olha as capturas e confirma que a flor rosa continua sendo o ponto focal, a floresta lê como floresta noturna sob tempestade, e nada está preto, branco ou piscando com NaN.
- Relatório em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockA/report.md`: o que foi feito, comandos e resultados dos testes, decisões tomadas, o que ficou aquém.
