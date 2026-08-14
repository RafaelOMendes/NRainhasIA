import type { Runner } from '../../hooks/useSolverRunner';
import { SearchTree, TreeLegend } from '../SearchTree';
import { fmt, PanelHead, Stat } from '../ui';

export function PanelTree({ runner }: { runner: Runner }) {
  return (
    <>
      <PanelHead
        title="Árvore de busca"
        subtitle="Cada nível é uma coluna decidida; cada ponto, uma linha testada. Ramos vermelhos morreram na verificação."
        right={<TreeLegend />}
      />

      <SearchTree nodes={runner.tree} height={196} />

      <div className="stats" style={{ marginTop: 12 }}>
        <Stat label="Nós na árvore" value={fmt(runner.tree.length)} />
        <Stat label="Nós expandidos" value={fmt(runner.stats.nodes)} />
        <Stat label="Backtracks" value={fmt(runner.stats.backtracks)} />
        <Stat label="Profundidade" value={runner.tree.reduce((m, t) => Math.max(m, t.depth), 0)} />
      </div>

      <p className="hint" style={{ marginTop: 10 }}>
        {runner.solverId === 'min-conflicts'
          ? 'Min-Conflicts é busca local: não constrói árvore nenhuma, ele só empurra rainhas até parar de haver conflito.'
          : 'A árvore guarda os últimos ~2200 nós — ramos mortos antigos são descartados para o desenho continuar leve.'}
      </p>
    </>
  );
}
