# Backlog: o que ficou fora para caber em 6 a 8 horas

Decidido em 15 de outubro de 2026. A spec (`docs/superpowers/specs/2026-10-15-quarrymill-design.md`) descreve a versão completa; estes itens foram trocados por versões mais simples. Em ordem de prioridade para voltar, do que mais aparece na tela para o que menos aparece.

| # | Item cortado | O que entrou no lugar | Spec | Custo estimado para voltar |
|---|---|---|---|---|
| 1 | Nuvens volumétricas com ray marching (Worley + Perlin, Beer-Powder, Henyey-Greenstein), iluminadas por dentro pelos raios | Nuvens procedurais 2D na cúpula do céu, com `uCoverage` que dissolve | 6.3 | alto |
| 2 | Letras do poema formadas por partículas que saem das estrelas, texto SDF dentro da cena (troika-three-text) | Poema em HTML com fade, sobre o canvas | 7.2 | médio |
| 3 | Neblina volumétrica com ray marching em meia resolução, ruído azul e acumulação temporal | Neblina de altura mais camadas de sprites | 6.1 | alto |
| 4 | Estrelas de Eorzea viajando pela GPU até as posições reais | Crossfade entre o céu de Eorzea e o céu real | 6.5 | médio |
| 5 | Chuva em compute shader com colisão e respingos (WebGPU) | Chuva sem estado no vertex shader (já era o fallback previsto) | 6.2 | médio |
| 6 | Reflexo planar no riacho | Água com normais de ondulação e anéis de chuva | 6.1 | baixo |
| 7 | Lua de Eorzea na fase calculada (fórmula nunca verificada) | Só a Lua real | 6.3 | baixo, mas exige verificar a fórmula |
| 8 | Botão de céu "como estava de verdade" (poluição luminosa Bortle 9) | Céu escuro sempre | 6.4 | baixo |
| 9 | Brilho da flor pulsando com os graves da música (AnalyserNode) | Brilho constante | 8 | baixo |
| 10 | Capturas de tela automáticas por ato, nos dois backends | Teste e2e de fumaça e conferência visual manual | 12 | baixo |
| 11 | Resolução dinâmica por tempo de quadro | DPR limitado a 2 (a flor já roda a 60 fps em 1920x889) | 11 | baixo |

Pendências menores herdadas da fase 1 (nenhuma bloqueia): favicon; o modelo de enquadramento ignora a variação de 5% no comprimento das pétalas; enquadramento só garante o eixo vertical (tela em retrato corta nas laterais); botões laterais terminam totalmente abertos.
