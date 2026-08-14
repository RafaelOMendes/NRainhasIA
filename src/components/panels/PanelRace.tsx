import { motion } from 'motion/react';
import { SOLVERS } from '../../core/solvers';
import type { Assignment, RaceResult } from '../../core/types';
import type { RaceApi } from '../../hooks/useRace';
import { IconBolt } from '../Icons';
import { fmt, fmtMs, PanelHead, Segmented } from '../ui';

type Metric = 'ms' | 'nodes' | 'backtracks';

export interface PanelRaceProps {
  n: number;
  setN: (n: number) => void;
  race: RaceApi;
  metric: Metric;
  setMetric: (m: Metric) => void;
  onRun: () => void;
  onApply: (sol: Assignment) => void;
}

const SIZES = ['8', '12', '16', '20'] as const;

const value = (r: RaceResult, m: Metric) =>
  m === 'ms' ? r.ms : m === 'nodes' ? r.nodes : r.backtracks;

export function PanelRace(p: PanelRaceProps) {
  const { results } = p.race;
  const max = Math.max(1, ...results.map((r) => value(r, p.metric)));

  return (
    <>
      <PanelHead
        title="Corrida de algoritmos"
        subtitle="Os quatro solvers resolvem o mesmo tabuleiro do zero, num Web Worker. Teto de 6 s cada — quem estourar aparece marcado."
        right={
          <>
            <Segmented
              id="race-n"
              value={String(p.n) as (typeof SIZES)[number]}
              onChange={(v) => p.setN(Number(v))}
              options={SIZES.map((s) => ({ value: s, label: `N=${s}` }))}
            />
            <Segmented
              id="metric"
              value={p.metric}
              onChange={p.setMetric}
              options={[
                { value: 'ms', label: 'Tempo' },
                { value: 'nodes', label: 'Nós' },
                { value: 'backtracks', label: 'Voltas' },
              ]}
            />
            <button className="btn primary wide" onClick={p.onRun} disabled={p.race.running}>
              <IconBolt />
              {p.race.running ? 'Correndo…' : `Correr em N=${p.n}`}
            </button>
          </>
        }
      />

      {p.race.error && <div className="notice">{p.race.error}</div>}

      <div className="col" style={{ gap: 14 }}>
        {SOLVERS.map((s) => {
          const r = results.find((x) => x.id === s.id);
          const pct = r ? Math.max(2, (value(r, p.metric) / max) * 100) : 0;
          return (
            <div className="race-row" key={s.id}>
              <div className="race-head">
                <span>
                  <i style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="race-val">
                  {r
                    ? p.metric === 'ms'
                      ? fmtMs(r.ms)
                      : fmt(value(r, p.metric))
                    : p.race.running
                      ? '…'
                      : '—'}
                </span>
              </div>
              <div className="race-track">
                <motion.div
                  className="race-bar"
                  style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}80)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                />
              </div>
              {r && (
                <div className="race-sub">
                  <span>
                    {fmt(r.nodes)} nós · {fmt(r.backtracks)} voltas
                    {r.moves > 0 && ` · ${fmt(r.moves)} mov.`}
                    {r.restarts > 0 && ` · ${r.restarts} reinícios`}
                    {r.timedOut && ' · estourou o tempo'}
                  </span>
                  {r.solution && (
                    <button
                      onClick={() => p.onApply(r.solution!)}
                      style={{ color: 'var(--accent)', fontSize: 11 }}
                    >
                      ver no tabuleiro
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="hint" style={{ marginTop: 16 }}>
        Em N=8 tudo termina em menos de um milissegundo — a diferença entre as estratégias só
        aparece de verdade a partir de N=16. Os tempos incluem a instrumentação (todo solver emite
        eventos), então a métrica mais honesta é <b>nós expandidos</b>: quantas hipóteses cada
        estratégia precisou levantar.
      </p>
    </>
  );
}
