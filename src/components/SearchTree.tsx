import { useMemo } from 'react';
import type { TreeNode } from '../core/types';

const COLOR: Record<TreeNode['status'], string> = {
  open: 'rgba(255,255,255,0.4)',
  placed: '#7aa2ff',
  rejected: 'rgba(255,107,127,0.6)',
  failed: 'rgba(255,255,255,0.16)',
  solution: '#5ce6a8',
};

const VB_W = 1000;
const VB_H = 500;

/**
 * Árvore de busca desenhada em SVG. Cada nível é uma profundidade; dentro do
 * nível os nós ficam ordenados pela `key` (a sequência de linhas escolhidas até
 * ali), o que mantém irmãos juntos e evita cruzamento de arestas.
 */
export function SearchTree({
  nodes,
  height = 160,
  limit = 2200,
}: {
  nodes: TreeNode[];
  height?: number;
  limit?: number;
}) {
  const layout = useMemo(() => {
    if (nodes.length === 0) return null;
    const src = nodes.length > limit ? nodes.slice(nodes.length - limit) : nodes;

    const byDepth = new Map<number, TreeNode[]>();
    let maxDepth = 0;
    for (const nd of src) {
      if (nd.depth > maxDepth) maxDepth = nd.depth;
      const arr = byDepth.get(nd.depth);
      if (arr) arr.push(nd);
      else byDepth.set(nd.depth, [nd]);
    }

    const pos = new Map<number, { x: number; y: number }>();
    const rows = maxDepth || 1;
    for (const [d, arr] of byDepth) {
      arr.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.id - b.id));
      const step = VB_W / arr.length;
      const y = 16 + (d / rows) * (VB_H - 32);
      arr.forEach((nd, i) => pos.set(nd.id, { x: (i + 0.5) * step, y }));
    }

    return { src, pos };
  }, [nodes, limit]);

  if (!layout) {
    return (
      <div className="tree-card" style={{ height, display: 'grid', placeItems: 'center' }}>
        <span className="hint">A árvore aparece assim que a busca começa.</span>
      </div>
    );
  }

  const { src, pos } = layout;
  const r = Math.max(2.2, 1400 / Math.max(src.length, 60) / 4);

  return (
    <div className="tree-card">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ height }} preserveAspectRatio="xMidYMid meet">
        <g>
          {src.map((nd) => {
            const a = pos.get(nd.id);
            const b = pos.get(nd.parent);
            if (!a || !b) return null;
            const solved = nd.status === 'solution';
            return (
              <line
                key={`e${nd.id}`}
                x1={b.x}
                y1={b.y}
                x2={a.x}
                y2={a.y}
                stroke={solved ? 'rgba(92,230,168,0.55)' : 'rgba(255,255,255,0.09)'}
                strokeWidth={solved ? 2 : 1}
              />
            );
          })}
        </g>
        <g>
          {src.map((nd) => {
            const a = pos.get(nd.id);
            if (!a) return null;
            return (
              <circle
                key={`n${nd.id}`}
                cx={a.x}
                cy={a.y}
                r={nd.status === 'solution' ? r * 1.7 : r}
                fill={COLOR[nd.status]}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

export function TreeLegend() {
  return (
    <div className="tree-legend">
      <span>
        <i style={{ background: COLOR.placed }} />
        no caminho
      </span>
      <span>
        <i style={{ background: COLOR.rejected }} />
        rejeitado
      </span>
      <span>
        <i style={{ background: COLOR.failed }} />
        ramo morto
      </span>
      <span>
        <i style={{ background: COLOR.solution }} />
        solução
      </span>
    </div>
  );
}
