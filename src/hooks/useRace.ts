import { useCallback, useState } from 'react';
import type { Assignment, RaceResult, SolverId } from '../core/types';

type Worker = { race: (n: number, ids: SolverId[], fixed: Assignment, onProgress?: (r: RaceResult) => void, timeoutMs?: number) => Promise<RaceResult[]> };

export function useRace(worker: Worker) {
  const [results, setResults] = useState<RaceResult[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (n: number, ids: SolverId[], fixed: Assignment, timeoutMs = 6000) => {
      setRunning(true);
      setError(null);
      setResults([]);
      try {
        await worker.race(n, ids, fixed, (r) => setResults((prev) => [...prev, r]), timeoutMs);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setRunning(false);
      }
    },
    [worker],
  );

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, running, error, run, clear };
}

export type RaceApi = ReturnType<typeof useRace>;
