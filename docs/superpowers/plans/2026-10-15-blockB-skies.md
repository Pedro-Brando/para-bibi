# Bloco B: os céus

Plano enxuto (orçamento total de 6 a 8 horas, sem Fable, sem revisão por bloco). Spec: `docs/superpowers/specs/2026-10-15-quarrymill-design.md` seções 3 (atos 4 a 6), 6.3, 6.4, 6.5. Cortes decididos em `docs/backlog.md`: não implementar nuvens volumétricas, lua de Eorzea, estrelas viajando até as posições reais, botão de poluição luminosa.

## Regras globais

- Repositório `C:/Users/ph00r/source/repos/quarrymill`, branch `feat/blockB-skies` a partir de `main` (o bloco A já está na main). Node 20.20, npm 10; não mexer nas versões existentes nem no `overrides`.
- Única dependência nova permitida: `astronomy-engine@2.1.19` (MIT), versão exata.
- Three.js 0.186.1 com `WebGPURenderer` + TSL; conferir APIs em `node_modules/three`.
- Módulos de domínio (`src/sky`, `src/eorzea`, `src/core`) não importam `three`.
- O nome completo dela nunca aparece. Texto visível em português do Brasil. Nenhum U+2014. Commits pequenos com `git commit -F -`, terminando em `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não usar a porta 5180. Todos os testes existentes continuam passando.

## B1. Catálogo de estrelas (build, uma vez)

- `scripts/build-catalog.mjs`: baixa `https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json` (BSD-3-Clause, estrelas até magnitude 6, `id` = número HIP, `coordinates` = [ascensão reta em graus no intervalo -180 a 180, declinação em graus], `properties.mag`, `properties.bv` como string) e grava `public/stars.bin`: Float32Array intercalado `[raRad, decRad, mag, bv]` por estrela, com RA normalizada para [0, 2π) e `bv` ausente tratado como 0,6. Também grava `public/stars-meta.json` com contagem e fonte. Os dois arquivos gerados entram no repositório (o build do site não depende de rede).
- Incluir a atribuição do d3-celestial (BSD-3) num arquivo `public/CREDITS.txt` (catálogo, astronomy-engine MIT, fonte usada no poema mais tarde).
- Linhas de Órion: constante em `src/sky/orion.ts` com pares de números HIP: Betelgeuse 27989, Bellatrix 25336, Mintaka 25930, Alnilam 26311, Alnitak 26727, Saiph 27366, Rigel 24436, Meissa 26207. Linhas: 27989-26207, 26207-25336, 27989-26727, 25336-25930, 25930-26311, 26311-26727, 26727-27366, 25930-24436. Se algum HIP faltar no catálogo, o teste deve apontar qual.

## B2. Astronomia (domínio puro, TDD)

Arquivos `src/sky/frame.ts`, `src/sky/bodies.ts`, `src/sky/color.ts`, `src/sky/cities.ts`, testes em `tests/unit/sky.test.ts`.

- `CITIES`: São Paulo (-23.55, -46.63) e Governador Valadares (-18.85, -41.95), altitude 700 m.
- `equatorialToHorizontalMatrix(date: Date, lat: number, lon: number): number[]` (mat3 coluna-major, 9 números) usando `Astronomy.Rotation_EQJ_HOR` do `astronomy-engine` (inclui precessão e nutação). Converter o sistema de horizonte do astronomy-engine (x norte, y oeste, z zênite) para o da cena (y para cima, -z norte, x leste) dentro desta função, e documentar a convenção no código.
- `altitudeDeg(raRad, decRad, matrix)`: aplica a matriz a um vetor unitário e devolve a altitude.
- Teste de aceitação com os valores já verificados para 2026-10-03 06:53 UTC (tolerância 0,5°), usando as coordenadas J2000 das estrelas: São Paulo: Rigel 72°, Betelgeuse 53°, Sírius 59°, Canopus 54°, Acrux 9°. Governador Valadares: Rigel 78°, Sírius 63°, Acrux 7°.
- `bodies(date, city)`: Lua (direção na cena, fração iluminada, direção do Sol para iluminar a esfera), Marte, Júpiter, Saturno (direção na cena, magnitude). Testes: Lua 53% iluminada com altitude 31° em SP e 37° em GV; Marte 19°, Júpiter 8°, Saturno 29° em SP (tolerância 1°).
- `bvToRgb(bv)`: B-V para temperatura (fórmula de Ballesteros: `T = 4600 * (1/(0.92*bv + 1.7) + 1/(0.92*bv + 0.62))`) e temperatura para RGB linear normalizado (aproximação de corpo negro por ajuste; testes: bv 0,0 azulado-branco com b ≥ r; bv 1,5 alaranjado com r > b).

## B3. Céu real na GPU

Arquivos em `src/scene/sky/`.

- Uma cúpula (ou esfera grande centrada na câmera) para o fundo noturno: gradiente do horizonte ao zênite, quase preto azulado, levemente mais claro no horizonte.
- Estrelas: `Points` (ou quads instanciados) com os dados do catálogo; o vertex shader gira cada estrela pela `mat3` uniforme `uEqToHor`; tamanho e brilho pela magnitude; cor por `bvToRgb` (calculada na CPU ao carregar, atributo); extinção pela massa de ar perto do horizonte (mais fraca e avermelhada); cintilação mais forte perto do horizonte; estrelas abaixo do horizonte descartadas.
- Lua real: esfera iluminada pela direção do Sol vinda de `bodies`, então o quarto minguante sai da geometria; sem textura obrigatória (um ruído sutil para mares é bem-vindo).
- Planetas: pontos mais brilhantes nas posições calculadas.
- Órion: linhas em rosa neon (mesma família de cor da flor), com um uniform `uOrion` (0 a 1) que desenha as linhas progressivamente.
- Seletor de cidade: `uCityBlend` de 0 (SP) a 1 (GV) interpola latitude e longitude na CPU e recalcula a matriz por quadro, então o céu desliza.

## B4. Céu de Eorzea e a passagem

- O céu fica atrás das silhuetas em camadas do bloco A (Quarrymill em contraluz); o céu de tempestade é o que recorta as silhuetas nos relâmpagos.
- Cúpula de tempestade de Eorzea: paleta noturna de 01:01 ET, nuvens procedurais 2D (fbm em TSL projetado na cúpula, animado pelo vento), iluminadas pelos relâmpagos via o `uFlash` existente. Substitui o céu provisório do bloco A.
- `uCoverage` (1 tempestade, 0 limpo) dissolve as nuvens com um limiar sobre o ruído (as bordas se desfazem, não é só fade).
- `uWorldBlend` (0 Eorzea, 1 real): crossfade da paleta e das estrelas. Estrelas de Eorzea: procedurais com seed derivada de `FIRST_DATE_UNIX`.
- Quando `uCoverage` cai, a chuva (`uRain`) e os relâmpagos param juntos (a tempestade passou às 04:13).

## B5. Integração

- Um objeto `Sky` com `update(dt, t)` e os uniforms `uCoverage`, `uWorldBlend`, `uOrion`, `uCityBlend` expostos para o bloco C conduzir pelo scroll.
- `?dev=1`: sliders para os quatro uniforms, e um botão que olha para o céu (câmera apontando para cima, para Órion) para conferir.
- Parâmetro de URL `view=sky` que aponta a câmera para Órion com `uCoverage=0`, `uWorldBlend=1`, `uOrion=1`, para capturas.
- Teste e2e de fumaça para `view=sky`: `ready`, zero erros no console, `black === 0`, número mínimo de pixels acesos medido e registrado.

## Pronto quando

- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e` passam.
- Capturas em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockB/`: tempestade de Eorzea vista de baixo, meio da passagem, céu real com Órion desenhado (SP), mesmo céu em GV. O implementador confere que Órion está reconhecível, alto no céu, e que a Lua aparece em quarto minguante.
- Relatório em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockB/report.md`.
