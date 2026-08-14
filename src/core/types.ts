/** Uma solução/atribuição parcial: índice = coluna, valor = linha (-1 = coluna vazia). */
export type Assignment = number[];

/** Uma rainha no tabuleiro. O `id` é estável para que a animação siga a mesma peça. */
export interface Queen {
  id: string;
  row: number;
  col: number;
}

export type SolverId = 'backtracking' | 'forward-checking' | 'mrv' | 'min-conflicts';

export interface SolverMeta {
  id: SolverId;
  name: string;
  short: string;
  blurb: string;
  color: string;
}

/**
 * Eventos emitidos pelos solvers. São geradores, então a UI consome no ritmo
 * que quiser — passo a passo, acelerado ou até o fim dentro do worker.
 */
export type SolveEvent =
  | { t: 'try'; col: number; row: number; depth: number; node: number; parent: number }
  | { t: 'place'; col: number; row: number; node: number }
  | { t: 'reject'; col: number; row: number; node: number; why: 'attack' | 'wipeout' }
  | { t: 'undo'; col: number; row: number; node: number }
  | { t: 'move'; col: number; from: number; to: number }
  | { t: 'restart' }
  | { t: 'solution'; assignment: Assignment }
  | { t: 'fail' };

export interface SolverStats {
  nodes: number;
  backtracks: number;
  rejects: number;
  moves: number;
  restarts: number;
  steps: number;
  ms: number;
}

export const emptyStats = (): SolverStats => ({
  nodes: 0,
  backtracks: 0,
  rejects: 0,
  moves: 0,
  restarts: 0,
  steps: 0,
  ms: 0,
});

export interface RaceResult extends SolverStats {
  id: SolverId;
  solution: Assignment | null;
  timedOut: boolean;
}

export interface TreeNode {
  id: number;
  parent: number;
  depth: number;
  col: number;
  row: number;
  key: string;
  status: 'open' | 'placed' | 'rejected' | 'failed' | 'solution';
}

export const N_MIN = 4;
export const N_MAX = 20;
/** Acima disso a enumeração completa deixa de ser instantânea. */
export const N_ENUM_MAX = 12;
