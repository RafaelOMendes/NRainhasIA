import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { PanelId } from './Dock';
import { GlassLayers } from './Glass';
import { IconClose } from './Icons';

/**
 * Menu lateral direito. O contêiner entra e sai com AnimatePresence; a troca de
 * conteúdo entre abas é feita por `key`, com uma entrada curta e sem espera —
 * assim nenhuma aba fica presa atrás da saída da anterior.
 */
export function Sidebar({
  active,
  onClose,
  children,
}: {
  active: PanelId | null;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {active && (
        <motion.aside
          className="glass sidebar"
          initial={{ opacity: 0, x: 44, filter: 'blur(18px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 44, filter: 'blur(18px)' }}
          transition={{ type: 'spring', stiffness: 330, damping: 34, mass: 0.85 }}
        >
          <GlassLayers />

          <button className="btn icon ghost side-close" onClick={onClose} title="Fechar (Esc)">
            <IconClose />
          </button>

          <div className="side-scroll">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
