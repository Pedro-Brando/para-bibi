# Polimento: navegação por passos, desempenho e a flor do nome

Pedido do dono do projeto depois de ver o site publicado: (1) a página ainda engasga; (2) o scroll é descontrolado: uma rolada pequena às vezes pula a flor ou partes do poema, e ele quer uma setinha para controlar as transições; (3) mais foco na flor e no fato de ela ter sido feita a partir do nome dela.

Regras globais: as mesmas dos blocos anteriores (branch nova `feat/polish` a partir de `main`; sem dependências novas; Three.js 0.186.1; o nome completo dela nunca aparece; nomes públicos "Ana Beatriz" e "Bibi Bilota"; texto em português; nenhum U+2014; commits pequenos com `git commit -F -` terminando em `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; não usar nem parar a porta 5180; não publicar, o coordenador publica). Continua sendo um site, não um jogo.

## P1. Navegação por passos (substitui o scroll livre)

- A experiência vira uma sequência de passos com posições fixas na linha do tempo (`p` de `src/timeline/timeline.ts`). Passos sugeridos: semente; a flor cresce; a flor do nome (P3); subida; tempestade (atrás da névoa); o céu abre; Órion e a frase das cidades; um passo por verso do poema (a linha em branco é um passo só de céu); as noites; o final.
- Ir de um passo ao seguinte anima `p` com easing (duração proporcional à distância, por exemplo 1,2 a 4 s; o crescimento da flor pode levar mais, por volta de 6 s, para ser apreciado). Durante uma transição, novos comandos são enfileirados no máximo um à frente; nunca se pula um passo.
- Controles: uma setinha discreta para baixo (e uma para cima, mais apagada) no centro inferior, com a mesma tipografia e cor do site; teclas seta para baixo/cima, PageDown/PageUp e espaço; roda do mouse e trackpad: um gesto avança no máximo um passo (acumular delta e aplicar um tempo de espera depois de cada passo, para inércia do trackpad não pular vários).
- A barra de rolagem nativa e o espaçador de 1100vh deixam de controlar a cena. Um indicador muito discreto de progresso (por exemplo pontinhos ou uma linha fina na lateral) é bem-vindo, sem cara de HUD de jogo.
- "recomeçar" volta ao primeiro passo com a transição escura que já existe.
- Testes unitários: a lista de passos é crescente em `p`, começa em 0 e termina em 1; o controlador de passos nunca avança mais de um passo por comando e enfileira no máximo um.
- O teste e2e do site passa a navegar com a seta (clique) e com a tecla seta para baixo até o final.

## P2. Desempenho

- Medir no GPU real com as ferramentas `mcp__chrome-devtools__*` numa página NOVA em `http://localhost:5180/` (o servidor do dono; não parar), percorrendo os passos, e fechar a página no fim. Atenção: nesta máquina até uma aba vazia tem pequenas travadas de sistema; compare sempre com uma aba vazia e foque no custo de GPU da cena.
- Prováveis custos: ruído fbm por pixel em tela cheia (nuvens do céu de Eorzea, véu de névoa), várias camadas de silhuetas com transparência em tela cheia, bloom em resolução cheia, DPR 2.
- Medidas esperadas, nesta ordem, parando quando estiver liso: renderizar a cena com escala de resolução adaptativa (começar em 1,0 do tamanho CSS e descer até 0,6 quando o tempo de quadro passar de 18 ms por meio segundo, subir de volta com folga; o texto HTML continua nítido); reduzir oitavas de fbm e calcular o que for possível em menos pixels; não desenhar o que está invisível (camadas e flor escondidas no céu, nuvens com cobertura 0, véu com opacidade 0); bloom em meia resolução se a API permitir.
- Meta: no GPU real, a cena não pode ser visivelmente mais travada que a aba vazia; registrar antes e depois (mediana, p95, quadros acima de 20 ms em 600 quadros) no relatório.

## P3. A flor do nome

- Um passo próprio depois da flor crescer, com a câmera aproximando e girando bem devagar ao redor da flor (só alguns graus, sem controle do usuário), e o resto da cena um pouco mais escuro para a flor brilhar.
- Texto, na mesma tipografia do poema, aparecendo em etapas:
  1. "Esta flor nasceu do seu nome."
  2. O nome "Ana Beatriz" aparece, e as letras se desfazem num número: a seed em hexadecimal, derivada de `NAME_SEED` (os quatro uint32 como 32 dígitos hex, por exemplo agrupados de 8 em 8). Não mostrar nem reconstruir o nome completo; o texto pode dizer "do seu nome completo" sem exibi-lo.
  3. O número vira as características da flor, lidas de `flowerParams(sfc32(NAME_SEED))`: número de pétalas, camadas, botões, folhas e o tom de rosa em graus, por exemplo "13 pétalas · 2 camadas · 1 botão · 3 folhas · rosa 351°". Os números vêm do código, nada fixo no texto.
  4. "Nenhuma outra pessoa no mundo tem esta flor."
- Durante esse passo, as veias e o miolo pulsam uma vez mais forte, como se a flor reconhecesse o nome.

## Pronto quando

- `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e` passam.
- Capturas novas dos passos principais, incluindo as etapas da flor do nome, conferidas pelo implementador.
- Medição de desempenho antes e depois no GPU real, no relatório final.
