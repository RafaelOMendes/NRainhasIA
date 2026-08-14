import { useCallback, useEffect, useRef, useState } from 'react';
import { makeSolver } from '../core/solvers';
import type { Assignment, SolveEvent, SolverId, SolverStats, TreeNode } from '../core/types';
import { emptyStats } from '../core/types';

export type RunnerStatus = 'idle' | 'running' | 'paused' | 'solved' | 'failed';

/** Slider 0–100 → passos por segundo, em escala logarítmica. */
export const speedToSps = (speed: number) => Math.pow(10, speed / 25);
export const TURBO = 100;

const MAX_TREE_NODES = 2200;
const FRAME_BUDGET_MS = 9;
const TREE_FLUSH_MS = 80;

interface Options {
  onAssignment: (a: Assignment) => void;
  onSolved: (a: Assignment) => void;
}

/**
 * Executa um solver na main thread, mas em fatias: nunca mais que ~9ms por
 * quadro. Assim dá para ver a busca em câmera lenta ou em turbo sem travar a UI.
 */
export function useSolverRunner({ onAssignment, onSolved }: Options) {
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [speed, setSpeed] = useState(45);
  const [stats, setStats] = useState<SolverStats>(emptyStats);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [cursor, setCursor] = useState<{ row: number; col: number } | null>(null);
  const [flash, setFlash] = useState<{ row: number; col: number; seq: number } | null>(null);
  const [solverId, setSolverId] = useState<SolverId>('backtracking');

  const gen = useRef<Generator<SolveEvent> | null>(null);
  const assign = useRef<Int32Array>(new Int32Array(0));
  const statsRef = useRef<SolverStats>(emptyStats());
  const nodes = useRef(new Map<number, TreeNode>());
  const path = useRef<number[]>([]);
  const dirty = useRef(false);
  const treeDirty = useRef(false);
  const lastTreeFlush = useRef(0);
  const acc = useRef(0);
  const last = useRef(0);
  const startedAt = useRef(0);
  const statusRef = useRef<RunnerStatus>('idle');
  const speedRef = useRef(speed);
  const flashSeq = useRef(0);
  // Em turbo saem milhares de eventos por quadro; cursor e flash só viram
  // estado do React uma vez por quadro.
  const cursorRef = useRef<{ row: number; col: number } | null>(null);
  const flashRef = useRef<{ row: number; col: number; seq: number } | null>(null);
  const uiDirty = useRef(false);

  const cbs = useRef({ onAssignment, onSolved });
  cbs.current = { onAssignment, onSolved };

  speedRef.current = speed;

  const setRunStatus = (s: RunnerStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const cullTree = () => {
    if (nodes.current.size <= MAX_TREE_NODES) return;
    const keep = new Set(path.current);
    const target = Math.floor(MAX_TREE_NODES * 0.8);
    for (const [id, node] of nodes.current) {
      if (nodes.current.size <= target) break;
      if (keep.has(id) || node.status === 'solution') continue;
      nodes.current.delete(id);
    }
  };

  const apply = (e: SolveEvent) => {
    const s = statsRef.current;
    s.steps++;
    switch (e.t) {
      case 'try': {
        s.nodes++;
        const parent = nodes.current.get(e.parent);
        nodes.current.set(e.node, {
          id: e.node,
          parent: e.parent,
          depth: e.depth,
          col: e.col,
          row: e.row,
          key: (parent?.key ?? '') + String.fromCharCode(33 + e.row),
          status: 'open',
        });
        treeDirty.current = true;
        cursorRef.current = { row: e.row, col: e.col };
        uiDirty.current = true;
        break;
      }
      case 'place': {
        assign.current[e.col] = e.row;
        dirty.current = true;
        const nd = nodes.current.get(e.node);
        if (nd) {
          nd.status = 'placed';
          path.current.push(e.node);
          treeDirty.current = true;
        }
        break;
      }
      case 'reject': {
        s.rejects++;
        const nd = nodes.current.get(e.node);
        if (nd) {
          nd.status = 'rejected';
          treeDirty.current = true;
        }
        flashSeq.current++;
        flashRef.current = { row: e.row, col: e.col, seq: flashSeq.current };
        uiDirty.current = true;
        break;
      }
      case 'undo': {
        s.backtracks++;
        if (assign.current[e.col] === e.row) {
          assign.current[e.col] = -1;
          dirty.current = true;
        }
        const nd = nodes.current.get(e.node);
        if (nd) {
          nd.status = 'failed';
          treeDirty.current = true;
        }
        const at = path.current.lastIndexOf(e.node);
        if (at >= 0) path.current.splice(at, 1);
        break;
      }
      case 'move': {
        s.moves++;
        assign.current[e.col] = e.to;
        dirty.current = true;
        cursorRef.current = { row: e.to, col: e.col };
        uiDirty.current = true;
        break;
      }
      case 'restart':
        s.restarts++;
        break;
      case 'solution': {
        for (const id of path.current) {
          const nd = nodes.current.get(id);
          if (nd) nd.status = 'solution';
        }
        treeDirty.current = true;
        assign.current = Int32Array.from(e.assignment);
        dirty.current = true;
        setRunStatus('solved');
        cursorRef.current = null;
        uiDirty.current = true;
        cbs.current.onSolved(e.assignment.slice());
        break;
      }
      case 'fail':
        setRunStatus('failed');
        cursorRef.current = null;
        uiDirty.current = true;
        break;
    }
    cullTree();
  };

  const flush = (force = false) => {
    if (dirty.current) {
      dirty.current = false;
      cbs.current.onAssignment(Array.from(assign.current));
    }
    if (uiDirty.current) {
      uiDirty.current = false;
      setCursor(cursorRef.current);
      setFlash(flashRef.current);
    }
    setStats({ ...statsRef.current });
    const now = performance.now();
    if (treeDirty.current && (force || now - lastTreeFlush.current > TREE_FLUSH_MS)) {
      treeDirty.current = false;
      lastTreeFlush.current = now;
      setTree(Array.from(nodes.current.values()));
    }
  };

  /** Consome n eventos do gerador. Devolve false quando o gerador acabou. */
  const pump = (limit: number, deadline: number): boolean => {
    const g = gen.current;
    if (!g) return false;
    let i = 0;
    while (i < limit) {
      const r = g.next();
      if (r.done) {
        gen.current = null;
        return false;
      }
      apply(r.value);
      i++;
      if (statusRef.current === 'solved' || statusRef.current === 'failed') return false;
      if ((i & 0x3f) === 0 && performance.now() > deadline) break;
    }
    return true;
  };

  useEffect(() => {
    let raf = 0;
    let lastFrame = performance.now();

    const frame = (now: number) => {
      lastFrame = now;
      if (statusRef.current !== 'running') {
        last.current = now;
        return;
      }
      const dt = Math.min(0.25, (now - last.current) / 1000);
      last.current = now;

      const sps = speedRef.current >= TURBO ? Number.POSITIVE_INFINITY : speedToSps(speedRef.current);
      let allowed: number;
      if (sps === Number.POSITIVE_INFINITY) {
        allowed = 1_000_000;
        acc.current = 0;
      } else {
        acc.current = Math.min(acc.current + dt * sps, 200_000);
        allowed = Math.floor(acc.current);
        acc.current -= allowed;
      }

      if (allowed > 0) {
        statsRef.current.ms = performance.now() - startedAt.current;
        const alive = pump(allowed, performance.now() + FRAME_BUDGET_MS);
        if (!alive && statusRef.current === 'running') setRunStatus('failed');
        flush();
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      frame(now);
    };
    raf = requestAnimationFrame(tick);

    // Em aba de segundo plano (ou em janela oculta) o navegador estrangula o
    // requestAnimationFrame e a busca pararia em silêncio. Este watchdog assume
    // o passo quando nenhum quadro chega.
    const watchdog = window.setInterval(() => {
      const now = performance.now();
      if (now - lastFrame > 220) frame(now);
    }, 120);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(watchdog);
    };
  }, []);

  const start = useCallback((n: number, id: SolverId, fixed: Assignment) => {
    gen.current = makeSolver(id, n, fixed);
    assign.current = Int32Array.from(fixed);
    statsRef.current = emptyStats();
    nodes.current.clear();
    path.current = [];
    acc.current = 0;
    last.current = performance.now();
    startedAt.current = performance.now();
    dirty.current = true;
    treeDirty.current = true;
    uiDirty.current = false;
    cursorRef.current = null;
    flashRef.current = null;
    setSolverId(id);
    setStats(emptyStats());
    setTree([]);
    setCursor(null);
    setFlash(null);
    setRunStatus('running');
  }, []);

  const pause = useCallback(() => {
    if (statusRef.current === 'running') setRunStatus('paused');
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current === 'paused') {
      last.current = performance.now();
      setRunStatus('running');
    }
  }, []);

  const step = useCallback(() => {
    if (statusRef.current !== 'paused' && statusRef.current !== 'running') return;
    setRunStatus('paused');
    statsRef.current.ms = performance.now() - startedAt.current;
    const alive = pump(1, performance.now() + 50);
    if (!alive && statusRef.current === 'paused') setRunStatus('failed');
    flush(true);
  }, []);

  const stop = useCallback(() => {
    gen.current = null;
    path.current = [];
    cursorRef.current = null;
    flashRef.current = null;
    setRunStatus('idle');
    setCursor(null);
    setFlash(null);
  }, []);

  const busy = status === 'running' || status === 'paused';

  return {
    status,
    busy,
    stats,
    tree,
    cursor,
    flash,
    speed,
    setSpeed,
    solverId,
    start,
    pause,
    resume,
    step,
    stop,
  };
}

export type Runner = ReturnType<typeof useSolverRunner>;
