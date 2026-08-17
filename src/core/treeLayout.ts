import type { TreeNode } from './types';

export interface PlacedNode {
  node: TreeNode;
  x: number;
  y: number;
}

export interface TreeLayout {
  placed: PlacedNode[];
  pos: Map<number, { x: number; y: number }>;
  byId: Map<number, TreeNode>;
  width: number;
  height: number;
  maxDepth: number;
  widest: number;
}

export interface LayoutOptions {
  /** Máximo de nós desenhados; sobram os mais recentes. */
  limit?: number;
  /** Distância vertical entre profundidades. */
  levelGap?: number;
  /** Largura mínima reservada por nó no nível mais cheio. */
  nodeGap?: number;
  padding?: number;
}

const cmp = (a: TreeNode, b: TreeNode) =>
  a.key < b.key ? -1 : a.key > b.key ? 1 : a.id - b.id;

/**
 * Layout de árvore no estilo Reingold–Tilford simplificado: as folhas ocupam
 * colunas consecutivas na ordem de exploração e todo nó interno fica centrado
 * sobre os próprios filhos. É o que torna a árvore *analisável* — cada subárvore
 * é um bloco compacto que se acompanha com o olho.
 *
 * (A versão anterior espalhava cada profundidade pela largura inteira; a
 * estrutura sumia, porque um nó da raiz ficava a milhares de pixels do irmão.)
 *
 * As coordenadas são de mundo: a visão compacta as encaixa num `viewBox` e o
 * explorador aplica zoom e deslocamento por cima.
 */
export function layoutTree(nodes: TreeNode[], opts: LayoutOptions = {}): TreeLayout | null {
  if (nodes.length === 0) return null;

  const { limit = 2200, levelGap = 90, nodeGap = 26, padding = 40 } = opts;
  const src = nodes.length > limit ? nodes.slice(nodes.length - limit) : nodes;

  const byId = new Map<number, TreeNode>();
  let maxDepth = 0;
  for (const nd of src) {
    byId.set(nd.id, nd);
    if (nd.depth > maxDepth) maxDepth = nd.depth;
  }

  // A poda de nós antigos pode deixar órfãos: eles viram raízes próprias.
  const children = new Map<number, TreeNode[]>();
  const roots: TreeNode[] = [];
  for (const nd of src) {
    if (byId.has(nd.parent)) {
      const arr = children.get(nd.parent);
      if (arr) arr.push(nd);
      else children.set(nd.parent, [nd]);
    } else {
      roots.push(nd);
    }
  }
  for (const arr of children.values()) arr.sort(cmp);
  roots.sort(cmp);

  let column = 0;
  const slot = new Map<number, number>();

  // Iterativo: evita estourar a pilha se a árvore ficar profunda.
  for (const root of roots) {
    const stack: { node: TreeNode; visited: boolean }[] = [{ node: root, visited: false }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const kids = children.get(frame.node.id);
      if (!kids || kids.length === 0) {
        slot.set(frame.node.id, column++);
        stack.pop();
        continue;
      }
      if (!frame.visited) {
        frame.visited = true;
        for (let i = kids.length - 1; i >= 0; i--) stack.push({ node: kids[i], visited: false });
        continue;
      }
      const first = slot.get(kids[0].id) ?? 0;
      const last = slot.get(kids[kids.length - 1].id) ?? first;
      slot.set(frame.node.id, (first + last) / 2);
      stack.pop();
    }
  }

  const leaves = Math.max(1, column);
  const width = padding * 2 + Math.max(1, leaves - 1) * nodeGap;
  const height = padding * 2 + maxDepth * levelGap;

  const pos = new Map<number, { x: number; y: number }>();
  const placed: PlacedNode[] = [];
  for (const nd of src) {
    const p = {
      x: padding + (slot.get(nd.id) ?? 0) * nodeGap,
      y: padding + nd.depth * levelGap,
    };
    pos.set(nd.id, p);
    placed.push({ node: nd, x: p.x, y: p.y });
  }

  // Desenhar em ordem de id mantém as arestas estáveis entre quadros.
  placed.sort((a, b) => a.node.id - b.node.id);

  return { placed, pos, byId, width, height, maxDepth, widest: leaves };
}

/** Caminho da raiz até o nó, na ordem em que as decisões foram tomadas. */
export function pathToRoot(byId: Map<number, TreeNode>, id: number): TreeNode[] {
  const out: TreeNode[] = [];
  let cur = byId.get(id);
  const guard = new Set<number>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    out.push(cur);
    cur = byId.get(cur.parent);
  }
  return out.reverse();
}

export const STATUS_LABEL: Record<TreeNode['status'], string> = {
  open: 'em aberto',
  placed: 'rainha colocada',
  rejected: 'rejeitado',
  failed: 'ramo morto',
  solution: 'faz parte da solução',
};

export const STATUS_COLOR: Record<TreeNode['status'], string> = {
  open: 'rgba(255,255,255,0.34)',
  placed: '#6e8bff',
  rejected: 'rgba(242,96,122,0.62)',
  failed: 'rgba(255,255,255,0.14)',
  solution: '#3ecf8e',
};
