import { N_MAX, N_MIN } from '../../core/types';
import { IconRedo, IconTrash, IconUndo } from '../Icons';
import { PanelHead, Switch } from '../ui';

export interface PanelBoardProps {
  n: number;
  setN: (n: number) => void;
  queenCount: number;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  showHeat: boolean;
  setShowHeat: (v: boolean) => void;
  perf: boolean;
  setPerf: (v: boolean) => void;
  disabled: boolean;
}

export function PanelBoard(p: PanelBoardProps) {
  return (
    <>
      <PanelHead
        title="Tabuleiro"
        subtitle={`${p.queenCount} de ${p.n} rainhas posicionadas`}
        right={
          <>
            <button className="btn icon" onClick={p.onUndo} disabled={!p.canUndo} title="Desfazer (Ctrl+Z)">
              <IconUndo />
            </button>
            <button className="btn icon" onClick={p.onRedo} disabled={!p.canRedo} title="Refazer (Ctrl+Shift+Z)">
              <IconRedo />
            </button>
            <button className="btn ghost danger" onClick={p.onClear} disabled={p.queenCount === 0}>
              <IconTrash />
              Limpar
            </button>
          </>
        }
      />

      <div className="col" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="n-range">
            Tamanho do tabuleiro — N = {p.n} ({p.n}×{p.n})
          </label>
          <div className="row">
            <input
              id="n-range"
              type="range"
              min={N_MIN}
              max={N_MAX}
              value={p.n}
              disabled={p.disabled}
              onChange={(e) => p.setN(Number(e.target.value))}
              className="grow"
            />
            <div className="row" style={{ gap: 6 }}>
              {[6, 8, 10, 12].map((v) => (
                <button
                  key={v}
                  className="btn ghost"
                  style={{ padding: '6px 11px' }}
                  disabled={p.disabled}
                  onClick={() => p.setN(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="row spread">
          <Switch checked={p.showHeat} onChange={p.setShowHeat}>
            Heatmap de ameaças
          </Switch>
          <Switch checked={p.perf} onChange={p.setPerf}>
            Modo performance (desliga o desfoque)
          </Switch>
        </div>

        <p className="hint">
          <b>Arraste</b> uma rainha para movê-la, ou <b>clique nela e clique no destino</b> — os dois
          gestos funcionam. Arraste para fora do tabuleiro para remover. Teclado:{' '}
          <kbd>←↑→↓</kbd> move o cursor, <kbd>Enter</kbd> coloca ou pega, <kbd>Delete</kbd> remove,{' '}
          <kbd>Esc</kbd> desmarca, <kbd>Ctrl+Z</kbd> desfaz.
        </p>
      </div>
    </>
  );
}
