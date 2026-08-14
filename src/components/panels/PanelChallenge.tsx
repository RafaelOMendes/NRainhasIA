import type { ChallengeApi } from '../../hooks/useChallenge';
import { IconClock, IconLightbulb, IconStop } from '../Icons';
import { fmtClock, fmtMs, PanelHead, Stat } from '../ui';

export interface PanelChallengeProps {
  n: number;
  challenge: ChallengeApi;
  onStart: () => void;
  onHint: () => void;
  hintBusy: boolean;
  placed: number;
  conflicts: number;
}

export function PanelChallenge(p: PanelChallengeProps) {
  const c = p.challenge;
  const record = c.records[String(p.n)];

  return (
    <>
      <PanelHead
        title="Modo desafio"
        subtitle={`Posicione as ${p.n} rainhas sem nenhum ataque, no menor tempo possível.`}
        right={
          record && (
            <span className="badge">
              Recorde N={p.n}: {record.score} pts · {fmtMs(record.ms)}
            </span>
          )
        }
      />

      {c.result && (
        <div className={`notice ${c.result.best ? 'ok' : ''}`} style={{ marginBottom: 12 }}>
          {c.result.best ? '🏆 Novo recorde! ' : 'Resolvido! '}
          {c.result.score} pontos em {fmtMs(c.result.ms)} com {c.result.hints}{' '}
          {c.result.hints === 1 ? 'dica' : 'dicas'}.
        </div>
      )}

      {c.active ? (
        <div className="col" style={{ gap: 14 }}>
          <div>
            <span className="hint">Tempo</span>
            <div className="timer">{fmtClock(c.elapsed)}</div>
          </div>
          <div className="stats">
            <Stat label="Rainhas" value={`${p.placed}/${p.n}`} />
            <Stat label="Conflitos" value={p.conflicts} />
            <Stat label="Dicas" value={c.hints} />
          </div>
          <div className="row">
            <button className="btn grow" onClick={p.onHint} disabled={p.hintBusy}>
              <IconLightbulb />
              {p.hintBusy ? 'Pensando…' : 'Dica (−45 pts)'}
            </button>
            <button className="btn ghost danger" onClick={c.abandon}>
              <IconStop />
              Desistir
            </button>
          </div>
        </div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          <button className="btn primary wide" onClick={p.onStart}>
            <IconClock />
            Começar desafio N={p.n}
          </button>
          <span className="hint">O tabuleiro é limpo e o cronômetro dispara.</span>
          <p className="hint">
            A pontuação cresce com o tamanho do tabuleiro e cai com o
            tempo; cada dica custa 45 pontos. A dica confere se o que você montou ainda fecha e, se
            fechar, acende de verde uma casa que faz parte de uma solução — se não fechar, ela avisa.
            Os recordes ficam salvos neste navegador.
          </p>
        </div>
      )}
    </>
  );
}
