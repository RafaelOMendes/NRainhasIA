import { motion, useMotionValue } from 'motion/react';
import { useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { QueenGlyph } from './Icons';

export interface QueenTrayProps {
  remaining: number;
  /** Lado da casa do tabuleiro, para a peça arrastada já sair no tamanho certo. */
  cell: number;
  onHover: (x: number | null, y?: number) => void;
  onDrop: (x: number, y: number) => void;
}

/**
 * Reservatório de rainhas do dock: a origem do arraste. Puxe uma peça daqui e
 * solte numa casa. A peça fantasma vai num portal para não ser recortada pelo dock.
 */
export function QueenTray({ remaining, cell, onHover, onDrop }: QueenTrayProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const size = Math.round(Math.max(44, Math.min(cell || 56, 84)));
  const empty = remaining <= 0;

  const track = (e: RPointerEvent<HTMLDivElement>) => {
    x.set(e.clientX - size / 2);
    y.set(e.clientY - size / 2);
  };

  const down = (e: RPointerEvent<HTMLDivElement>) => {
    if (empty) return;
    pointer.current = e.pointerId;
    try {
      ref.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ponteiros sintéticos não podem ser capturados */
    }
    track(e);
    setDragging(true);
    onHover(e.clientX, e.clientY);
  };

  const move = (e: RPointerEvent<HTMLDivElement>) => {
    if (pointer.current !== e.pointerId) return;
    track(e);
    onHover(e.clientX, e.clientY);
  };

  const end = (e: RPointerEvent<HTMLDivElement>, drop: boolean) => {
    if (pointer.current !== e.pointerId) return;
    pointer.current = null;
    setDragging(false);
    onHover(null);
    if (drop) onDrop(e.clientX, e.clientY);
  };

  return (
    <div className="tray">
      <div
        ref={ref}
        className="tray-stack"
        data-empty={empty}
        data-dragging={dragging}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={(e) => end(e, true)}
        onPointerCancel={(e) => end(e, false)}
        title={empty ? 'Todas as rainhas já estão no tabuleiro' : 'Arraste uma rainha para o tabuleiro'}
        role="button"
        aria-label={`${remaining} rainhas disponíveis — arraste para o tabuleiro`}
      >
        {remaining > 2 && (
          <div className="tray-piece shadow-piece" style={{ transform: 'translate(4px, -4px) scale(0.92)' }}>
            <QueenGlyph />
          </div>
        )}
        {remaining > 1 && (
          <div className="tray-piece shadow-piece" style={{ transform: 'translate(2px, -2px) scale(0.96)' }}>
            <QueenGlyph />
          </div>
        )}
        <motion.div className="tray-piece" animate={{ scale: dragging ? 0.86 : 1, opacity: dragging ? 0.4 : 1 }}>
          <QueenGlyph />
        </motion.div>
      </div>

      <div className="tray-count">
        <b>{remaining}</b>
        {remaining === 1 ? 'restante' : 'restantes'}
      </div>

      {dragging &&
        createPortal(
          <motion.div
            className="drag-ghost"
            style={{ x, y, width: size, height: size }}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          >
            <div className="tray-piece">
              <QueenGlyph />
            </div>
          </motion.div>,
          document.body,
        )}
    </div>
  );
}
