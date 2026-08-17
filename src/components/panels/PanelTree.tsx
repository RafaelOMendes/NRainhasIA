import type { Runner } from '../../hooks/useSolverRunner';
import { IconExpand } from '../Icons';
import { SearchTree, TreeLegend } from '../SearchTree';
import { fmt, PanelHead, Stat } from '../ui';

export function PanelTree({ runner, onExplore }: { runner: Runner; onExplore: () => void }) {
  return (
    <>
      <PanelHead
        title="Árvore de busca"
        subtitle="Cada nível é uma coluna decidida; cada ponto, uma linha testada. Ramos vermelhos morreram na verificação."
        right={<TreeLegend />}
      />

      <button className="btn primary wide" onClick={onExplore} style={{ marginBottom: 12 }}>
        <IconExpand />
        Explorar em tela cheia
      </button>

      <SearchTree nodes={runner.tree} height={168} />

      <div className="stats" style={{ marginTop: 12 }}>
        <Stat label="Nós na árvore" value={fmt(runner.tree.length)} />
        <Stat label="Expandidos" value={fmt(runner.stats.nodes)} />
        <Stat label="Voltas" value={fmt(runner.stats.backtracks)} />
        <Stat label="Profundidade" value={runner.tree.reduce((m, t) => Math.max(m, t.depth), 0)} />
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        {runner.solverId === 'min-conflicts'
          ? 'Min-Conflicts é busca local: não constrói árvore nenhuma, ele só empurra rainhas até parar de haver conflito.'
          : 'A tela cheia permite ampliar, deslocar e clicar num nó para ver a decisão que ele representa e como o tabuleiro estava naquele instante. A árvore guarda os últimos ~2200 nós.'}
      </p>
    </>
  );
}
