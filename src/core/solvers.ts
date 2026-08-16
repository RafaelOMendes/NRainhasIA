import type { Assignment, SolveEvent, SolverId, SolverMeta } from './types';

export const SOLVERS: SolverMeta[] = [
  {
    id: 'backtracking',
    name: 'Backtracking',
    short: 'BT',
    blurb:
      'Percorre as colunas na ordem e testa cada linha. Ao bater num conflito volta atrás. Exaustivo, correto e ingênuo.',
    color: '#6e8bff',
  },
  {
    id: 'forward-checking',
    name: 'Forward Checking',
    short: 'FC',
    blurb:
      'A cada rainha colocada elimina as casas atacadas dos domínios futuros. Se alguma coluna fica sem opção, desiste na hora.',
    color: '#3ecf8e',
  },
  {
    id: 'mrv',
    name: 'MRV + Forward Checking',
    short: 'MRV',
    blurb:
      'Forward checking que sempre ataca primeiro a coluna com menos opções. "Falhe rápido" — poda a árvore muito antes.',
    color: '#a78bfa',
  },
  {
    id: 'min-conflicts',
    name: 'Min-Conflicts',
    short: 'MC',
    blurb:
      'Busca local: começa com o tabuleiro cheio e vai movendo a rainha mais encrencada para a linha menos atacada.',
    color: '#efa85c',
  },
];

export const solverMeta = (id: SolverId): SolverMeta =>
  SOLVERS.find((s) => s.id === id) ?? SOLVERS[0];

/** Verifica se as rainhas fixadas pelo usuário já se atacam entre si. */
export function checkFixed(n: number, fixed: Assignment): string | null {
  const cols: number[] = [];
  for (let c = 0; c < n; c++) if (fixed[c] >= 0) cols.push(c);
  for (let i = 0; i < cols.length; i++) {
    for (let j = i + 1; j < cols.length; j++) {
      const a = cols[i];
      const b = cols[j];
      if (fixed[a] === fixed[b] || Math.abs(fixed[a] - fixed[b]) === Math.abs(a - b)) {
        return `As rainhas das colunas ${a + 1} e ${b + 1} já se atacam.`;
      }
    }
  }
  return null;
}

export const emptyFixed = (n: number): Assignment => new Array(n).fill(-1);

/* ------------------------------------------------------------------ */
/* Backtracking cronológico                                            */
/* ------------------------------------------------------------------ */

export function* backtracking(n: number, fixed: Assignment): Generator<SolveEvent> {
  const bad = checkFixed(n, fixed);
  if (bad) {
    yield { t: 'fail' };
    return;
  }

  const assign = fixed.slice();
  const free: number[] = [];
  for (let c = 0; c < n; c++) if (assign[c] < 0) free.push(c);

  let counter = 0;

  const safe = (col: number, row: number): boolean => {
    for (let c = 0; c < n; c++) {
      const r = assign[c];
      if (r < 0 || c === col) continue;
      if (r === row || Math.abs(r - row) === Math.abs(c - col)) return false;
    }
    return true;
  };

  function* rec(k: number, parent: number): Generator<SolveEvent, boolean> {
    if (k === free.length) {
      yield { t: 'solution', assignment: assign.slice() };
      return true;
    }
    const col = free[k];
    for (let row = 0; row < n; row++) {
      const node = ++counter;
      yield { t: 'try', col, row, depth: k, node, parent };
      if (!safe(col, row)) {
        yield { t: 'reject', col, row, node, why: 'attack' };
        continue;
      }
      assign[col] = row;
      yield { t: 'place', col, row, node };
      if (yield* rec(k + 1, node)) return true;
      assign[col] = -1;
      yield { t: 'undo', col, row, node };
    }
    return false;
  }

  if (!(yield* rec(0, 0))) yield { t: 'fail' };
}

/* ------------------------------------------------------------------ */
/* Forward checking (com MRV opcional)                                 */
/* ------------------------------------------------------------------ */

export function* forwardChecking(
  n: number,
  fixed: Assignment,
  mrv: boolean,
): Generator<SolveEvent> {
  const bad = checkFixed(n, fixed);
  if (bad) {
    yield { t: 'fail' };
    return;
  }

  const assign = new Int32Array(n).fill(-1);
  /** blocked[col][row] = quantas rainhas já eliminaram essa casa (permite desfazer). */
  const blocked: Int32Array[] = Array.from({ length: n }, () => new Int32Array(n));
  const domain = new Int32Array(n).fill(n);
  let assigned = 0;
  let counter = 0;

  const prune = (c: number, r: number, undo: number[]) => {
    if (r < 0 || r >= n) return;
    if (blocked[c][r]++ === 0) domain[c]--;
    undo.push(c, r);
  };

  const unprune = (undo: number[]) => {
    for (let i = undo.length - 2; i >= 0; i -= 2) {
      const c = undo[i];
      const r = undo[i + 1];
      if (--blocked[c][r] === 0) domain[c]++;
    }
  };

  /** Propaga a rainha (col,row) e devolve true se algum domínio zerou. */
  const propagate = (col: number, row: number, undo: number[]): boolean => {
    let wipeout = false;
    for (let c = 0; c < n; c++) {
      if (c === col || assign[c] >= 0) continue;
      const d = Math.abs(c - col);
      prune(c, row, undo);
      prune(c, row - d, undo);
      prune(c, row + d, undo);
      if (domain[c] === 0) wipeout = true;
    }
    return wipeout;
  };

  // As colunas já fixadas pelo usuário entram no estado inicial.
  const rootUndo: number[] = [];
  for (let c = 0; c < n; c++) {
    if (fixed[c] < 0) continue;
    assign[c] = fixed[c];
    assigned++;
  }
  for (let c = 0; c < n; c++) {
    if (assign[c] < 0) continue;
    if (propagate(c, assign[c], rootUndo)) {
      yield { t: 'fail' };
      return;
    }
  }

  const pickColumn = (): number => {
    let col = -1;
    if (mrv) {
      let best = Infinity;
      for (let c = 0; c < n; c++) {
        if (assign[c] >= 0) continue;
        if (domain[c] < best) {
          best = domain[c];
          col = c;
        }
      }
    } else {
      for (let c = 0; c < n; c++)
        if (assign[c] < 0) {
          col = c;
          break;
        }
    }
    return col;
  };

  function* rec(parent: number): Generator<SolveEvent, boolean> {
    const col = pickColumn();
    if (col < 0) {
      yield { t: 'solution', assignment: Array.from(assign) };
      return true;
    }
    const depth = assigned;
    for (let row = 0; row < n; row++) {
      if (blocked[col][row] > 0) continue; // valor já podado — nem vira nó
      const node = ++counter;
      yield { t: 'try', col, row, depth, node, parent };

      assign[col] = row;
      assigned++;
      const undo: number[] = [];
      const wipeout = propagate(col, row, undo);
      yield { t: 'place', col, row, node };

      if (!wipeout) {
        if (yield* rec(node)) return true;
      } else {
        yield { t: 'reject', col, row, node, why: 'wipeout' };
      }

      unprune(undo);
      assign[col] = -1;
      assigned--;
      yield { t: 'undo', col, row, node };
    }
    return false;
  }

  if (!(yield* rec(0))) yield { t: 'fail' };
}

/* ------------------------------------------------------------------ */
/* Min-conflicts (busca local)                                         */
/* ------------------------------------------------------------------ */

export function* minConflicts(
  n: number,
  fixed: Assignment,
  rng: () => number = Math.random,
): Generator<SolveEvent> {
  const bad = checkFixed(n, fixed);
  if (bad) {
    yield { t: 'fail' };
    return;
  }

  const rows = new Int32Array(n);
  const free: number[] = [];
  for (let c = 0; c < n; c++) {
    if (fixed[c] >= 0) rows[c] = fixed[c];
    else free.push(c);
  }
  if (free.length === 0) {
    yield { t: 'solution', assignment: Array.from(rows) };
    return;
  }

  const rowCount = new Int32Array(n);
  const diagA = new Int32Array(2 * n); // col - row + n - 1
  const diagB = new Int32Array(2 * n); // col + row

  const touch = (c: number, r: number, k: number) => {
    rowCount[r] += k;
    diagA[c - r + n - 1] += k;
    diagB[c + r] += k;
  };
  // Quantas rainhas ocupam as linhas/diagonais de (c,r) — conta a própria 3x se estiver posta.
  const load = (c: number, r: number) => rowCount[r] + diagA[c - r + n - 1] + diagB[c + r];

  const maxSteps = Math.max(2000, n * 80);

  for (let attempt = 0; attempt < 400; attempt++) {
    rowCount.fill(0);
    diagA.fill(0);
    diagB.fill(0);
    for (let c = 0; c < n; c++) if (fixed[c] >= 0) touch(c, rows[c], 1);

    // Início guloso em ordem aleatória: cada coluna vai para a linha menos atacada.
    const order = free.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const c of order) {
      let best = 0;
      let bestV = Infinity;
      let ties = 0;
      for (let r = 0; r < n; r++) {
        const v = load(c, r);
        if (v < bestV) {
          bestV = v;
          best = r;
          ties = 1;
        } else if (v === bestV) {
          ties++;
          if (rng() * ties < 1) best = r;
        }
      }
      rows[c] = best;
      touch(c, best, 1);
      yield { t: 'place', col: c, row: best, node: 0 };
    }

    for (let s = 0; s < maxSteps; s++) {
      const conflicted: number[] = [];
      for (const c of free) if (load(c, rows[c]) > 3) conflicted.push(c);

      if (conflicted.length === 0) {
        yield { t: 'solution', assignment: Array.from(rows) };
        return;
      }

      const c = conflicted[(rng() * conflicted.length) | 0];
      const cur = rows[c];
      touch(c, cur, -1);

      let best = cur;
      let bestV = Infinity;
      let ties = 0;
      for (let r = 0; r < n; r++) {
        const v = load(c, r);
        if (v < bestV) {
          bestV = v;
          best = r;
          ties = 1;
        } else if (v === bestV) {
          ties++;
          if (rng() * ties < 1) best = r;
        }
      }

      rows[c] = best;
      touch(c, best, 1);
      if (best !== cur) yield { t: 'move', col: c, from: cur, to: best };
    }

    yield { t: 'restart' };
  }

  yield { t: 'fail' };
}

/** Fábrica única usada tanto pela animação quanto pelo worker. */
export function makeSolver(id: SolverId, n: number, fixed: Assignment): Generator<SolveEvent> {
  switch (id) {
    case 'backtracking':
      return backtracking(n, fixed);
    case 'forward-checking':
      return forwardChecking(n, fixed, false);
    case 'mrv':
      return forwardChecking(n, fixed, true);
    case 'min-conflicts':
      return minConflicts(n, fixed);
  }
}
