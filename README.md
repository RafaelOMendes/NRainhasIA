# N Rainhas · IA

Releitura visual do problema das N rainhas: tabuleiro em *liquid glass*, peças que
respondem a arrastar **ou** a clicar-e-clicar, e quatro algoritmos de busca que você
pode assistir trabalhando quadro a quadro.

## Rodar

```bash
npm install
```

```bash
npm run dev
```

`npm run build` gera o pacote de produção; `npm run check` roda só o TypeScript.

## O que dá para fazer

**Tabuleiro.** Clique numa casa vazia para pôr uma rainha. Arraste uma peça para movê-la,
ou clique nela e clique no destino — os dois gestos convivem no mesmo código, decididos por
uma distância limite de 6px no `pointermove`. Arrastar para fora do tabuleiro remove.
O heatmap acende cada casa proporcionalmente ao número de rainhas que a atacam, irradiando
a partir da última casa mexida.

**Dock.** O menu flutuante da base tem um reservatório de rainhas do lado esquerdo: puxe uma
peça de lá e solte numa casa do tabuleiro — a casa alvo acende enquanto você arrasta. E o
próprio dock é móvel: arraste pelo punho (⠿) para colocá-lo onde quiser, com duplo clique
para devolver ao centro. A posição fica salva.

**Menu lateral.** As opções de cada aba abrem numa lateral direita de vidro; o tabuleiro se
desloca para continuar centralizado no espaço que sobra. Em telas estreitas a lateral vira
uma folha inferior automaticamente.

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
  components/    tabuleiro, dock flutuante, menu lateral, árvore, painéis
  styles/        o sistema de vidro
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

### Sobre o vidro

O `backdrop-filter` sozinho dá aparência fosca, não de vidro. São cinco camadas por superfície:

1. **Refração de borda** — o fundo é deslocado por um mapa de ruído (`feDisplacementMap`) numa
   faixa de 20px junto às quinas. Três deslocamentos com escalas diferentes, recombinados por
   canal RGB, produzem a franja colorida que o vidro real cria.
2. **Tinta** — gradiente linear + radial, com `saturate(200%)` e um leve `brightness`.
3. **Gloss** — fio de luz no topo e cáustica no pé, em `mix-blend-mode: screen`.
4. **Aro** — gradiente cônico com dispersão cromática recortado por máscara, girando em 22s
   via `@property --ang` (o único jeito de animar um ângulo em CSS).
5. **Especular** — ponto quente + bloom largo seguindo o ponteiro, escritos como variáveis CSS
   por um único listener global.

Nada disso aparece sobre fundo liso — daí a malha de gradientes em movimento por trás de tudo.

As casas do tabuleiro **não** usam `backdrop-filter`: centenas de superfícies desfocadas ao
mesmo tempo derrubam o FPS. Elas imitam o efeito com gradiente e máscara. O modo performance,
no painel Tabuleiro, desliga desfoque, refração e aro de uma vez.
