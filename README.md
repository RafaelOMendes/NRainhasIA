# N Rainhas · IA

Releitura visual do problema das N rainhas: interface escura e sóbria, peças que respondem a
arrastar **ou** a clicar-e-clicar, e quatro algoritmos de busca que você pode assistir
trabalhando quadro a quadro.

> **O problema.** Posicionar N rainhas num tabuleiro N×N sem que nenhuma ataque outra —
> ou seja, sem duas na mesma linha, coluna ou diagonal. Para N=8 existem 92 soluções, que
> se reduzem a 12 quando você descarta as que são a mesma coisa girada ou espelhada.

## Como rodar

Requer [Node.js](https://nodejs.org) 20 ou superior (testado no 24). Nenhuma outra
dependência — o app roda inteiro no navegador, sem back-end.

**1. Instalar as dependências** (só na primeira vez):

```bash
npm install
```

**2. Subir o servidor de desenvolvimento:**

```bash
npm run dev
```

Abra o endereço que o Vite imprimir no terminal, normalmente `http://localhost:5173`.
O app já começa utilizável: clique numa casa para pôr a primeira rainha.

**Outros comandos:**

| comando | o que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento com recarga automática |
| `npm run build` | verifica os tipos e gera o pacote de produção em `dist/` |
| `npm run preview` | serve o `dist/` já construído, para conferir o build |
| `npm run check` | roda só o TypeScript, sem gerar nada |

Para publicar, o conteúdo de `dist/` é estático: serve em qualquer hospedagem de
arquivos (GitHub Pages, Netlify, Vercel). O `base` do Vite já está como `'./'`, então
funciona também a partir de um subdiretório.

## Como funciona, em resumo

Você monta o tabuleiro à mão e pede para a IA resolver — em câmera lenta, para ver o
raciocínio, ou instantaneamente.

**O ciclo típico:** clique em algumas casas para colocar rainhas (o tabuleiro acende em
vermelho as casas ameaçadas, então dá para ver o estrago de cada peça). Abra o painel
**Solver** no menu de baixo e clique em *Iniciar busca*: as rainhas passam a se posicionar
sozinhas, e você vê o algoritmo tentar uma casa, bater num conflito, e voltar atrás. O
controle de velocidade vai de 1 passo por segundo até turbo. Se preferir a resposta pronta,
*Resolver agora* completa o tabuleiro respeitando as rainhas que você já pôs — ou avisa que
aquela configuração não fecha de jeito nenhum.

**As quatro estratégias** que você pode assistir, em ordem de esperteza:

- **Backtracking** — testa as linhas na ordem e volta atrás no primeiro conflito.
- **Forward Checking** — ao colocar uma rainha, já risca as casas que ela ataca no futuro,
  e desiste do ramo assim que alguma coluna fica sem nenhuma opção.
- **MRV + Forward Checking** — o mesmo, mas atacando sempre a coluna com menos opções
  restantes. É a estratégia do "falhe rápido", e a diferença é gritante (veja a tabela da
  Corrida abaixo).
- **Min-Conflicts** — muda de filosofia: começa com o tabuleiro cheio, de qualquer jeito, e
  vai movendo a rainha mais encrencada para a linha menos atacada até sobrar conflito nenhum.
  Resolve N=120 em poucos milissegundos.

**Por dentro,** os quatro algoritmos são escritos como *geradores*: em vez de devolver a
resposta, eles emitem eventos (`tentei`, `coloquei`, `rejeitei`, `voltei atrás`). Quem
consome decide o ritmo — a tela consome devagar para animar, e um Web Worker consome a toda
velocidade para a Corrida. Isso é o que evita ter duas implementações do mesmo algoritmo
para manter em sincronia.

## O que dá para fazer

**Tabuleiro.** Clique numa casa vazia para pôr uma rainha. Arraste uma peça para movê-la,
ou clique nela e clique no destino — os dois gestos convivem no mesmo código, decididos por
uma distância limite de 6px no `pointermove`. Arrastar para fora do tabuleiro remove.
O heatmap acende cada casa proporcionalmente ao número de rainhas que a atacam, irradiando
a partir da última casa mexida.

**Dock.** O menu da base tem um reservatório de rainhas do lado esquerdo: puxe uma peça de lá e
solte numa casa do tabuleiro — a casa alvo acende enquanto você arrasta. Nas abas, além de
clicar, dá para **arrastar de lado sem soltar** e percorrer os painéis, como quem passa o dedo
por um seletor. O clique fantasma que o navegador dispara no fim do arraste é engolido, para
não desfazer a aba que você acabou de escolher.

**Menu lateral.** As opções de cada aba abrem numa lateral direita; o tabuleiro se desloca para
continuar centralizado no espaço que sobra. Em telas estreitas a lateral vira uma folha
inferior automaticamente.

**Solver animado.** Backtracking, Forward Checking, MRV+FC e Min-Conflicts, com play/pause,
passo a passo e velocidade de 1 passo/s até turbo. Dá para ver a rainha ser colocada, a casa
piscar em vermelho quando é rejeitada e o backtracking desfazer o caminho.

**Corrida.** Os quatro algoritmos resolvem o mesmo tabuleiro dentro de um Web Worker, com
tempo, nós expandidos e backtracks lado a lado. Ela tem tamanho próprio (8/12/16/20) porque
em N=8 os quatro terminam em menos de um milissegundo. Em N=16 a diferença é brutal:

| | tempo | nós expandidos |
| --- | --- | --- |
| Backtracking | 70 ms | 160.700 |
| Forward Checking | 10 ms | 7.560 |
| MRV + Forward Checking | 0,30 ms | 44 |
| Min-Conflicts | 0,30 ms | 21 movimentos |

**Resolver a partir daqui.** Completa o tabuleiro respeitando as rainhas que você já
posicionou — ou avisa que aquela configuração parcial não fecha de jeito nenhum.

**Árvore de busca.** A árvore de decisão desenhada em SVG enquanto cresce e é podada.
Aparece num cartão flutuante durante a busca e em tamanho grande no painel.

**Soluções.** Enumera todas as soluções de N ≤ 12 (92 para N=8, 14.200 para N=12), separa as
fundamentais pelo grupo diedral D4 e permite girar/espelhar a solução escolhida.

**Desafio.** Cronômetro, dicas (que verificam se o que você montou ainda tem saída) e
pontuação, com recordes salvos no navegador.

**Teclado.** `←↑→↓` movem o cursor, `Enter` coloca ou pega, `Delete` remove, `Esc` desmarca,
`Ctrl+Z` / `Ctrl+Shift+Z` desfazem e refazem.

## Como está organizado

```
src/
  core/          regras e algoritmos — sem DOM, testável isoladamente
    board.ts       ataques, conflitos, heatmap, conversões
    solvers.ts     os quatro solvers, como geradores de eventos
    solutions.ts   enumeração por bitmask e simetrias D4
  workers/       o worker que faz o trabalho pesado fora da main thread
  hooks/         estado do tabuleiro (com undo/redo), motor de animação, corrida…
  components/    tabuleiro, dock, menu lateral, árvore, painéis
  styles/        tokens e componentes visuais, num arquivo só
```

### Duas decisões que moldam o resto

**Os solvers são geradores.** Cada um emite eventos (`try`, `place`, `reject`, `undo`,
`move`) em vez de devolver só a resposta. O mesmo código serve para a animação passo a passo
na tela e para a corrida rodando a toda velocidade dentro do worker — não existem duas
implementações para manter em sincronia.

**A busca animada roda na main thread, mas fatiada.** O laço consome eventos com orçamento de
~9ms por quadro, então nem no turbo a interface trava. Cursor, flash e árvore só viram estado
do React uma vez por quadro; em turbo saem milhares de eventos entre um quadro e outro.
E como o navegador estrangula o `requestAnimationFrame` em aba de segundo plano — o que
faria a busca parar em silêncio —, um watchdog em `setInterval` assume o passo quando nenhum
quadro chega.

### O sistema visual

Escuro, sóbrio, tudo opaco. Três níveis de superfície (`--surface`, `--surface-2`, `--surface-3`)
separados por uma linha de 1px a 7% de branco, um acento só (índigo `#6e8bff`), verde e vermelho
reservados para "resolvido" e "conflito". Sombras contidas, raios de 8/12/16px, números em
algarismos tabulares. Peças claras com a coroa vazada em escuro, sobre casas de contraste
suficiente para o xadrez se ler de longe.

**Não há um único `backdrop-filter`, máscara ou blend mode no projeto** — e isso é
deliberado, não só estético. As versões anteriores tentaram *liquid glass* e todas
serrilhavam as bordas arredondadas dos painéis. As causas, em ordem de descoberta:

1. `backdrop-filter: url(#filtro)` com `feDisplacementMap` numa faixa colada à borda: o
   deslocamento amostra pixels a até 15px de distância, mas o backdrop é recortado nos limites
   do elemento — junto à borda não existe fundo para amostrar. Recombinar três canais RGB
   triplicava o artefato.
2. Mesmo sem deslocamento, `backdrop-filter` **aninhado** dentro de outro `backdrop-filter`
   (o bisel dentro do painel, as peças dentro do tabuleiro) e **máscara aplicada a um elemento
   com `backdrop-filter`** (o truque de `mask-composite` para o aro) reproduzem o serrilhado
   sozinhos.

A regra que ficou no topo do CSS: uma superfície é uma cor sólida com uma borda. Simples,
rápido e sem artefato possível.

### Responsivo

Cinco faixas, todas verificadas medindo a geometria real (nada se sobrepõe, nada estoura):

| faixa | lateral | dock | tabuleiro |
| --- | --- | --- | --- |
| ≥1180px | 340px à direita | ícones + rótulos | até 604px |
| 940–1180px | 306px | rótulos menores | limitado pela altura |
| ≤940px | folha inferior | rótulos menores | 92vw |
| ≤700px | folha inferior | só ícones | 94vw |
| paisagem baixa | volta a ser lateral | só ícones | 52vw |

O recuo do tabuleiro sai de `--side`, calculado a partir de `--side-w` e `--side-gap`: mudar a
largura da lateral num breakpoint reposiciona tabuleiro, dock e toast de uma vez. Alturas usam
`dvh` quando disponível, para a barra de endereço do celular não cortar o dock.
