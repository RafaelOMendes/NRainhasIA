import { animate, AnimatePresence, motion, useMotionValue, type MotionValue } from 'motion/react';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as RPointerEvent,
} from 'react';
import { queenAt } from '../core/board';
import type { Queen } from '../core/types';
import { QueenGlyph } from './Icons';

const SPRING = { stiffness: 520, damping: 34, mass: 0.75 };
const DRAG_THRESHOLD = 6;

type Cell = { row: number; col: number } | null;
type Registry = (id: string, mv: { x: MotionValue<number>; y: MotionValue<number> } | null) => void;

/* ------------------------------------------------------------------ */

const Square = memo(function Square(props: {
  dark: boolean;
  heat: number;
  delay: number;
  hover: boolean;
  target: boolean;
  cursor: boolean;
  trying: boolean;
  safe: boolean;
}) {
  return (
    <div
      className="sq"
      data-dark={props.dark}
      data-hover={props.hover}
      data-target={props.target}
      data-cursor={props.cursor}
      data-try={props.trying}
      data-safe={props.safe}
      style={{ '--heat': props.heat, '--d': `${props.delay}ms` } as CSSProperties}
    />
  );
});

const QueenPiece = memo(function QueenPiece(props: {
  q: Queen;
  cell: number;
  selected: boolean;
  conflict: boolean;
  dragging: boolean;
  solving: boolean;
  register: Registry;
}) {
  const { q, cell, selected, conflict, dragging, solving, register } = props;
  // Durante o arraste o Board escreve direto nestes valores; fora dele, uma
  // mola leva a peça até a casa de destino.
  const x = useMotionValue(q.col * cell);
  const y = useMotionValue(q.row * cell);

  useEffect(() => {
    register(q.id, { x, y });
    return () => register(q.id, null);
  }, [q.id, register, x, y]);

  useLayoutEffect(() => {
    if (dragging) return;
    const ax = animate(x, q.col * cell, SPRING);
    const ay = animate(y, q.row * cell, SPRING);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [q.col, q.row, cell, dragging, x, y]);

  return (
    <motion.div
      className="queen"
      style={{ x, y, width: cell, height: cell }}
      data-selected={selected}
      data-conflict={conflict}
      data-dragging={dragging}
      data-row={q.row}
      data-col={q.col}
      initial={{ opacity: 0, scale: 0.35 }}
      animate={{ opacity: 1, scale: 1 }}
      // Durante a busca as peças entram e saem muitas vezes por segundo: uma
      // saída curta evita que rainhas desfeitas se acumulem esmaecendo na tela.
      exit={{ opacity: 0, scale: 0.35, transition: { duration: solving ? 0.11 : 0.26 } }}
      transition={{ type: 'spring', stiffness: 470, damping: 27 }}
    >
      <motion.div
        className="queen-body"
        animate={{ scale: dragging ? 1.18 : selected ? 1.07 : 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      >
        <QueenGlyph />
      </motion.div>
    </motion.div>
  );
});

/* ------------------------------------------------------------------ */

/** Superfície que o dock usa para converter coordenadas de tela em casa. */
export interface BoardHandle {
  cellAt: (clientX: number, clientY: number) => { row: number; col: number } | null;
  cell: number;
}

export interface BoardProps {
  n: number;
  queens: Queen[];
  heat: Int16Array;
  showHeat: boolean;
  conflicts: Set<string>;
  origin: { row: number; col: number } | null;
  selectedId: string | null;
  cursor: { row: number; col: number } | null;
  tryCell: { row: number; col: number } | null;
  flash: { row: number; col: number; seq: number } | null;
  safeHint: { row: number; col: number } | null;
  /** Casa destacada por um arraste vindo de fora do tabuleiro (o dock). */
  dropHover: { row: number; col: number } | null;
  solved: boolean;
  interactive: boolean;
  handleRef?: { current: BoardHandle | null };
  onMetrics?: (cell: number) => void;
  onSelect: (id: string | null) => void;
  onPlace: (row: number, col: number) => void;
  onMove: (id: string, row: number, col: number) => void;
  onRemove: (id: string) => void;
}

export function Board(props: BoardProps) {
  const {
    n,
    queens,
    heat,
    showHeat,
    conflicts,
    origin,
    selectedId,
    cursor,
    tryCell,
    flash,
    safeHint,
    dropHover,
    solved,
    interactive,
    handleRef,
    onMetrics,
    onSelect,
    onPlace,
    onMove,
    onRemove,
  } = props;

  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover] = useState<Cell>(null);

  const mvs = useRef(new Map<string, { x: MotionValue<number>; y: MotionValue<number> }>());
  const register = useCallback<Registry>((id, mv) => {
    if (mv) mvs.current.set(id, mv);
    else mvs.current.delete(id);
  }, []);

  const gesture = useRef<{
    pointerId: number;
    id: string | null;
    startX: number;
    startY: number;
    offX: number;
    offY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setSize(entries[0].contentRect.width));
    ro.observe(el);
    setSize(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const cell = size > 0 ? size / n : 0;

  const cellFrom = useCallback(
    (clientX: number, clientY: number): Cell => {
      const el = boardRef.current;
      if (!el || cell <= 0) return null;
      const r = el.getBoundingClientRect();
      const col = Math.floor((clientX - r.left) / cell);
      const row = Math.floor((clientY - r.top) / cell);
      if (col < 0 || col >= n || row < 0 || row >= n) return null;
      return { row, col };
    },
    [cell, n],
  );

  useEffect(() => {
    if (handleRef) handleRef.current = { cellAt: cellFrom, cell };
    onMetrics?.(cell);
  }, [handleRef, cellFrom, cell, onMetrics]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (!interactive || cell <= 0) return;
    const at = cellFrom(e.clientX, e.clientY);
    if (!at) return;
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();
    const q = queenAt(queens, at.row, at.col);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* alguns ponteiros (ou eventos sintéticos) não podem ser capturados */
    }
    gesture.current = {
      pointerId: e.pointerId,
      id: q?.id ?? null,
      startX: e.clientX,
      startY: e.clientY,
      offX: q ? e.clientX - (r.left + q.col * cell) : cell / 2,
      offY: q ? e.clientY - (r.top + q.row * cell) : cell / 2,
      moved: false,
    };
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const at = cellFrom(e.clientX, e.clientY);

    if (!g || g.pointerId !== e.pointerId) {
      setHover(at);
      return;
    }

    if (!g.moved) {
      const d = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
      if (d < DRAG_THRESHOLD) return;
      g.moved = true;
      if (g.id) setDragId(g.id);
    }

    if (g.id) {
      const mv = mvs.current.get(g.id);
      const r = boardRef.current!.getBoundingClientRect();
      if (mv) {
        mv.x.set(e.clientX - r.left - g.offX);
        mv.y.set(e.clientY - r.top - g.offY);
      }
    }
    setHover(at);
  };

  const finishGesture = (e: RPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    setDragId(null);
    setHover(null);
    if (!g || g.pointerId !== e.pointerId) return;
    try {
      boardRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* o ponteiro já pode ter sido liberado */
    }
    if (cancelled) return;

    const at = cellFrom(e.clientX, e.clientY);

    if (g.moved) {
      if (!g.id) return; // arrastou no vazio: nada a fazer
      if (!at) {
        onRemove(g.id); // arrastar para fora do tabuleiro remove a rainha
        return;
      }
      const occupied = queenAt(queens, at.row, at.col);
      if (occupied && occupied.id !== g.id) return; // casa ocupada: volta sozinha
      onMove(g.id, at.row, at.col);
      onSelect(null);
      return;
    }

    // Toque simples: selecionar / mover / colocar.
    if (!at) return;
    if (g.id) {
      onSelect(selectedId === g.id ? null : g.id);
      return;
    }
    if (selectedId) {
      onMove(selectedId, at.row, at.col);
      onSelect(null);
    } else {
      onPlace(at.row, at.col);
    }
  };

  const selectedQueen = useMemo(
    () => queens.find((q) => q.id === selectedId) ?? null,
    [queens, selectedId],
  );

  const squares = useMemo(() => {
    if (cell <= 0) return null;
    const out = [];
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const delay = origin
          ? Math.min(260, Math.max(Math.abs(row - origin.row), Math.abs(col - origin.col)) * 16)
          : 0;
        out.push(
          <Square
            key={`${row}-${col}`}
            dark={(row + col) % 2 === 1}
            heat={showHeat ? heat[row * n + col] : 0}
            delay={delay}
            hover={!!hover && hover.row === row && hover.col === col && !dragId}
            target={
              (!!dragId && !!hover && hover.row === row && hover.col === col) ||
              (!!dropHover && dropHover.row === row && dropHover.col === col)
            }
            cursor={!!cursor && cursor.row === row && cursor.col === col}
            trying={!!tryCell && tryCell.row === row && tryCell.col === col}
            safe={!!safeHint && safeHint.row === row && safeHint.col === col}
          />,
        );
      }
    }
    return out;
  }, [n, cell, heat, showHeat, origin, hover, dragId, cursor, tryCell, safeHint, dropHover]);

  return (
    <div
      ref={boardRef}
      className="board"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finishGesture(e, false)}
      onPointerCancel={(e) => finishGesture(e, true)}
      onPointerLeave={() => !gesture.current && setHover(null)}
      role="grid"
      aria-label={`Tabuleiro ${n} por ${n}`}
    >
      <div className="squares" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {squares}
      </div>

      {/* Linhas de ataque da rainha selecionada */}
      <AnimatePresence>
        {selectedQueen && cell > 0 && (
          <motion.svg
            className="rays"
            viewBox={`0 0 ${size} ${size}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {(() => {
              const cx = (selectedQueen.col + 0.5) * cell;
              const cy = (selectedQueen.row + 0.5) * cell;
              const L = size;
              const lines: [number, number, number, number][] = [
                [0, cy, size, cy],
                [cx, 0, cx, size],
                [cx - L, cy - L, cx + L, cy + L],
                [cx - L, cy + L, cx + L, cy - L],
              ];
              return lines.map(([x1, y1, x2, y2], i) => (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(110,139,255,0.4)"
                  strokeWidth={1.5}
                  strokeDasharray="4 7"
                />
              ));
            })()}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Estouro vermelho quando o solver rejeita uma casa */}
      <AnimatePresence>
        {flash && cell > 0 && (
          <motion.div
            key={flash.seq}
            className="reject-flash"
            style={{
              left: flash.col * cell,
              top: flash.row * cell,
              width: cell,
              height: cell,
            }}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <div className="queen-layer">
        {cell > 0 && (
          <AnimatePresence>
            {queens.map((q) => (
              <QueenPiece
                key={q.id}
                q={q}
                cell={cell}
                selected={q.id === selectedId}
                conflict={conflicts.has(q.id)}
                dragging={q.id === dragId}
                solving={!interactive}
                register={register}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pulso de vitória */}
      <AnimatePresence>
        {solved && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 5,
              background:
                'radial-gradient(circle at 50% 50%, rgba(62,207,142,0.28), transparent 62%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
