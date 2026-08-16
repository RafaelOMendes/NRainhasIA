import { motion } from 'motion/react';
import { useRef, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { IconBolt, IconClock, IconGrid, IconPlay, IconSparkle, IconTree } from './Icons';
import { QueenTray, type QueenTrayProps } from './QueenTray';

export type PanelId = 'board' | 'solver' | 'race' | 'tree' | 'solutions' | 'challenge';

const ITEMS: { id: PanelId; label: string; Icon: (p: { className?: string }) => ReactNode }[] = [
  { id: 'board', label: 'Tabuleiro', Icon: IconGrid },
  { id: 'solver', label: 'Solver', Icon: IconPlay },
  { id: 'race', label: 'Corrida', Icon: IconBolt },
  { id: 'tree', label: 'Árvore', Icon: IconTree },
  { id: 'solutions', label: 'Soluções', Icon: IconSparkle },
  { id: 'challenge', label: 'Desafio', Icon: IconClock },
];

/** Folga vertical para o dedo não precisar ficar preso na altura do botão. */
const SCRUB_SLOP = 26;

export function Dock({
  active,
  onChange,
  tray,
}: {
  active: PanelId | null;
  onChange: (id: PanelId | null) => void;
  tray: QueenTrayProps;
}) {
  const navRef = useRef<HTMLElement>(null);
  const buttons = useRef(new Map<PanelId, HTMLButtonElement>());
  const scrub = useRef<{ pointerId: number; movedAway: boolean } | null>(null);
  /* Depois de arrastar, o navegador ainda dispara um clique no botão de origem —
     este sinalizador impede que esse clique desfaça a aba escolhida no arraste. */
  const swallowClick = useRef(false);

  const idAt = (x: number, y: number): PanelId | null => {
    for (const [id, el] of buttons.current) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top - SCRUB_SLOP && y <= r.bottom + SCRUB_SLOP) {
        return id;
      }
    }
    return null;
  };

  const onPointerDown = (e: RPointerEvent<HTMLElement>) => {
    // O reservatório de rainhas tem o arraste dele; não é alvo de troca de aba.
    if (!(e.target as HTMLElement).closest('.dock-btn')) return;
    scrub.current = { pointerId: e.pointerId, movedAway: false };
    try {
      navRef.current?.setPointerCapture(e.pointerId);
    } catch {
      /* ponteiros sintéticos não podem ser capturados */
    }
  };

  const onPointerMove = (e: RPointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const over = idAt(e.clientX, e.clientY);
    if (!over || over === active) return;
    s.movedAway = true;
    onChange(over);
  };

  const onPointerUp = (e: RPointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s || s.pointerId !== e.pointerId) return;
    scrub.current = null;
    if (s.movedAway) swallowClick.current = true;
    try {
      navRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* já liberado */
    }
  };

  /* O clique continua sendo o caminho do toque simples e do teclado. */
  const onClick = (id: PanelId) => {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    onChange(active === id ? null : id);
  };

  return (
    <div className="dock-wrap">
      <motion.nav
        ref={navRef}
        className="surface dock"
        aria-label="Ferramentas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <QueenTray {...tray} />

        <div className="dock-sep" />

        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            ref={(el) => {
              if (el) buttons.current.set(id, el);
              else buttons.current.delete(id);
            }}
            className="dock-btn"
            data-active={active === id}
            onClick={() => onClick(id)}
            aria-pressed={active === id}
          >
            {active === id && (
              <motion.span
                layoutId="dock-pill"
                className="dock-pill"
                transition={{ type: 'spring', stiffness: 480, damping: 38 }}
              />
            )}
            <Icon />
            {label}
          </button>
        ))}
      </motion.nav>
    </div>
  );
}
