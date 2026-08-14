import type { Assignment } from './types';

/**
 * Enumera todas as soluções com o backtracking clássico de bitmask.
 * `rows` guarda, para cada coluna, a linha escolhida.
 */
export function enumerateSolutions(n: number, limit = 200000): Assignment[] {
  const out: Assignment[] = [];
  const rows = new Int32Array(n);
  const full = (1 << n) - 1;
  let stopped = false;

  const rec = (col: number, used: number, dA: number, dB: number) => {
    if (stopped) return;
    if (col === n) {
      out.push(Array.from(rows));
      if (out.length >= limit) stopped = true;
      return;
    }
    let free = full & ~(used | dA | dB);
    while (free) {
      const bit = free & -free;
      free -= bit;
      rows[col] = 31 - Math.clz32(bit);
      rec(col + 1, used | bit, ((dA | bit) << 1) & full, (dB | bit) >> 1);
      if (stopped) return;
    }
  };

  rec(0, 0, 0, 0);
  return out;
}

/* ------------------------------------------------------------------ */
/* Simetrias do quadrado (grupo diedral D4)                            */
/* ------------------------------------------------------------------ */

export const SYMMETRY_NAMES = [
  'Original',
  'Rotação 90°',
  'Rotação 180°',
  'Rotação 270°',
  'Espelho horizontal',
  'Espelho vertical',
  'Diagonal principal',
  'Anti-diagonal',
] as const;

/** Rótulos curtos para caber no menu lateral. */
export const SYMMETRY_SHORT = ['—', '90°', '180°', '270°', '↔', '↕', '╲', '╱'] as const;

/** Aplica a k-ésima simetria de D4 a uma solução. */
export function transform(sol: Assignment, k: number): Assignment {
  const n = sol.length;
  const out = new Array<number>(n).fill(-1);
  for (let c = 0; c < n; c++) {
    const r = sol[c];
    if (r < 0) continue;
    let nc = c;
    let nr = r;
    switch (k) {
      case 0:
        break;
      case 1: // 90° horário
        nc = n - 1 - r;
        nr = c;
        break;
      case 2: // 180°
        nc = n - 1 - c;
        nr = n - 1 - r;
        break;
      case 3: // 270°
        nc = r;
        nr = n - 1 - c;
        break;
      case 4: // espelho horizontal
        nc = n - 1 - c;
        nr = r;
        break;
      case 5: // espelho vertical
        nc = c;
        nr = n - 1 - r;
        break;
      case 6: // transposta (diagonal principal)
        nc = r;
        nr = c;
        break;
      case 7: // anti-transposta
        nc = n - 1 - r;
        nr = n - 1 - c;
        break;
    }
    out[nc] = nr;
  }
  return out;
}

const key = (sol: Assignment) => sol.join(',');

/** Forma canônica: a menor das 8 variantes. Soluções com a mesma canônica são a mesma solução fundamental. */
export function canonicalKey(sol: Assignment): string {
  let best = key(transform(sol, 0));
  for (let k = 1; k < 8; k++) {
    const s = key(transform(sol, k));
    if (s < best) best = s;
  }
  return best;
}

export interface SolutionSet {
  n: number;
  all: Assignment[];
  /** Índices em `all` das soluções escolhidas como representantes fundamentais. */
  fundamental: number[];
}

export function buildSolutionSet(n: number, limit = 200000): SolutionSet {
  const all = enumerateSolutions(n, limit);
  const seen = new Set<string>();
  const fundamental: number[] = [];
  for (let i = 0; i < all.length; i++) {
    const ck = canonicalKey(all[i]);
    if (!seen.has(ck)) {
      seen.add(ck);
      fundamental.push(i);
    }
  }
  return { n, all, fundamental };
}
