# Bloco C: a experiência

Plano enxuto (orçamento total de 6 a 8 horas, sem Fable, sem revisão por bloco). Spec: `docs/superpowers/specs/2026-10-15-quarrymill-design.md` seções 3 (roteiro inteiro), 6.6, 7, 8 (música), 14. Cortes decididos em `docs/backlog.md`: o poema é HTML com fade (sem SDF nem partículas), sem pulso da flor com a música.

## Regras globais

- Repositório `C:/Users/ph00r/source/repos/quarrymill`, branch `feat/blockC-experience` a partir de `main` (blocos A e B já na main). Node 20.20, npm 10. Nenhuma dependência nova: scroll suave e linha do tempo são código próprio.
- Three.js 0.186.1 com `WebGPURenderer` + TSL.
- Módulos de domínio (`src/timeline`, `src/nights`, `src/core`) não importam `three`.
- O nome completo dela nunca aparece. Nomes públicos: "Ana Beatriz", "Bibi Bilota". Texto visível em português do Brasil, exceto o poema original em inglês. Nenhum U+2014 em lugar nenhum (inclusive no poema: o original usa hífen "-", mantenha o hífen). Commits pequenos com `git commit -F -`, terminando em `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Não usar a porta 5180. Todos os testes existentes continuam passando.

## C1. Linha do tempo (domínio puro, TDD)

`src/timeline/timeline.ts`: `stateAt(p: number): SceneState`, função pura de `p` (progresso do scroll, 0 a 1) para todos os controles. `SceneState` inclui: `growth`, `cameraT` (parâmetro na spline da câmera, 0 a 1), `rain`, `coverage`, `worldBlend`, `orion`, `cityBlend`, `poemLine` (índice do verso visível, fracionário para fade), `nights` (0 a 1, quanto das estrelas das noites já acendeu), `labelOpacity`.

Atos (spec seção 3): semente 0,00 a 0,15; flor 0,15 a 0,35 (growth 0 a 1); subida 0,35 a 0,50; tempestade 0,50 a 0,60; o céu abre 0,60 a 0,70 (coverage 1 a 0, rain 1 a 0, worldBlend 0 a 1 entre 0,64 e 0,70); céu real 0,70 a 0,78 (orion 0 a 1 e a frase das duas cidades); poema 0,78 a 0,97; as noites 0,97 a 1,00. Interpolação suave entre marcos (smoothstep). Testes: valores nos marcos, monotonicidade de `growth`, `coverage` e `worldBlend`, `p` fora de [0, 1] limitado.

## C2. Scroll e câmera

- Página com um espaçador alto (cerca de 1000vh) atrás do canvas fixo; `p` = scroll atual sobre o máximo, suavizado por amortecimento exponencial por quadro (sem biblioteca). Também funciona com teclado e roda do mouse, porque é scroll nativo.
- Câmera numa `CatmullRomCurve3` com alvos por ato: enquadramento da flor (usar `frameFlower` da fase 1 no início), aproximação na flor, subida ao longo dos troncos, atravessando a copa, olhando para cima e terminando apontada para Órion (direção vinda de `src/sky`). O alvo também interpola.
- É um site, não um jogo: nada de câmera livre. No fim (`p` = 1) a câmera fica parada no céu, com um parallax sutil que segue o mouse (no máximo 1 a 2 graus).
- A cena do bloco A é de silhuetas em camadas (planos com profundidade): a subida da câmera passa pelas camadas e sai acima delas para o céu, e o parallax vertical entre as camadas é o efeito de profundidade.

## C3. Poema e textos

- Camada HTML fixa sobre o canvas, centrada na parte de cima da tela (o céu), fonte Cormorant Garamond itálico servida localmente: baixar os woff2 (latin e latin-ext, pesos 400 e 400 itálico) do Google Fonts uma vez para `public/fonts/` e declarar `@font-face`; licença OFL em `public/CREDITS.txt`.
- Verso a verso conforme `poemLine`: o verso em inglês aparece, e a tradução surge logo abaixo, menor, em rosa, meio passo depois. A linha em branco é um trecho só de céu. O último dístico aparece sozinho e mais devagar. Texto exato (manter minúsculas e o hífen):

```
I was raised on scarcity
so forgive me
if i hoard you-
your laugh in my pockets
your hands in my hair
every same-thing night
stacked like coins
i refuse to spend
bright and thin.

i keep counting my blessings
for fear they'll stop coming in
```

```
eu cresci na escassez
então me perdoa
se eu te guardo feito tesouro -
teu riso nos meus bolsos
tuas mãos no meu cabelo
cada noite de sempre
empilhada como moeda
que eu me recuso a gastar
reluzente e fina.

eu conto e reconto as minhas bênçãos
com medo de que parem de vir
```

- Cada verso que termina acende algumas estrelas próximas (um pulso de brilho em estrelas do catálogo perto da direção de visão).
- Frase do ato 6, sobre o céu: "Às 3:53, Órion estava sobre São Paulo e sobre Governador Valadares. O mesmo céu, a 700 km de distância."
- Rótulo do bloco A ("Bibi Bilota · South Shroud · 01:01 ET · Trovoada") visível nos atos 1 a 5; no céu real, troca para "Ana Beatriz · São Paulo · 3 de outubro de 2026 · 3:53".

## C4. As noites

- `src/nights/count.ts`: `nightsTogether(now: Date): number`. A noite do encontro (2 para 3 de outubro) conta 1, e cada meia-noite em horário de Brasília (UTC-3, sem horário de verão) depois de 2026-10-03 00:00 BRT soma 1. Testes: 2026-10-03T03:53-03:00 = 1; 2026-10-15T12:00-03:00 = 13; 2026-10-15T23:59-03:00 = 13; 2026-10-16T00:00-03:00 = 14; datas antes do encontro = 1.
- Estrelas dourado-rosadas, uma por noite, em posições determinísticas (seed + índice) numa faixa ao redor de Órion, sempre no mesmo lugar para o mesmo índice. Acendem uma a uma no ato 8.
- `localStorage` (sempre dentro de try/catch) guarda a última contagem vista; estrelas novas desde a última visita chegam com uma animação de queda. Sem armazenamento, tudo aparece normalmente.
- Depois do poema, estrelas comuns continuam surgindo devagar, sem fim.

## C5. Música, entrada e modo explorar

- Copiar `C:/Users/ph00r/Downloads/FFXIV OST Amaurot Overworld Theme ( Neath Dark Waters ) SPOILERS.mp3` para `public/audio/neath-dark-waters.mp3`.
- Tela de entrada: fundo escuro, "Ana Beatriz" em Cormorant Garamond, e "clique para entrar". Durante a tela, a cena carrega e compila shaders (`renderer.compileAsync` quando disponível). O clique cria o `AudioContext` (substitui o "primeiro clique" do bloco A), inicia a música com fade in de 4 s e libera o scroll.
- Botão de som discreto, sempre visível (liga e desliga música e tempestade).
- A música abaixa levemente durante trovões.
- Final (ao chegar em `p` = 1): controles discretos no canto, com cara de site (botões de texto, não HUD de jogo): "Eorzea / Real / Os dois" (worldBlend 0, 1, 0,5), cidade "São Paulo / Governador Valadares" (anima cityBlend), "recomeçar" (volta ao topo).
- Tela pequena ou toque (largura abaixo de 900 px ou `pointer: coarse`): aviso amigável "Este presente foi feito para abrir no computador" com o poema em texto, sem cena 3D.
- Favicon simples (SVG de uma flor rosa) em `public/`.
- `<title>`: "Para a Bibi".

- Sensação de site: tipografia cuidada, scroll nativo, nenhuma instrução de controle tipo jogo, cursor normal.

## Pronto quando

- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e` passam. Teste e2e: tela de entrada aparece, clique entra, rolar até o fim chega ao modo explorar sem erros no console.
- Capturas em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockC/` de: entrada, flor crescendo, subida, tempestade, céu abrindo, Órion com a frase, dois versos do poema, as noites, modo explorar. O implementador confere cada uma.
- Relatório em `C:/Users/ph00r/AppData/Local/Temp/quarrymill-blockC/report.md`.
