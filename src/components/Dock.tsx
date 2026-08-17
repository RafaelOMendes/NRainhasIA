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
  const scrub = useRef<{ pointerId: number; movedAway: boolean; startedOn: PanelId | null } | null>(
    null,
  );
  const lastPointerUp = useRef(0);

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
    scrub.current = {
      pointerId: e.pointerId,
      movedAway: false,
      startedOn: idAt(e.clientX, e.clientY),
    };
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

  /*
    A troca acontece aqui, não no clique: com captura de ponteiro o navegador
    entrega o `click` ao <nav> que capturou, e não ao botão — então o onClick do
    botão simplesmente não dispara para o mouse. Era esse o bug de "só volta se
    arrastar": um clique parado não produzia evento nenhum.
  */
  const onPointerUp = (e: RPointerEvent<HTMLElement>) => {
    const s = scrub.current;
    if (!s || s.pointerId !== e.pointerId) return;
    scrub.current = null;
    try {
      navRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* já liberado */
    }
    lastPointerUp.current = performance.now();
    if (s.movedAway) return; // o arraste já escolheu a aba
    const at = idAt(e.clientX, e.clientY) ?? s.startedOn;
    if (at) onChange(active === at ? null : at);
  };

  /*
    Caminho do teclado (Enter/Espaço geram um clique sem ponteiro). A janela de
    tempo ignora o clique sintético que alguns navegadores ainda entregam ao
    botão logo após o pointerup, evitando alternar duas vezes.
  */
  const onClick = (id: PanelId) => {
    if (performance.now() - lastPointerUp.current < 500) return;
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
