import { useCallback, useEffect, useRef } from 'react';
import type { Assignment, RaceResult, SolverId } from '../core/types';
import type { WorkerRequest, WorkerResponse } from '../workers/protocol';

export interface EnumerateResult {
  n: number;
  count: number;
  solutions: Assignment[];
  fundamental: number[];
  truncated: boolean;
}

/** `Omit` sobre união colapsa nas chaves comuns; esta versão distribui por membro. */
type RequestBody = WorkerRequest extends infer T
  ? T extends { id: number }
    ? Omit<T, 'id'>
    : never
  : never;

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  onProgress?: (r: RaceResult) => void;
  bucket: RaceResult[];
}

/**
 * Um único worker para todo o trabalho pesado: a corrida entre algoritmos,
 * o "resolver a partir daqui" e a enumeração completa de soluções.
 */
export function useSolverWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const seq = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = w;

    w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      const p = pending.current.get(msg.id);
      if (!p) return;

      switch (msg.type) {
        case 'race-progress':
          p.bucket.push(msg.result);
          p.onProgress?.(msg.result);
          break;
        case 'race-done':
          pending.current.delete(msg.id);
          p.resolve(p.bucket);
          break;
        case 'complete':
          pending.current.delete(msg.id);
          p.resolve({ solution: msg.solution, error: msg.error });
          break;
        case 'enumerate': {
          pending.current.delete(msg.id);
          const solutions: Assignment[] = [];
          for (let i = 0; i < msg.count; i++) {
            solutions.push(Array.from(msg.packed.subarray(i * msg.n, (i + 1) * msg.n)));
          }
          p.resolve({
            n: msg.n,
            count: msg.count,
            solutions,
            fundamental: Array.from(msg.fundamental),
            truncated: msg.truncated,
          } satisfies EnumerateResult);
          break;
        }
        case 'error':
          pending.current.delete(msg.id);
          p.reject(new Error(msg.message));
          break;
      }
    };

    return () => {
      w.terminate();
      workerRef.current = null;
      pending.current.clear();
    };
  }, []);

  const request = useCallback(
    <T,>(payload: RequestBody, onProgress?: (r: RaceResult) => void): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const w = workerRef.current;
        if (!w) return reject(new Error('Worker indisponível.'));
        const id = ++seq.current;
        pending.current.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
          onProgress,
          bucket: [],
        });
        w.postMessage({ ...payload, id } as WorkerRequest);
      }),
    [],
  );

  const race = useCallback(
    (
      n: number,
      ids: SolverId[],
      fixed: Assignment,
      onProgress?: (r: RaceResult) => void,
      timeoutMs = 6000,
    ) => request<RaceResult[]>({ cmd: 'race', n, ids, fixed, timeoutMs }, onProgress),
    [request],
  );

  const complete = useCallback(
    (n: number, fixed: Assignment) =>
      request<{ solution: Assignment | null; error: string | null }>({ cmd: 'complete', n, fixed }),
    [request],
  );

  const enumerate = useCallback(
    (n: number, limit = 50000) => request<EnumerateResult>({ cmd: 'enumerate', n, limit }),
    [request],
  );

  return { race, complete, enumerate };
}
