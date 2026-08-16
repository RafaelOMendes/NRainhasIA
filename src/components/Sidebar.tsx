import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';
import type { PanelId } from './Dock';
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
          className="surface sidebar"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 380, damping: 36, mass: 0.8 }}
        >
          <button className="btn icon ghost side-close" onClick={onClose} title="Fechar (Esc)">
            <IconClose />
          </button>

          <div className="side-scroll">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
