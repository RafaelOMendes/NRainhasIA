import { useMemo } from 'react';
import { layoutTree, STATUS_COLOR } from '../core/treeLayout';
import type { TreeNode } from '../core/types';

/**
 * Visão compacta da árvore: o layout inteiro encaixado num `viewBox`, sem
 * interação. Para inspecionar de perto existe o `TreeExplorer`.
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
  const layout = useMemo(
    () => layoutTree(nodes, { limit, levelGap: 60, nodeGap: 14, padding: 22 }),
    [nodes, limit],
  );

  if (!layout) {
    return (
      <div className="tree-card" style={{ height, display: 'grid', placeItems: 'center' }}>
        <span className="hint">A árvore aparece assim que a busca começa.</span>
      </div>
    );
  }

  const { placed, pos, width, height: h } = layout;
  const r = Math.max(1.8, Math.min(5, 900 / Math.max(placed.length, 40)));

  return (
    <div className="tree-card">
      <svg viewBox={`0 0 ${width} ${h}`} style={{ height }} preserveAspectRatio="xMidYMid meet">
        <g>
          {placed.map(({ node }) => {
            const a = pos.get(node.id);
            const b = pos.get(node.parent);
            if (!a || !b) return null;
            const solved = node.status === 'solution';
            return (
              <line
                key={`e${node.id}`}
                x1={b.x}
                y1={b.y}
                x2={a.x}
                y2={a.y}
                stroke={solved ? 'rgba(62,207,142,0.55)' : 'rgba(255,255,255,0.08)'}
                strokeWidth={solved ? 2 : 1}
              />
            );
          })}
        </g>
        <g>
          {placed.map(({ node, x, y }) => (
            <circle
              key={`n${node.id}`}
              cx={x}
              cy={y}
              r={node.status === 'solution' ? r * 1.7 : r}
              fill={STATUS_COLOR[node.status]}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

export function TreeLegend() {
  return (
    <div className="tree-legend">
      <span>
        <i style={{ background: STATUS_COLOR.placed }} />
        no caminho
      </span>
      <span>
        <i style={{ background: STATUS_COLOR.rejected }} />
        rejeitado
      </span>
      <span>
        <i style={{ background: STATUS_COLOR.failed }} />
        ramo morto
      </span>
      <span>
        <i style={{ background: STATUS_COLOR.solution }} />
        solução
      </span>
    </div>
  );
}
