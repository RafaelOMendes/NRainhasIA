import { SOLVERS, solverMeta } from '../../core/solvers';
import type { SolverId } from '../../core/types';
import type { Runner } from '../../hooks/useSolverRunner';
import { speedToSps, TURBO } from '../../hooks/useSolverRunner';
import { IconPause, IconPlay, IconStep, IconStop, IconWand } from '../Icons';
import { fmt, fmtMs, PanelHead, Segmented, Stat, Switch } from '../ui';

export interface PanelSolverProps {
  algo: SolverId;
  setAlgo: (v: SolverId) => void;
  fromHere: boolean;
  setFromHere: (v: boolean) => void;
  runner: Runner;
  notice: string | null;
  onStart: () => void;
  onStep: () => void;
  onInstant: () => void;
  instantBusy: boolean;
}

const STATUS: Record<string, string> = {
  idle: 'parado',
  running: 'buscando',
  paused: 'pausado',
  solved: 'resolvido',
  failed: 'sem solução',
};

export function PanelSolver(p: PanelSolverProps) {
  const { runner } = p;
  const meta = solverMeta(p.algo);
  const sps = runner.speed >= TURBO ? null : speedToSps(runner.speed);

  return (
    <>
      <PanelHead
        title="Solver animado"
        subtitle={meta.blurb}
        right={<span className="badge">{STATUS[runner.status]}</span>}
      />

      <div className="col" style={{ gap: 16 }}>
        <div className="field">
          <label>Algoritmo</label>
          <Segmented
            id="algo"
            value={p.algo}
            onChange={p.setAlgo}
            options={SOLVERS.map((s) => ({ value: s.id, label: s.name }))}
            stack
          />
        </div>

        <Switch checked={p.fromHere} onChange={p.setFromHere}>
          Partir das rainhas que já estão no tabuleiro
        </Switch>

        {p.notice && <div className="notice">{p.notice}</div>}

        <div className="field">
          <label htmlFor="speed">
            Velocidade —{' '}
            {sps === null
              ? 'turbo'
              : `${sps < 10 ? sps.toFixed(1) : Math.round(sps)} passos/s`}
          </label>
          <input
            id="speed"
            type="range"
            min={0}
            max={TURBO}
            value={runner.speed}
            onChange={(e) => runner.setSpeed(Number(e.target.value))}
          />
        </div>

        <div className="row">
          {runner.status === 'running' ? (
            <button className="btn primary grow" onClick={runner.pause}>
              <IconPause />
              Pausar
            </button>
          ) : runner.status === 'paused' ? (
            <button className="btn primary grow" onClick={runner.resume}>
              <IconPlay />
              Continuar
            </button>
          ) : (
            <button className="btn primary grow" onClick={p.onStart}>
              <IconPlay />
              Iniciar busca
            </button>
          )}
          <button
            className="btn"
            onClick={p.onStep}
            disabled={runner.status === 'solved' || runner.status === 'failed'}
            title="Avança um evento da busca (inicia se estiver parado)"
          >
            <IconStep />
            Passo
          </button>
          <button className="btn ghost icon" onClick={runner.stop} disabled={runner.status === 'idle'} title="Parar">
            <IconStop />
          </button>
        </div>

        <div className="col" style={{ gap: 6 }}>
          <button className="btn ok wide" onClick={p.onInstant} disabled={p.instantBusy}>
            <IconWand />
            {p.instantBusy ? 'Calculando…' : 'Resolver agora'}
          </button>
          <p className="hint">
            Resolve no worker e mostra o resultado pronto, completando o que você já pôs no
            tabuleiro — ou avisa se aquela configuração não fecha.
          </p>
        </div>

        <div className="stats">
          <Stat label="Nós" value={fmt(runner.stats.nodes)} />
          <Stat label="Voltas" value={fmt(runner.stats.backtracks)} />
          {p.algo === 'min-conflicts' ? (
            <>
              <Stat label="Movimentos" value={fmt(runner.stats.moves)} />
              <Stat label="Reinícios" value={fmt(runner.stats.restarts)} />
            </>
          ) : (
            <>
              <Stat label="Rejeições" value={fmt(runner.stats.rejects)} />
              <Stat label="Passos" value={fmt(runner.stats.steps)} />
            </>
          )}
          <Stat label="Tempo" value={fmtMs(runner.stats.ms)} />
        </div>
      </div>
    </>
  );
}
