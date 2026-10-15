# Quarrymill: design

Data: 15 de outubro de 2026
Status: aguardando revisão

## 1. Intenção

Um presente para a Ana Beatriz (Bibi Bilota no FFXIV). Um site estático, aberto no PC, que reconstrói o primeiro encontro do casal: 3 de outubro de 2026, 3:53 da manhã (horário de Brasília), em Quarrymill, South Shroud.

O sucesso é ela se emocionar e perceber que tudo foi calculado para ela: a flor nasce do nome dela, o clima de Eorzea é o clima real daquele instante no jogo, e as estrelas são as estrelas reais sobre São Paulo e Governador Valadares naquele minuto. A técnica serve à emoção, mas deve ser visivelmente impressionante.

Experiência de 2 a 4 minutos, contemplativa, que ela pode revisitar (o site muda com o tempo, ver 6.6).

## 2. Fatos verificados

Calculados em 15 de outubro de 2026 e que o site deve reproduzir em teste:

| Fato | Valor | Fonte |
|---|---|---|
| Instante | 2026-10-03 03:53 BRT = 06:53 UTC, unix 1791010380 | conta direta |
| Hora de Eorzea | 01:01 ET | 1 hora ET = 175 s reais |
| Clima em South Shroud | Thunder, das 03:26:40 às 04:13:20 BRT | algoritmo da comunidade, conferido com `eorzea-weather` 3.2.0 |
| Clima seguinte | Clear Skies a partir de 04:13:20 BRT | idem |
| Tabela de South Shroud | <5 Fog, <10 Thunderstorms, <25 Thunder, <30 Fog, <40 Clouds, <70 Fair Skies, resto Clear Skies | `eorzea-weather` 3.2.0 |
| Lua real | quarto minguante, 53% iluminada, fase 266° | `astronomy-engine` |
| Altitudes em SP | Rigel 72°, Betelgeuse 53°, Sírius 59°, Canopus 54°, Lua 31° (az 30°), Marte 19°, Júpiter 8°, Saturno 29°, Acrux 9° | `astronomy-engine` |
| Altitudes em GV | Rigel 78°, Sírius 63°, Lua 37°, Marte 25°, Júpiter 14°, Saturno 26°, Acrux 7° | `astronomy-engine` |
| Sol | -26° em SP, -23° em GV (noite astronômica) | `astronomy-engine` |
| Distância SP a GV | cerca de 700 km em linha reta | coordenadas (-23.55, -46.63) e (-18.85, -41.95) |

A verificar antes de implementar:
- Fórmula da fase da lua de Eorzea (mês de 32 dias, 8 fases). O cálculo preliminar dá dia 32 do mês, mas o mapeamento dia para fase não foi conferido.
- Licença dos dados de constelação escolhidos (ver 6.4).

## 3. Roteiro da experiência

O scroll é a câmera. Não há páginas; há uma cena contínua e o progresso do scroll (0 a 1) dirige câmera, clima, céu e texto.

| Ato | Scroll | O que acontece |
|---|---|---|
| 0. Entrada | antes do scroll | Tela escura, "Ana Beatriz" em tipografia serifada, "clique para entrar". O clique libera o áudio; shaders já foram compilados por trás. |
| 1. Semente | 0.00 a 0.15 | Quarrymill à noite, chuva fina, relâmpagos ao longe. Uma semente brilha rosa na margem do riacho. Rótulo: "Bibi Bilota · South Shroud · 01:01 ET · Trovoada". |
| 2. A flor | 0.15 a 0.35 | A flor cresce do nome dela: caule, folhas, botão, pétalas abrindo uma a uma. Profundidade de campo foca a flor. Cada relâmpago acende o rosa contra a floresta azul. |
| 3. Subida | 0.35 a 0.50 | A câmera sobe pelo tronco das árvores, atravessa a copa e a neblina. |
| 4. Tempestade | 0.50 a 0.60 | Céu de Eorzea coberto de nuvens volumétricas de tempestade, iluminadas por dentro pelos relâmpagos. |
| 5. O céu abre | 0.60 a 0.70 | Como às 04:13, a tempestade passa: a cobertura de nuvens vai a zero. Atrás delas, o céu de Eorzea se dissolve no céu real do mesmo instante. |
| 6. O céu real | 0.70 a 0.78 | Estrelas reais sobre São Paulo. Órion se desenha em linhas rosa. "Às 3:53, Órion estava sobre São Paulo e sobre Governador Valadares. O mesmo céu, a 700 km de distância." |
| 7. O poema | 0.78 a 0.97 | Verso a verso, em inglês, com a tradução abaixo como eco rosado. Cada verso acende estrelas. A linha em branco é um trecho de scroll só de céu. O último dístico vem sozinho e mais devagar. |
| 8. As noites | 0.97 a 1.00 | Estrelas douradas-rosadas, uma por noite desde o encontro, se acendem. As estrelas continuam aparecendo devagar, sem parar. |
| 9. Explorar | fim | Controles discretos aparecem: Eorzea / Real / Os dois, cidade SP para GV, céu "como estava de verdade" (poluição luminosa), som, recomeçar. Câmera livre para olhar o céu. |

## 4. Abordagem técnica

### 4.1 Opções consideradas

1. **Three.js com WebGPURenderer e TSL (escolhida).** Shaders escritos uma vez em TSL compilam para WGSL (WebGPU) e GLSL (fallback WebGL2 automático). Permite compute shaders reais para partículas no caminho WebGPU. É o caminho mais impressionante que ainda tem rede de segurança.
2. Three.js com WebGLRenderer e GLSL clássico. Mais estável e documentado, mas sem compute e sem o argumento técnico do WebGPU.
3. WebGPU puro, sem engine. Máximo controle e máximo "uau" técnico, mas semanas a mais de infraestrutura (cena, câmera, carregamento, pós-processamento) sem ganho visível para ela.

Escolha: opção 1. Risco conhecido: a API do TSL ainda muda entre versões, então a versão do `three` é fixada exatamente no `package.json` no dia da instalação e não é atualizada durante o projeto.

### 4.2 Stack

- Vite + TypeScript estrito
- `three` (WebGPURenderer, TSL, nós de pós-processamento)
- `astronomy-engine` para Lua, planetas, precessão e matriz equatorial para horizontal
- `lenis` para scroll suave + `gsap` com ScrollTrigger para a linha do tempo
- `troika-three-text` para texto SDF dentro da cena 3D
- Vitest para testes unitários, Playwright para capturas de tela por ato
- GitHub Actions publicando no GitHub Pages

Versões exatas são fixadas na instalação, todas com pelo menos duas semanas de lançamento.

### 4.3 Estrutura de módulos

Cada módulo tem uma responsabilidade e uma interface pequena. Os módulos de domínio (`seed`, `lsystem`, `eorzea`, `sky`, `nights`) não importam Three.js e são testáveis em Node.

```
src/
  main.ts                 entrada, detecção de backend, laço de render
  seed/
    hash.ts               cyrb128: string -> 4 x uint32
    prng.ts               sfc32 determinístico a partir do hash
    params.ts             seed -> parâmetros da flor (tabela em 5.2)
  lsystem/
    grammar.ts            L-system paramétrico e estocástico
    turtle.ts             interpretação 3D com transporte paralelo de frames
  eorzea/
    time.ts               unix -> hora, dia, mês de Eorzea
    weather.ts            unix + zona -> clima (tabela de South Shroud)
    moon.ts               fase da lua de Eorzea (fórmula a verificar)
  sky/
    catalog.ts            leitura do catálogo binário de estrelas
    frame.ts              data + lat/lon -> mat3 equatorial para horizontal
    bodies.ts             Lua, planetas, direção do Sol
    color.ts              índice B-V -> temperatura -> RGB
  nights/
    count.ts              noites desde o encontro (definição em 6.6)
  scene/
    flower/               geometria, material das pétalas, crescimento
    forest/               árvores, riacho, roda d'água, neblina
    weather/              chuva, relâmpagos, nuvens volumétricas
    sky/                  céu de Eorzea, céu real, Lua, constelações
    poem/                 texto SDF, partículas que formam letras
    post/                 bloom, tonemapping, profundidade de campo, grão
  timeline/
    timeline.ts           scroll 0..1 -> estado de todos os uniforms
    camera.ts             spline Catmull-Rom com alvos por ato
  audio/
    music.ts              MP3, fade, analisador de frequências
    thunder.ts            trovão sintetizado
    rain.ts               chuva sintetizada
  ui/
    gate.ts               tela de entrada
    explore.ts            controles do ato 9
scripts/
  build-catalog.ts        catálogo de estrelas -> public/stars.bin
```

## 5. A flor

### 5.1 Geração

- **Seed:** o nome completo dela (normalizado em NFC, sem espaços nas pontas) passa por cyrb128 e alimenta um sfc32. A seed é calculada uma vez e gravada como constante numérica no código; o nome completo não aparece no repositório público (ver 9).
- **Estrutura:** L-system paramétrico estocástico. Os módulos carregam comprimento, raio e "idade de nascimento". As regras estocásticas usam o PRNG, então a mesma seed sempre dá a mesma planta.
- **Tartaruga 3D:** interpreta a string gerando cilindros generalizados (tubos) com transporte paralelo de frames, sem torções bruscas. O caule tem afinamento, curvatura gravitrópica (tende para cima) e leve fototropismo em direção à Lua.
- **Pétalas:** superfícies paramétricas (patches de Bézier bicúbicos) com curvatura, ondulação de borda e torção controladas pelos parâmetros. Distribuídas por filotaxia de Vogel: ângulo áureo de 137,507°, raio proporcional à raiz do índice.
- **Miolo:** estames e pólen em filotaxia, como um girassol em miniatura, instanciados.

### 5.2 Do nome aos parâmetros

| Parâmetro | Faixa | Origem |
|---|---|---|
| Número de pétalas | 5 a 13, preferindo números de Fibonacci | PRNG |
| Camadas de pétalas | 1 a 3 | PRNG |
| Curvatura e ondulação | contínuas | PRNG |
| Ramificação do caule | 0 a 2 botões laterais | PRNG |
| Folhas | 2 a 5 | PRNG |
| Matiz do rosa | 330° a 355° em OKLCH | PRNG, sempre dentro do rosa |
| Contagem de vaga-lumes | 40 a 90 | seed de "Bibi Bilota" |

A tabela é ajustada visualmente na fase 1 (ver 10): se a seed gerar uma flor feia, ajustamos as faixas, nunca trocamos a seed por outra.

### 5.3 Crescimento na GPU

A geometria é gerada uma vez, completa. Cada vértice carrega um atributo de idade (quando ele nasce na animação). O vertex shader recebe `uGrowth` (0 a 1) e escala, desdobra e curva cada parte conforme sua idade: o caule se estende, o botão incha, cada pétala gira do fechado para o aberto com uma deformação de dobra. Nada é reconstruído na CPU durante o scroll, então o crescimento é perfeitamente reversível quando ela rola para trás.

### 5.4 Material das pétalas

Material TSL próprio:
- Translucidez aproximada: iluminação envolvente mais transmissão pelas costas, para a luz do relâmpago atravessar a pétala.
- Veias bioluminescentes: padrão procedural com ruído Voronoi e deformação de domínio, emitindo um rosa quente que pulsa levemente com os graves da música (ver 8).
- Fresnel na borda, gradiente da base para a ponta em OKLCH (rosa claro de cerejeira até magenta no miolo).
- Gotas de chuva acumuladas: pontos especulares procedurais.

## 6. O mundo

### 6.1 Quarrymill

Inspirado no lugar, sem assets do jogo:
- **Árvores:** troncos gerados pelo mesmo motor de L-system da flor (reuso), instanciados; copas com cartões de folhagem alfa e oclusão aproximada.
- **Riacho:** plano de água com reflexo planar, normais de ondulação e anéis de gotas de chuva procedurais.
- **Roda d'água:** geometria procedural girando, ao fundo, desfocada.
- **Neblina volumétrica:** ray marching em meia resolução com jitter de ruído azul e acumulação temporal. Os relâmpagos iluminam a neblina, criando o clarão entre os troncos.
- **Vaga-lumes:** partículas com ruído curl, quantidade vinda da seed de "Bibi Bilota".

### 6.2 Tempestade

- **Chuva:** no caminho WebGPU, partículas em compute shader com colisão contra o plano do chão e respingos. No fallback WebGL2, chuva sem estado calculada no vertex shader a partir do tempo, com aparência equivalente.
- **Relâmpagos:** raios ramificados por deslocamento de ponto médio (outro L-system), renderizados como fitas emissivas. Cada raio dispara um clarão que ilumina a cena, a neblina e as nuvens. O ritmo dos raios é determinístico.
- **Trovão:** sintetizado (ver 8), com atraso proporcional à distância do raio pela velocidade do som (343 m/s na escala da cena).

### 6.3 Céu de Eorzea

- **Nuvens volumétricas:** ray marching de ruído Worley e Perlin em camadas, iluminação com Beer-Powder e espalhamento de Henyey-Greenstein. Iluminação interna pelos relâmpagos. O uniform `uCoverage` vai de tempestade para zero no ato 5.
- **Hora:** paleta da noite de Eorzea às 01:01 ET.
- **Lua de Eorzea:** na fase calculada por `eorzea/moon.ts`.
- **Estrelas de Eorzea:** procedurais com seed na data, já que o céu do jogo é ficcional.

### 6.4 Céu real

- **Catálogo:** Yale Bright Star Catalogue (cerca de 9.100 estrelas até magnitude 6,5), pré-processado em build por `scripts/build-catalog.ts` em um binário Float32 com ascensão reta, declinação, magnitude e B-V (cerca de 150 KB).
- **Posições na GPU:** `sky/frame.ts` usa `astronomy-engine` para montar a matriz de rotação equatorial (J2000) para horizontal, incluindo precessão e nutação, para a data e a cidade. Essa única `mat3` vai como uniform; o vertex shader gira as 9.100 estrelas. Trocar de cidade é interpolar latitude e longitude e recalcular a matriz, então o céu desliza suavemente de SP para GV.
- **Aparência física:** cor pela temperatura derivada do B-V (fórmula de Ballesteros) convertida em RGB de corpo negro. Tamanho e brilho pela magnitude. Extinção atmosférica pela massa de ar (estrelas perto do horizonte ficam mais fracas e avermelhadas). Cintilação mais forte perto do horizonte.
- **Lua real:** esfera iluminada pela direção real do Sol, então o quarto minguante sai da geometria e não de uma textura de fase. Textura do NASA CGI Moon Kit (domínio público).
- **Planetas:** Marte, Júpiter e Saturno nas posições calculadas, com rótulos discretos no modo explorar.
- **Constelações:** linhas de Órion (e das demais no modo explorar) a partir dos dados do d3-celestial, licença BSD-3, a confirmar no repositório antes de usar.
- **Céu "de verdade":** por padrão o céu é de céu escuro (licença artística). No modo explorar, um botão mostra o céu como estava de fato em São Paulo, com poluição luminosa de Bortle 9 apagando quase tudo exceto as estrelas mais brilhantes, a Lua e os planetas. Isso é honesto e vira uma frase: "isso é o que dava para ver da sua janela; o resto estava lá também".

### 6.5 A passagem de Eorzea para o real

No ato 5: `uCoverage` leva as nuvens a zero, depois `uWorldBlend` (0 Eorzea, 1 real) cruza as paletas do céu e as estrelas procedurais de Eorzea viajam pela GPU até as posições reais do catálogo (interpolação por estrela, com estrelas sobrando apagando). A Lua de Eorzea desliza e se funde na Lua real. No modo "Os dois", `uWorldBlend` fica em 0,5 e as duas camadas se sobrepõem.

### 6.6 As noites

- Definição: uma estrela pela noite do encontro (2 para 3 de outubro) mais uma para cada meia-noite em horário de Brasília desde então. Em 15 de outubro de 2026 são 13.
- Posições determinísticas pela seed e pelo índice da noite, perto de Órion, para que a estrela de cada noite esteja sempre no mesmo lugar.
- Na última visita, o site guarda a contagem no `localStorage` (protegido por try/catch). Se houver noites novas desde então, as estrelas novas chegam com uma animação de queda; sem armazenamento, todas aparecem normalmente.
- Depois do poema, estrelas comuns continuam surgindo devagar, sem fim, como resposta ao último verso.

## 7. O poema

### 7.1 Texto

Original (sem autoria conhecida):

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

Tradução:

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

As minúsculas e a pontuação do original são mantidas.

### 7.2 Apresentação

- Texto SDF com `troika-three-text` dentro da cena, sofrendo bloom e profundidade como o resto do céu. Fonte: Cormorant Garamond itálico (OFL), servida localmente.
- Cada verso se forma a partir de estrelas: partículas saem de estrelas próximas e voam até pontos amostrados nos contornos das letras, e então o texto SDF nítido aparece por cima com fade. O verso acende algumas estrelas quando termina, como quem conta moedas.
- A tradução surge abaixo, menor, em rosa, meio segundo depois.
- O mesmo poema existe em HTML visualmente oculto para leitores de tela.

## 8. Áudio

- **Música:** "Neath Dark Waters" (tema de Amaurot), MP3 de 7,2 MB, servida do próprio site. Fade in após o clique de entrada. Botão de silenciar sempre visível de forma discreta.
- **Reatividade:** um AnalyserNode do Web Audio extrai a energia dos graves; ela modula de leve o brilho das veias da flor e a velocidade dos vaga-lumes. Sutil, nunca uma "visualização de música".
- **Trovão sintetizado:** ruído marrom com filtros passa-baixa e envelope em camadas (estalo inicial, ribombo, cauda), disparado com o atraso da distância de cada relâmpago.
- **Chuva sintetizada:** ruído rosa filtrado, com volume ligado à intensidade da chuva no timeline; some quando o céu abre.
- A música abaixa levemente durante trovões.

Risco aceito: o MP3 é música da Square Enix redistribuída num site público. Decisão do dono do projeto: aceitar o risco de um pedido de remoção.

## 9. Privacidade

O GitHub Pages é público. Por padrão:
- O nome completo não entra no repositório: só a seed numérica derivada dele.
- O site exibe "Ana Beatriz" e "Bibi Bilota".
- As cidades aparecem no texto do ato 6, por decisão do roteiro. Bairros ou coordenadas precisas não aparecem; as coordenadas usadas são as do centro de cada cidade.
- Nome do repositório e URL neutros (`quarrymill`).

## 10. Plano de entrega por fases

Cada fase termina com algo que dá para ver no navegador.

1. **A flor sozinha:** seed, L-system, tartaruga, pétalas, crescimento por slider, material das pétalas, bloom. É o protótipo para aprovar a forma e o rosa.
2. **Quarrymill e a tempestade:** floresta, riacho, neblina, chuva, relâmpagos, vaga-lumes.
3. **Os céus:** nuvens volumétricas, céu de Eorzea, catálogo, céu real, Lua, constelações, a passagem.
4. **Scroll e poema:** timeline, câmera, texto, partículas formando letras, as noites.
5. **Áudio, entrada, modo explorar, desempenho e publicação.**

## 11. Desempenho e compatibilidade

- Alvo: 60 fps em 1440p numa GPU intermediária de PC (por exemplo, uma RTX 3060), Chrome ou Edge atuais.
- WebGPU quando disponível; senão WebGL2 pelo mesmo código TSL; sem WebGL2, uma imagem estática com o poema.
- Resolução dinâmica: se o tempo de quadro passar de 18 ms por um segundo, a escala de renderização desce em passos até 0,6; sobe de volta quando houver folga. A neblina e as nuvens já rodam em meia resolução.
- Compilação dos shaders com `compileAsync` escondida atrás da tela de entrada.
- Orçamento de download: abaixo de 12 MB no total, incluindo a música.

## 12. Testes

- **Unitários (Vitest):**
  - mesma seed gera exatamente o mesmo L-system e os mesmos parâmetros;
  - `eorzea/time` dá 01:01 ET para o unix 1791010380;
  - `eorzea/weather` dá Thunder às 03:53 e Clear Skies às 04:20, conferido contra o pacote `eorzea-weather` como oráculo em toda a janela de 3 de outubro;
  - `sky/frame` reproduz as altitudes da seção 2 com tolerância de 0,5°, comparando com `astronomy-engine` direto;
  - `nights/count` dá 13 em 15 de outubro de 2026 e trata a virada da meia-noite em BRT.
- **Visuais (Playwright):** captura de tela em cada ato, nos dois backends, com tempo e seed fixos, para detectar regressões.
- **Desempenho:** amostragem de tempo de quadro em cada ato no modo de teste, registrada no console.

## 13. Publicação

- GitHub Actions: instala, roda os testes, faz o build e publica com `actions/deploy-pages`.
- `base` do Vite ajustado ao nome do repositório.
- Domínio próprio opcional, fora do escopo desta spec.

## 14. Fora do escopo

- Versão para celular (ela vai abrir no PC; no celular o site mostra um aviso amigável e a versão estática).
- Assets ou modelos extraídos do FFXIV.
- Qualquer backend ou coleta de dados.
