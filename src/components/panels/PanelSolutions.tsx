import { SYMMETRY_NAMES, SYMMETRY_SHORT, transform } from '../../core/solutions';
import type { Assignment } from '../../core/types';
import { N_ENUM_MAX } from '../../core/types';
import type { SolutionsApi } from '../../hooks/useSolutions';
import { IconSparkle } from '../Icons';
import { PanelHead, Stat, Switch } from '../ui';

const PAGE = 60;

function Thumb({ sol, n }: { sol: Assignment; n: number }) {
  return (
    <svg viewBox={`0 0 ${n} ${n}`} aria-hidden>
      {Array.from({ length: n * n }, (_, i) => {
        const r = Math.floor(i / n);
        const c = i % n;
        return (r + c) % 2 === 1 ? (
          <rect key={i} x={c} y={r} width={1} height={1} fill="rgba(255,255,255,0.06)" />
        ) : null;
      })}
      {sol.map((r, c) => (
        <circle key={c} cx={c + 0.5} cy={r + 0.5} r={0.29} fill="#8aa1ff" />
      ))}
    </svg>
  );
}

export interface PanelSolutionsProps {
  n: number;
  sol: SolutionsApi;
  onLoad: () => void;
  onApply: (a: Assignment) => void;
}

export function PanelSolutions(p: PanelSolutionsProps) {
  const { sol, n } = p;
  const data = sol.data;

  if (n > N_ENUM_MAX) {
    return (
      <>
        <PanelHead title="Navegador de soluções" />
        <div className="notice">
          A enumeração completa está limitada a N ≤ {N_ENUM_MAX}. Em N={n} o número de soluções
          explode (N=16 já passa de 14 milhões) e não caberia na memória do navegador.
        </div>
      </>
    );
  }

  if (!data || data.n !== n) {
    return (
      <>
        <PanelHead
          title="Navegador de soluções"
          subtitle={`Enumera todas as soluções de N=${n} e agrupa as que são a mesma coisa girada ou espelhada.`}
        />
        {sol.error && <div className="notice">{sol.error}</div>}
        <button className="btn primary" onClick={p.onLoad} disabled={sol.loading}>
          <IconSparkle />
          {sol.loading ? 'Enumerando…' : `Enumerar soluções de N=${n}`}
        </button>
      </>
    );
  }

  const visible = sol.visible;
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const page = Math.min(sol.page, pages - 1);
  const slice = visible.slice(page * PAGE, page * PAGE + PAGE);

  return (
    <>
      <PanelHead
        title={`Soluções de N=${n}`}
        subtitle="Clique numa miniatura para levá-la ao tabuleiro; as simetrias transformam a solução escolhida."
        right={
          <Switch checked={sol.onlyFundamental} onChange={(v) => { sol.setOnlyFundamental(v); sol.setPage(0); }}>
            Só fundamentais
          </Switch>
        }
      />

      <div className="stats" style={{ marginBottom: 12 }}>
        <Stat label="Soluções" value={data.count.toLocaleString('pt-BR')} />
        <Stat label="Fundamentais" value={data.fundamental.length.toLocaleString('pt-BR')} />
        <Stat label="Exibindo" value={visible.length.toLocaleString('pt-BR')} />
        <Stat label="Solução atual" value={`#${sol.index + 1}`} />
      </div>

      <div className="field" style={{ marginBottom: 12 }}>
        <label>Simetria aplicada</label>
        <div className="row" style={{ gap: 5 }}>
          {SYMMETRY_SHORT.map((short, k) => (
            <button
              key={short}
              className="btn ghost"
              title={SYMMETRY_NAMES[k]}
              style={{
                padding: '5px 0',
                minWidth: 36,
                fontSize: 12,
                ...(sol.symmetry === k
                  ? {
                      background: 'rgba(122,162,255,0.24)',
                      boxShadow: 'inset 0 0 0 1px rgba(122,162,255,0.65)',
                    }
                  : null),
              }}
              onClick={() => {
                sol.setSymmetry(k);
                const base = data.solutions[sol.index];
                if (base) p.onApply(transform(base, k));
              }}
            >
              {short}
            </button>
          ))}
        </div>
      </div>

      <div className="sol-grid">
        {slice.map((i) => (
          <button
            key={i}
            className="sol-thumb"
            data-active={i === sol.index}
            onClick={() => {
              sol.setIndex(i);
              sol.setSymmetry(0);
              p.onApply(data.solutions[i]);
            }}
            title={`Solução #${i + 1}`}
          >
            <Thumb sol={data.solutions[i]} n={n} />
          </button>
        ))}
      </div>

      {pages > 1 && (
        <div className="row spread" style={{ marginTop: 12 }}>
          <button className="btn ghost" onClick={() => sol.setPage(Math.max(0, page - 1))} disabled={page === 0}>
            ← Anteriores
          </button>
          <span className="hint">
            Página {page + 1} de {pages}
          </span>
          <button
            className="btn ghost"
            onClick={() => sol.setPage(Math.min(pages - 1, page + 1))}
            disabled={page >= pages - 1}
          >
            Próximas →
          </button>
        </div>
      )}

      {data.truncated && (
        <p className="hint" style={{ marginTop: 10 }}>
          A lista foi truncada no limite de segurança do enumerador.
        </p>
      )}
    </>
  );
}
