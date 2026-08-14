import { motion, useMotionValue } from 'motion/react';
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { GlassLayers } from './Glass';
import {
  IconBolt,
  IconClock,
  IconGrid,
  IconGrip,
  IconPlay,
  IconSparkle,
  IconTree,
} from './Icons';
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

const POS_KEY = 'nrainhas.dock-pos';

export function Dock({
  active,
  onChange,
  tray,
}: {
  active: PanelId | null;
  onChange: (id: PanelId | null) => void;
  tray: QueenTrayProps;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [moving, setMoving] = useState(false);
  const grab = useRef<{ id: number; ox: number; oy: number } | null>(null);

  // Posição escolhida pelo usuário sobrevive ao recarregar.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { x: number; y: number };
      x.set(p.x ?? 0);
      y.set(p.y ?? 0);
    } catch {
      /* localStorage pode estar bloqueado */
    }
  }, [x, y]);

  /** Mantém o dock dentro da janela, com uma folga de 12px. */
  const clamp = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = x.get();
    const cy = y.get();
    // Posição de repouso (sem o deslocamento aplicado).
    const restLeft = r.left - cx;
    const restTop = r.top - cy;
    const minX = 12 - restLeft;
    const maxX = window.innerWidth - 12 - r.width - restLeft;
    const minY = 12 - restTop;
    const maxY = window.innerHeight - 12 - r.height - restTop;
    x.set(Math.min(Math.max(cx, minX), Math.max(minX, maxX)));
    y.set(Math.min(Math.max(cy, minY), Math.max(minY, maxY)));
  };

  const save = () => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }));
    } catch {
      /* ignora */
    }
  };

  useEffect(() => {
    const onResize = () => clamp();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // `clamp` só usa refs e motion values, que são estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gripDown = (e: RPointerEvent<HTMLDivElement>) => {
    grab.current = { id: e.pointerId, ox: e.clientX - x.get(), oy: e.clientY - y.get() };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignora */
    }
    setMoving(true);
  };

  const gripMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g || g.id !== e.pointerId) return;
    x.set(e.clientX - g.ox);
    y.set(e.clientY - g.oy);
  };

  const gripUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (grab.current?.id !== e.pointerId) return;
    grab.current = null;
    setMoving(false);
    clamp();
    save();
  };

  const reset = () => {
    x.set(0);
    y.set(0);
    save();
  };

  return (
    <motion.div ref={wrapRef} className="dock-wrap" style={{ x, y }}>
      <motion.nav
        className="glass dock"
        aria-label="Ferramentas"
        animate={{ scale: moving ? 1.03 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <GlassLayers />

        <div
          className="dock-grip"
          data-dragging={moving}
          onPointerDown={gripDown}
          onPointerMove={gripMove}
          onPointerUp={gripUp}
          onPointerCancel={gripUp}
          onDoubleClick={reset}
          title="Arraste para mover o menu · duplo clique volta ao centro"
          role="button"
          aria-label="Mover o menu"
        >
          <IconGrip />
        </div>

        <QueenTray {...tray} />

        <div className="dock-sep" />

        {ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className="dock-btn"
            data-active={active === id}
            onClick={() => onChange(active === id ? null : id)}
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
    </motion.div>
  );
}
