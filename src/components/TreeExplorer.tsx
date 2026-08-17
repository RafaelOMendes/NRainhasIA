import { motion } from 'motion/react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
} from 'react';
import { layoutTree, pathToRoot, STATUS_COLOR, STATUS_LABEL } from '../core/treeLayout';
import type { TreeNode } from '../core/types';
import type { Runner } from '../hooks/useSolverRunner';
import {
  IconClose,
  IconFit,
  IconPause,
  IconPlay,
  IconStep,
  IconZoomIn,
  IconZoomOut,
  QueenGlyph,
} from './Icons';
import { fmt, Switch } from './ui';

const MIN_K = 0.08;
const MAX_K = 30;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface View {
  k: number;
  x: number;
  y: number;
}

/** Tabuleiro como estava quando a busca chegou neste nó. */
function PathBoard({ n, path, current }: { n: number; path: TreeNode[]; current: TreeNode }) {
  // Todo ancestral chegou a receber uma rainha — inclusive os que hoje aparecem
  // como ramo morto, porque a marca de "falhou" é posterior a este instante.
  // Só nós rejeitados nunca colocaram peça, e esses jamais têm filhos.
  const queens = path.filter((p) => p.id !== current.id && p.status !== 'rejected');
  return (
    <svg className="mini-board" viewBox={`0 0 ${n} ${n}`} aria-hidden>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        return (
          <rect
            key={i}
            x={c}
            y={r}
            width={1}
            height={1}
            fill={(r + c) % 2 === 1 ? '#232a38' : '#171b25'}
          />
        );
      })}
      <rect
        x={current.col}
        y={current.row}
        width={1}
        height={1}
        fill={current.status === 'rejected' ? 'rgba(242,96,122,0.35)' : 'rgba(110,139,255,0.35)'}
        stroke={current.status === 'rejected' ? '#f2607a' : '#6e8bff'}
        strokeWidth={0.08}
      />
      {queens.map((q) => (
        <circle key={q.id} cx={q.col + 0.5} cy={q.row + 0.5} r={0.3} fill="#e8ebf2" />
      ))}
    </svg>
  );
}

export function TreeExplorer({
  runner,
  n,
  onClose,
}: {
  runner: Runner;
  n: number;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ k: 1, x: 0, y: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [follow, setFollow] = useState(false);

  const layout = useMemo(
    () => layoutTree(runner.tree, { limit: 2600, levelGap: 118, nodeGap: 36, padding: 70 }),
    [runner.tree],
  );

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  /** Enquadra a árvore inteira. Em buscas grandes vira uma faixa fina — é para ver a silhueta. */
  const fit = useCallback(() => {
    if (!layout || size.w === 0) return;
    const k = clamp(Math.min(size.w / layout.width, size.h / layout.height) * 0.94, MIN_K, MAX_K);
    setView({
      k,
      x: (size.w - layout.width * k) / 2,
      y: (size.h - layout.height * k) / 2,
    });
  }, [layout, size]);

  /**
   * Vista de trabalho: zoom em que os nós ainda se enxergam, centrado na frente
   * da busca (o nó mais recente) ou no caminho da solução, se já houver um.
   * "Enquadrar tudo" com 900 nós daria 9% de zoom e pontos de meio pixel.
   */
  const frameFocus = useCallback(() => {
    if (!layout || size.w === 0) return;
    const k = clamp(Math.min((size.h - 48) / layout.height, 1.3), 0.34, 1.6);

    let target = layout.placed[layout.placed.length - 1];
    for (const p of layout.placed) {
      if (p.node.status === 'solution' && (!target || p.node.depth >= target.node.depth)) target = p;
    }

    setView({
      k,
      x: size.w / 2 - (target?.x ?? layout.width / 2) * k,
      y: Math.min(24, (size.h - layout.height * k) / 2),
    });
  }, [layout, size]);

  // Enquadra ao abrir, e a cada mudança se o modo "acompanhar" estiver ligado.
  const framed = useRef(false);
  useEffect(() => {
    if (!layout || size.w === 0) return;
    if (!framed.current || follow) {
      framed.current = true;
      frameFocus();
    }
  }, [layout, size, follow, frameFocus]);

  const zoomAt = useCallback((factor: number, px: number, py: number) => {
    setView((v) => {
      const k = clamp(v.k * factor, MIN_K, MAX_K);
      const s = k / v.k;
      return { k, x: px - (px - v.x) * s, y: py - (py - v.y) * s };
    });
  }, []);

  const zoomCenter = useCallback(
    (factor: number) => zoomAt(factor, size.w / 2, size.h / 2),
    [zoomAt, size],
  );

  // Listener nativo: o onWheel do React é passivo e não permite preventDefault.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=') zoomCenter(1.25);
      else if (e.key === '-' || e.key === '_') zoomCenter(0.8);
      else if (e.key === '0') fit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomCenter, fit]);

  /* ---------- arrastar para deslocar, dois dedos para ampliar ---------- */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; view: View } | null>(null);
  const pinch = useRef<{ dist: number; mid: { x: number; y: number }; view: View } | null>(null);
  const [panning, setPanning] = useState(false);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const twoFinger = () => {
    const [a, b] = [...pointers.current.values()];
    return {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    };
  };

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, local(e));
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* pode lançar quando o ponteiro já se foi; não deve abortar o gesto */
    }

    if (pointers.current.size === 2) {
      drag.current = null;
      setPanning(false);
      const { dist, mid } = twoFinger();
      pinch.current = { dist, mid, view };
      return;
    }
    if (pointers.current.size === 1 && !(e.target as HTMLElement).dataset.id) {
      const p = local(e);
      drag.current = { x: p.x, y: p.y, view };
      setPanning(true);
    }
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, local(e));

    if (pinch.current && pointers.current.size === 2) {
      const { dist, mid } = twoFinger();
      const p0 = pinch.current;
      const k = clamp(p0.view.k * (dist / p0.dist), MIN_K, MAX_K);
      const s = k / p0.view.k;
      setView({
        k,
        x: mid.x - (p0.mid.x - p0.view.x) * s,
        y: mid.y - (p0.mid.y - p0.view.y) * s,
      });
      return;
    }

    if (drag.current) {
      const p = local(e);
      setView({
        k: drag.current.view.k,
        x: drag.current.view.x + (p.x - drag.current.x),
        y: drag.current.view.y + (p.y - drag.current.y),
      });
      return;
    }

    const id = (e.target as HTMLElement).dataset.id;
    const num = id ? Number(id) : null;
    setHover((h) => (h === num ? h : num));
  };

  const endPointer = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* já liberado */
    }
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      drag.current = null;
      setPanning(false);
    }
  };

  const onClickCanvas = (e: RMouseEvent<HTMLDivElement>) => {
    const id = (e.target as HTMLElement).dataset.id;
    setSelected(id ? Number(id) : null);
  };

  /* ---------- destaque do caminho selecionado ---------- */

  // O realce na tela segue o hover; o painel de detalhes segue a seleção. São
  // caminhos diferentes, e misturá-los mostrava o tabuleiro do nó errado.
  const focusId = selected ?? hover;
  const focusPath = useMemo(
    () => (layout && focusId != null ? pathToRoot(layout.byId, focusId) : []),
    [layout, focusId],
  );
  const pathIds = useMemo(() => new Set(focusPath.map((p) => p.id)), [focusPath]);

  const node = layout && selected != null ? (layout.byId.get(selected) ?? null) : null;
  const path = useMemo(
    () => (layout && selected != null ? pathToRoot(layout.byId, selected) : []),
    [layout, selected],
  );

  const r = view.k > 2 ? 7 : view.k > 0.8 ? 6 : 5;
  const showLabels = view.k >= 2.2;

  return (
    <motion.div
      className="tree-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <header className="tree-top">
        <div className="row" style={{ gap: 10 }}>
          <strong style={{ fontSize: 14 }}>Árvore de busca</strong>
          <span className="badge">{fmt(runner.stats.nodes)} nós</span>
          <span className="badge">{fmt(runner.stats.backtracks)} voltas</span>
          <span className="badge">profundidade {layout?.maxDepth ?? 0}</span>
        </div>

        <div className="row" style={{ gap: 8 }}>
          {runner.status === 'running' ? (
            <button className="btn" onClick={runner.pause}>
              <IconPause />
              Pausar
            </button>
          ) : (
            <button className="btn" onClick={runner.resume} disabled={runner.status !== 'paused'}>
              <IconPlay />
              Continuar
            </button>
          )}
          <button className="btn" onClick={runner.step} disabled={!runner.busy}>
            <IconStep />
            Passo
          </button>
          <Switch checked={follow} onChange={setFollow}>
            Acompanhar
          </Switch>
          <button className="btn icon ghost" onClick={onClose} title="Fechar (Esc)">
            <IconClose />
          </button>
        </div>
      </header>

      <div className="tree-body">
        <div
          ref={canvasRef}
          className="tree-canvas"
          data-panning={panning}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={() => setHover(null)}
          onClick={onClickCanvas}
        >
          {layout ? (
            <svg width="100%" height="100%">
              <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                {/* arestas */}
                <g>
                  {layout.placed.map(({ node: nd }) => {
                    const a = layout.pos.get(nd.id);
                    const b = layout.pos.get(nd.parent);
                    if (!a || !b) return null;
                    const onPath = pathIds.has(nd.id);
                    const solved = nd.status === 'solution';
                    return (
                      <line
                        key={`e${nd.id}`}
                        x1={b.x}
                        y1={b.y}
                        x2={a.x}
                        y2={a.y}
                        stroke={
                          onPath
                            ? '#6e8bff'
                            : solved
                              ? 'rgba(62,207,142,0.5)'
                              : 'rgba(255,255,255,0.08)'
                        }
                        strokeWidth={onPath ? 3 / view.k + 1 : solved ? 2 : 1}
                      />
                    );
                  })}
                </g>

                {/* nós */}
                <g>
                  {layout.placed.map(({ node: nd, x, y }) => {
                    const onPath = pathIds.has(nd.id);
                    return (
                      <circle
                        key={`n${nd.id}`}
                        data-id={nd.id}
                        cx={x}
                        cy={y}
                        r={nd.id === selected ? r * 1.6 : nd.status === 'solution' ? r * 1.3 : r}
                        fill={STATUS_COLOR[nd.status]}
                        stroke={onPath ? '#fff' : 'transparent'}
                        strokeWidth={onPath ? 2 / view.k + 0.6 : 0}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </g>

                {/* rótulos só quando há espaço para eles */}
                {showLabels && (
                  <g pointerEvents="none">
                    {layout.placed.map(({ node: nd, x, y }) => (
                      <text
                        key={`t${nd.id}`}
                        x={x}
                        y={y - r - 5}
                        textAnchor="middle"
                        fontSize={11}
                        fill="rgba(255,255,255,0.55)"
                      >
                        c{nd.col + 1}·l{nd.row + 1}
                      </text>
                    ))}
                  </g>
                )}
              </g>
            </svg>
          ) : (
            <div className="tree-empty">
              <p className="hint">
                Nenhum nó ainda. Rode o solver (qualquer um menos o Min-Conflicts, que é busca
                local e não constrói árvore) para a árvore aparecer aqui.
              </p>
            </div>
          )}

          <div className="tree-zoom surface">
            <button className="btn icon ghost" onClick={() => zoomCenter(1.3)} title="Aproximar (+)">
              <IconZoomIn />
            </button>
            <span>{Math.round(view.k * 100)}%</span>
            <button className="btn icon ghost" onClick={() => zoomCenter(0.77)} title="Afastar (−)">
              <IconZoomOut />
            </button>
            <button className="btn icon ghost" onClick={fit} title="Enquadrar tudo (0)">
              <IconFit />
            </button>
          </div>
        </div>

        <aside className="tree-aside">
          {node ? (
            <>
              <div className="panel-head" style={{ marginBottom: 14, paddingRight: 0 }}>
                <h2>Nó #{node.id}</h2>
                <p>{STATUS_LABEL[node.status]}</p>
              </div>

              <dl className="kv">
                <dt>Profundidade</dt>
                <dd>{node.depth}</dd>
                <dt>Decisão</dt>
                <dd>
                  coluna {node.col + 1}, linha {node.row + 1}
                </dd>
                <dt>Nós no caminho</dt>
                <dd>{path.length}</dd>
              </dl>

              <div className="field" style={{ marginTop: 16 }}>
                <label>Tabuleiro neste ponto da busca</label>
                <PathBoard n={n} path={path} current={node} />
                <p className="hint">
                  Brancas são as rainhas já fixadas pelos ancestrais; a casa marcada é a decisão
                  deste nó.
                </p>
              </div>

              <div className="field" style={{ marginTop: 16 }}>
                <label>Caminho desde a raiz</label>
                <ol className="path-list">
                  {path.map((p) => (
                    <li key={p.id} data-status={p.status}>
                      <i style={{ background: STATUS_COLOR[p.status] }} />
                      c{p.col + 1} · l{p.row + 1}
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="tree-aside-empty">
              <QueenGlyph className="ghost-glyph" />
              <p className="hint">
                Clique num nó para inspecionar: a decisão que ele representa, o caminho desde a
                raiz e como o tabuleiro estava naquele instante.
              </p>
              <p className="hint">
                <b>Roda do mouse</b> amplia, <b>arrastar</b> desloca, dois dedos ampliam no toque.
                Teclas <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd> e <kbd>Esc</kbd>.
              </p>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
