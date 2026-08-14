import { makeSolver, checkFixed } from '../core/solvers';
import { buildSolutionSet } from '../core/solutions';
import type { Assignment, RaceResult, SolverId } from '../core/types';
import type { WorkerRequest, WorkerResponse } from './protocol';

const send = (msg: WorkerResponse, transfer?: Transferable[]) => {
  // Em worker o `postMessage` global aceita (mensagem, transferíveis).
  (postMessage as (m: unknown, t?: Transferable[]) => void)(msg, transfer);
};

/** Roda um solver até a primeira solução, contando eventos e respeitando um teto de tempo. */
function runToEnd(id: SolverId, n: number, fixed: Assignment, timeoutMs: number): RaceResult {
  const gen = makeSolver(id, n, fixed);
  const res: RaceResult = {
    id,
    nodes: 0,
    backtracks: 0,
    rejects: 0,
    moves: 0,
    restarts: 0,
    steps: 0,
    ms: 0,
    solution: null,
    timedOut: false,
  };

  const t0 = performance.now();
  let i = 0;
  for (const e of gen) {
    res.steps++;
    switch (e.t) {
      case 'try':
        res.nodes++;
        break;
      case 'undo':
        res.backtracks++;
        break;
      case 'reject':
        res.rejects++;
        break;
      case 'move':
        res.moves++;
        break;
      case 'restart':
        res.restarts++;
        break;
      case 'solution':
        res.solution = e.assignment;
        break;
      default:
        break;
    }
    if (res.solution) break;
    if ((++i & 0x3fff) === 0 && performance.now() - t0 > timeoutMs) {
      res.timedOut = true;
      break;
    }
  }
  res.ms = performance.now() - t0;
  return res;
}

addEventListener('message', (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    switch (req.cmd) {
      case 'race': {
        for (const id of req.ids) {
          send({ id: req.id, type: 'race-progress', result: runToEnd(id, req.n, req.fixed, req.timeoutMs) });
        }
        send({ id: req.id, type: 'race-done' });
        break;
      }

      case 'complete': {
        const clash = checkFixed(req.n, req.fixed);
        if (clash) {
          send({ id: req.id, type: 'complete', solution: null, error: clash });
          break;
        }
        // MRV é o mais rápido para decidir se a configuração parcial fecha.
        const r = runToEnd('mrv', req.n, req.fixed, 8000);
        send({
          id: req.id,
          type: 'complete',
          solution: r.solution,
          error: r.solution
            ? null
            : r.timedOut
              ? 'A busca passou de 8 segundos sem concluir.'
              : 'Nenhuma solução completa essas rainhas. Alguma delas precisa sair.',
        });
        break;
      }

      case 'enumerate': {
        const set = buildSolutionSet(req.n, req.limit);
        const packed = new Uint8Array(set.all.length * req.n);
        for (let i = 0; i < set.all.length; i++) {
          packed.set(set.all[i], i * req.n);
        }
        const fundamental = Uint32Array.from(set.fundamental);
        send(
          {
            id: req.id,
            type: 'enumerate',
            n: req.n,
            count: set.all.length,
            packed,
            fundamental,
            truncated: set.all.length >= req.limit,
          },
          [packed.buffer, fundamental.buffer],
        );
        break;
      }
    }
  } catch (err) {
    send({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
});
