import { useMemo, useReducer } from 'react';
import { assignmentToQueens, newQueenId, queenAt } from '../core/board';
import type { Assignment, Queen } from '../core/types';
import { N_MIN } from '../core/types';

interface State {
  n: number;
  queens: Queen[];
  past: Queen[][];
  future: Queen[][];
  /** Última casa mexida — usada para irradiar a animação do heatmap. */
  origin: { row: number; col: number } | null;
}

type Action =
  | { type: 'setN'; n: number }
  | { type: 'place'; row: number; col: number }
  | { type: 'move'; id: string; row: number; col: number }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'setQueens'; queens: Queen[]; record: boolean; origin?: { row: number; col: number } }
  | { type: 'setAssignment'; assignment: Assignment; record: boolean }
  | { type: 'undo' }
  | { type: 'redo' };

const HISTORY_LIMIT = 200;

const commit = (s: State, queens: Queen[], origin: State['origin']): State => ({
  ...s,
  queens,
  origin,
  past: [...s.past, s.queens].slice(-HISTORY_LIMIT),
  future: [],
});

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'setN':
      if (a.n === s.n) return s;
      return { n: a.n, queens: [], past: [], future: [], origin: null };

    case 'place': {
      if (s.queens.length >= s.n) return s;
      if (queenAt(s.queens, a.row, a.col)) return s;
      const q: Queen = { id: newQueenId(), row: a.row, col: a.col };
      return commit(s, [...s.queens, q], { row: a.row, col: a.col });
    }

    case 'move': {
      const q = s.queens.find((x) => x.id === a.id);
      if (!q) return s;
      if (q.row === a.row && q.col === a.col) return s;
      const occupied = queenAt(s.queens, a.row, a.col);
      if (occupied && occupied.id !== a.id) return s;
      return commit(
        s,
        s.queens.map((x) => (x.id === a.id ? { ...x, row: a.row, col: a.col } : x)),
        { row: a.row, col: a.col },
      );
    }

    case 'remove': {
      const q = s.queens.find((x) => x.id === a.id);
      if (!q) return s;
      return commit(
        s,
        s.queens.filter((x) => x.id !== a.id),
        { row: q.row, col: q.col },
      );
    }

    case 'clear':
      if (s.queens.length === 0) return s;
      return commit(s, [], null);

    case 'setQueens':
      return a.record
        ? commit(s, a.queens, a.origin ?? null)
        : { ...s, queens: a.queens, origin: a.origin ?? s.origin };

    case 'setAssignment': {
      const queens = assignmentToQueens(a.assignment, s.queens);
      return a.record ? commit(s, queens, null) : { ...s, queens };
    }

    case 'undo': {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        ...s,
        queens: prev,
        past: s.past.slice(0, -1),
        future: [s.queens, ...s.future].slice(0, HISTORY_LIMIT),
        origin: null,
      };
    }

    case 'redo': {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        ...s,
        queens: next,
        past: [...s.past, s.queens].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        origin: null,
      };
    }
  }
}

export function useBoard(initialN = 8) {
  const [state, dispatch] = useReducer(reducer, {
    n: Math.max(N_MIN, initialN),
    queens: [],
    past: [],
    future: [],
    origin: null,
  } satisfies State);

  const api = useMemo(
    () => ({
      setN: (n: number) => dispatch({ type: 'setN', n }),
      place: (row: number, col: number) => dispatch({ type: 'place', row, col }),
      move: (id: string, row: number, col: number) => dispatch({ type: 'move', id, row, col }),
      remove: (id: string) => dispatch({ type: 'remove', id }),
      clear: () => dispatch({ type: 'clear' }),
      setQueens: (queens: Queen[], record = true) => dispatch({ type: 'setQueens', queens, record }),
      setAssignment: (assignment: Assignment, record = true) =>
        dispatch({ type: 'setAssignment', assignment, record }),
      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
    }),
    [],
  );

  return {
    ...state,
    ...api,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}

export type BoardApi = ReturnType<typeof useBoard>;
