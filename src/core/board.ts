import type { Assignment, Queen } from './types';

export const attacks = (a: Queen, b: Queen): boolean =>
  a.row === b.row || a.col === b.col || Math.abs(a.row - b.row) === Math.abs(a.col - b.col);

/**
 * Para cada casa, quantas rainhas a atacam (sem contar uma rainha que esteja
 * na própria casa). É o que alimenta o heatmap.
 */
export function attackMap(queens: Queen[], n: number): Int16Array {
  const map = new Int16Array(n * n);
  for (const q of queens) {
    for (let i = 0; i < n; i++) {
      if (i !== q.col) map[q.row * n + i]++;
      if (i !== q.row) map[i * n + q.col]++;
    }
    for (let d = 1; d < n; d++) {
      const cells = [
        [q.row - d, q.col - d],
        [q.row - d, q.col + d],
        [q.row + d, q.col - d],
        [q.row + d, q.col + d],
      ];
      for (const [r, c] of cells) {
        if (r >= 0 && r < n && c >= 0 && c < n) map[r * n + c]++;
      }
    }
  }
  return map;
}

/** Ids das rainhas envolvidas em pelo menos um conflito. */
export function conflictIds(queens: Queen[]): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < queens.length; i++) {
    for (let j = i + 1; j < queens.length; j++) {
      if (attacks(queens[i], queens[j])) {
        out.add(queens[i].id);
        out.add(queens[j].id);
      }
    }
  }
  return out;
}

export function countConflictPairs(queens: Queen[]): number {
  let k = 0;
  for (let i = 0; i < queens.length; i++)
    for (let j = i + 1; j < queens.length; j++) if (attacks(queens[i], queens[j])) k++;
  return k;
}

export const isSolved = (queens: Queen[], n: number): boolean =>
  queens.length === n && countConflictPairs(queens) === 0;

export const queenAt = (queens: Queen[], row: number, col: number): Queen | undefined =>
  queens.find((q) => q.row === row && q.col === col);

/**
 * Converte as rainhas soltas do modo manual para o formato coluna→linha usado
 * pelos solvers. Duas rainhas na mesma coluna não têm representação possível.
 */
export function queensToFixed(
  queens: Queen[],
  n: number,
): { fixed: Assignment; error: string | null } {
  const fixed: Assignment = new Array(n).fill(-1);
  for (const q of queens) {
    if (fixed[q.col] >= 0) {
      return {
        fixed,
        error: `A coluna ${q.col + 1} tem duas rainhas — nenhuma solução pode conter as duas.`,
      };
    }
    fixed[q.col] = q.row;
  }
  return { fixed, error: null };
}

let idCounter = 0;
export const newQueenId = () => `q${++idCounter}`;

/**
 * Reaproveita o id da rainha que já estava naquela coluna para que a animação
 * de layout mova a mesma peça em vez de trocá-la.
 */
export function assignmentToQueens(a: Assignment, prev: Queen[]): Queen[] {
  const byCol = new Map<number, Queen>();
  for (const q of prev) byCol.set(q.col, q);
  const out: Queen[] = [];
  for (let c = 0; c < a.length; c++) {
    if (a[c] < 0) continue;
    const old = byCol.get(c);
    out.push({ id: old ? old.id : newQueenId(), row: a[c], col: c });
  }
  return out;
}
