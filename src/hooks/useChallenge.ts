import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'nrainhas.recordes';

type Records = Record<string, { ms: number; hints: number; score: number }>;

const readRecords = (): Records => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Records;
  } catch {
    return {};
  }
};

export const scoreOf = (n: number, ms: number, hints: number) =>
  Math.max(0, Math.round((n * n * 120) / (8 + ms / 1000) - hints * 45));

export function useChallenge() {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hints, setHints] = useState(0);
  const [result, setResult] = useState<{ ms: number; hints: number; score: number; best: boolean } | null>(null);
  const [records, setRecords] = useState<Records>(readRecords);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed(performance.now() - startedAt.current), 100);
    return () => clearInterval(t);
  }, [active]);

  const start = useCallback(() => {
    startedAt.current = performance.now();
    setElapsed(0);
    setHints(0);
    setResult(null);
    setActive(true);
  }, []);

  const abandon = useCallback(() => {
    setActive(false);
    setResult(null);
    setElapsed(0);
    setHints(0);
  }, []);

  const useHint = useCallback(() => setHints((h) => h + 1), []);

  const finish = useCallback(
    (n: number) => {
      if (!active) return;
      const ms = performance.now() - startedAt.current;
      setActive(false);
      setElapsed(ms);
      const score = scoreOf(n, ms, hints);
      const key = String(n);
      const prev = records[key];
      const best = !prev || score > prev.score;
      setResult({ ms, hints, score, best });
      if (best) {
        const next = { ...records, [key]: { ms, hints, score } };
        setRecords(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* localStorage pode estar bloqueado */
        }
      }
    },
    [active, hints, records],
  );

  return { active, elapsed, hints, result, records, start, abandon, useHint, finish };
}

export type ChallengeApi = ReturnType<typeof useChallenge>;
