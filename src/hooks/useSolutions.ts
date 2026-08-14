import { useCallback, useMemo, useState } from 'react';
import { transform } from '../core/solutions';
import type { Assignment } from '../core/types';
import type { EnumerateResult } from './useSolverWorker';

type Worker = { enumerate: (n: number, limit?: number) => Promise<EnumerateResult> };

export function useSolutions(worker: Worker) {
  const [data, setData] = useState<EnumerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [symmetry, setSymmetry] = useState(0);
  const [onlyFundamental, setOnlyFundamental] = useState(false);
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (n: number) => {
      setLoading(true);
      setError(null);
      try {
        const r = await worker.enumerate(n);
        setData(r);
        setIndex(0);
        setPage(0);
        setSymmetry(0);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [worker],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIndex(0);
    setPage(0);
    setSymmetry(0);
  }, []);

  /** Índices visíveis: todas as soluções ou só as fundamentais. */
  const visible = useMemo(() => {
    if (!data) return [] as number[];
    return onlyFundamental ? data.fundamental : data.solutions.map((_, i) => i);
  }, [data, onlyFundamental]);

  const current: Assignment | null = useMemo(() => {
    if (!data || !data.solutions[index]) return null;
    return transform(data.solutions[index], symmetry);
  }, [data, index, symmetry]);

  return {
    data,
    loading,
    error,
    index,
    setIndex,
    symmetry,
    setSymmetry,
    onlyFundamental,
    setOnlyFundamental,
    page,
    setPage,
    visible,
    current,
    load,
    reset,
  };
}

export type SolutionsApi = ReturnType<typeof useSolutions>;
