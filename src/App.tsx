import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { attackMap, conflictIds, countConflictPairs, queenAt, queensToFixed } from './core/board';
import { checkFixed, emptyFixed, SOLVERS } from './core/solvers';
import type { Assignment, SolverId } from './core/types';
import { N_ENUM_MAX } from './core/types';
import { useBoard } from './hooks/useBoard';
import { useChallenge } from './hooks/useChallenge';
import { useRace } from './hooks/useRace';
import { useSolutions } from './hooks/useSolutions';
import { useSolverRunner } from './hooks/useSolverRunner';
import { useSolverWorker } from './hooks/useSolverWorker';
import { Board, type BoardHandle } from './components/Board';
import { Dock, type PanelId } from './components/Dock';
import { GlassLayers } from './components/Glass';
import { IconRedo, IconTrash, IconUndo } from './components/Icons';
import { MeshBackground } from './components/MeshBackground';
import { SearchTree } from './components/SearchTree';
import { Sidebar } from './components/Sidebar';
import { PanelBoard } from './components/panels/PanelBoard';
import { PanelChallenge } from './components/panels/PanelChallenge';
import { PanelRace } from './components/panels/PanelRace';
import { PanelSolutions } from './components/panels/PanelSolutions';
import { PanelSolver } from './components/panels/PanelSolver';
import { PanelTree } from './components/panels/PanelTree';

type Cell = { row: number; col: number } | null;

export default function App() {
  const board = useBoard(8);
  const { n, queens, place, move, remove, clear, setAssignment, undo, redo, setN } = board;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<PanelId | null>('board');
  const [showHeat, setShowHeat] = useState(true);
  const [perf, setPerf] = useState(false);
  const [algo, setAlgo] = useState<SolverId>('backtracking');
  const [fromHere, setFromHere] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [safeHint, setSafeHint] = useState<Cell>(null);
  const [cursor, setCursor] = useState<Cell>(null);
  const [dropHover, setDropHover] = useState<Cell>(null);
  const [cellSize, setCellSize] = useState(0);
  const [instantBusy, setInstantBusy] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [metric, setMetric] = useState<'ms' | 'nodes' | 'backtracks'>('ms');
  // A corrida tem tamanho próprio: em N=8 os quatro terminam antes de 1ms.
  const [raceN, setRaceN] = useState(16);
  const [solvedPulse, setSolvedPulse] = useState(false);

  const boardHandle = useRef<BoardHandle | null>(null);

  const worker = useSolverWorker();
  const race = useRace(worker);
  const solutions = useSolutions(worker);
  const challenge = useChallenge();

  const runner = useSolverRunner({
    onAssignment: useCallback((a: Assignment) => setAssignment(a, false), [setAssignment]),
    onSolved: useCallback(() => undefined, []),
  });

  /* ---------------- estado derivado ---------------- */

  const heat = useMemo(() => attackMap(queens, n), [queens, n]);
  const conflicts = useMemo(() => conflictIds(queens), [queens]);
  const conflictPairs = useMemo(() => countConflictPairs(queens), [queens]);
  const solved = queens.length === n && conflictPairs === 0;
  const interactive = !runner.busy;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3800);
  }, []);

  /* ---------------- efeitos ---------------- */

  useEffect(() => {
    document.documentElement.dataset.perf = perf ? 'on' : 'off';
  }, [perf]);

  // Reflexo especular acompanhando o ponteiro em cada superfície de vidro.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.('.glass') as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const challengeRef = useRef(challenge);
  challengeRef.current = challenge;

  const wasSolved = useRef(false);
  useEffect(() => {
    if (solved && !wasSolved.current) {
      wasSolved.current = true;
      setSolvedPulse(true);
      window.setTimeout(() => setSolvedPulse(false), 1400);
      setSafeHint(null);
      if (challengeRef.current.active) challengeRef.current.finish(n);
      else showToast('Resolvido — nenhuma rainha ataca outra.');
    } else if (!solved) {
      wasSolved.current = false;
    }
  }, [solved, n, showToast]);

  // Trocar N zera tudo que depende do tamanho do tabuleiro.
  const prevN = useRef(n);
  useEffect(() => {
    if (prevN.current === n) return;
    prevN.current = n;
    runner.stop();
    // A corrida tem N próprio, então não é afetada pelo tamanho do tabuleiro.
    solutions.reset();
    setSelectedId(null);
    setSafeHint(null);
    setCursor(null);
    setNotice(null);
  }, [n, runner, solutions]);

  /* ---------------- ações ---------------- */

  const resolveFixed = useCallback(
    (useBoardQueens: boolean): { fixed: Assignment; error: string | null } => {
      if (!useBoardQueens) return { fixed: emptyFixed(n), error: null };
      const r = queensToFixed(queens, n);
      if (r.error) return r;
      return { fixed: r.fixed, error: checkFixed(n, r.fixed) };
    },
    [queens, n],
  );

  const startSolver = useCallback(() => {
    const { fixed, error } = resolveFixed(fromHere);
    if (error) {
      setNotice(error);
      return;
    }
    setNotice(null);
    setSelectedId(null);
    setSafeHint(null);
    if (!fromHere) clear();
    runner.start(n, algo, fixed);
  }, [resolveFixed, fromHere, clear, runner, n, algo]);

  /** Um passo isolado: se o solver estiver parado, começa e para no primeiro evento. */
  const stepSolver = useCallback(() => {
    if (!runner.busy) startSolver();
    runner.step();
  }, [runner, startSolver]);

  const instantSolve = useCallback(async () => {
    const { fixed, error } = resolveFixed(fromHere);
    if (error) {
      setNotice(error);
      return;
    }
    setInstantBusy(true);
    try {
      const r = await worker.complete(n, fixed);
      if (r.solution) {
        runner.stop();
        setAssignment(r.solution, true);
        setNotice(null);
      } else {
        setNotice(r.error);
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setInstantBusy(false);
    }
  }, [resolveFixed, fromHere, worker, n, runner, setAssignment]);

  const runRace = useCallback(() => {
    // Sempre do tabuleiro vazio: é a única comparação justa entre os quatro.
    race.run(raceN, SOLVERS.map((s) => s.id), emptyFixed(raceN));
  }, [race, raceN]);

  const startChallenge = useCallback(() => {
    runner.stop();
    clear();
    setSelectedId(null);
    setSafeHint(null);
    setNotice(null);
    challenge.start();
  }, [runner, clear, challenge]);

  const askHint = useCallback(async () => {
    const { fixed, error } = queensToFixed(queens, n);
    if (error) {
      showToast(error);
      return;
    }
    setHintBusy(true);
    try {
      const r = await worker.complete(n, fixed);
      challenge.useHint();
      if (!r.solution) {
        showToast(r.error ?? 'Essa configuração não fecha — tire alguma rainha.');
        return;
      }
      const emptyCol = fixed.findIndex((v) => v < 0);
      if (emptyCol >= 0) {
        const cell = { row: r.solution[emptyCol], col: emptyCol };
        setSafeHint(cell);
        window.setTimeout(() => setSafeHint((c) => (c === cell ? null : c)), 5000);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setHintBusy(false);
    }
  }, [queens, n, worker, challenge, showToast]);

  const applySolution = useCallback(
    (a: Assignment) => {
      runner.stop();
      // Uma solução da corrida pode ter outro tamanho: o tabuleiro se ajusta.
      // Os dois dispatches caem no mesmo lote e o reducer os aplica em ordem.
      if (a.length !== n) setN(a.length);
      setAssignment(a, true);
      setSelectedId(null);
    },
    [runner, setAssignment, setN, n],
  );

  /* ---------------- arraste vindo do dock ---------------- */

  const trayHover = useCallback((x: number | null, y?: number) => {
    if (x === null || y === undefined) {
      setDropHover(null);
      return;
    }
    setDropHover(boardHandle.current?.cellAt(x, y) ?? null);
  }, []);

  const trayDrop = useCallback(
    (x: number, y: number) => {
      setDropHover(null);
      const at = boardHandle.current?.cellAt(x, y);
      if (!at) return;
      if (queenAt(queens, at.row, at.col)) return;
      place(at.row, at.col);
    },
    [queens, place],
  );

  /* ---------------- teclado ---------------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === 'Escape') {
        if (selectedId) setSelectedId(null);
        else setPanel(null);
        return;
      }
      if (!interactive) return;

      const step = (dr: number, dc: number) => {
        e.preventDefault();
        setCursor((c) => {
          if (!c) return { row: 0, col: 0 };
          return {
            row: Math.min(n - 1, Math.max(0, c.row + dr)),
            col: Math.min(n - 1, Math.max(0, c.col + dc)),
          };
        });
      };

      switch (e.key) {
        case 'ArrowUp':
          return step(-1, 0);
        case 'ArrowDown':
          return step(1, 0);
        case 'ArrowLeft':
          return step(0, -1);
        case 'ArrowRight':
          return step(0, 1);
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (!cursor) {
          setCursor({ row: 0, col: 0 });
          return;
        }
        e.preventDefault();
        const q = queenAt(queens, cursor.row, cursor.col);
        if (q) setSelectedId((s) => (s === q.id ? null : q.id));
        else if (selectedId) {
          move(selectedId, cursor.row, cursor.col);
          setSelectedId(null);
        } else place(cursor.row, cursor.col);
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedId) {
          remove(selectedId);
          setSelectedId(null);
        } else if (cursor) {
          const q = queenAt(queens, cursor.row, cursor.col);
          if (q) remove(q.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cursor, selectedId, queens, n, interactive, place, move, remove, undo, redo]);

  /* ---------------- painéis ---------------- */

  const panelContent = () => {
    switch (panel) {
      case 'board':
        return (
          <PanelBoard
            n={n}
            setN={setN}
            queenCount={queens.length}
            onClear={clear}
            onUndo={undo}
            onRedo={redo}
            canUndo={board.canUndo}
            canRedo={board.canRedo}
            showHeat={showHeat}
            setShowHeat={setShowHeat}
            perf={perf}
            setPerf={setPerf}
            disabled={runner.busy}
          />
        );
      case 'solver':
        return (
          <PanelSolver
            algo={algo}
            setAlgo={setAlgo}
            fromHere={fromHere}
            setFromHere={setFromHere}
            runner={runner}
            notice={notice}
            onStart={startSolver}
            onStep={stepSolver}
            onInstant={instantSolve}
            instantBusy={instantBusy}
          />
        );
      case 'race':
        return (
          <PanelRace
            n={raceN}
            setN={(v) => {
              setRaceN(v);
              race.clear();
            }}
            race={race}
            metric={metric}
            setMetric={setMetric}
            onRun={runRace}
            onApply={applySolution}
          />
        );
      case 'tree':
        return <PanelTree runner={runner} />;
      case 'solutions':
        return (
          <PanelSolutions
            n={n}
            sol={solutions}
            onLoad={() => solutions.load(Math.min(n, N_ENUM_MAX))}
            onApply={applySolution}
          />
        );
      case 'challenge':
        return (
          <PanelChallenge
            n={n}
            challenge={challenge}
            onStart={startChallenge}
            onHint={askHint}
            hintBusy={hintBusy}
            placed={queens.length}
            conflicts={conflictPairs}
          />
        );
      default:
        return null;
    }
  };

  /* ---------------- render ---------------- */

  return (
    <>
      <MeshBackground />

      {/*
        --side é a largura da lateral mais as margens; o CSS ajusta --side-w por
        breakpoint e zera --side quando a lateral vira folha inferior.
      */}
      <div
        className="app"
        style={
          { '--side': panel ? 'calc(var(--side-w) + var(--side-gap))' : '0px' } as CSSProperties
        }
      >
        <header className="hud">
          <div className="brand">
            <h1>N Rainhas</h1>
            <small>releitura visual</small>
          </div>
          <div className="hud-right">
            <span className="badge">N = {n}</span>
            <button className="btn icon" onClick={undo} disabled={!board.canUndo} title="Desfazer (Ctrl+Z)">
              <IconUndo />
            </button>
            <button className="btn icon" onClick={redo} disabled={!board.canRedo} title="Refazer (Ctrl+Shift+Z)">
              <IconRedo />
            </button>
            <button
              className="btn icon"
              onClick={() => {
                runner.stop();
                clear();
                setSelectedId(null);
              }}
              disabled={queens.length === 0}
              title="Limpar tabuleiro"
            >
              <IconTrash />
            </button>
          </div>
        </header>

        <main className="stage">
          <div className="board-wrap">
            <div className={`glass board-frame ${solved ? 'solved' : ''}`}>
              <GlassLayers />
              <Board
                n={n}
                queens={queens}
                heat={heat}
                showHeat={showHeat}
                conflicts={conflicts}
                origin={board.origin}
                selectedId={selectedId}
                cursor={cursor}
                tryCell={runner.cursor}
                flash={runner.flash}
                safeHint={safeHint}
                dropHover={dropHover}
                solved={solvedPulse}
                interactive={interactive}
                handleRef={boardHandle}
                onMetrics={setCellSize}
                onSelect={setSelectedId}
                onPlace={place}
                onMove={move}
                onRemove={remove}
              />
            </div>

            <div className="status-line">
              <span>
                <b>{queens.length}</b>/{n} rainhas
              </span>
              <i className="dot" />
              {conflictPairs === 0 ? (
                <span className={queens.length === n ? 'good' : ''}>
                  {queens.length === n ? 'solução válida' : 'sem conflitos'}
                </span>
              ) : (
                <span className="bad">
                  <b>{conflictPairs}</b>{' '}
                  {conflictPairs === 1 ? 'par em conflito' : 'pares em conflito'}
                </span>
              )}
              {selectedId && (
                <>
                  <i className="dot" />
                  <span>rainha selecionada — clique no destino</span>
                </>
              )}
              {runner.busy && (
                <>
                  <i className="dot" />
                  <span>{runner.status === 'paused' ? 'solver pausado' : 'solver rodando'}</span>
                </>
              )}
            </div>
          </div>
        </main>

        <AnimatePresence>
          {runner.busy && panel !== 'tree' && runner.tree.length > 0 && (
            <motion.aside
              className="glass mini-tree"
              initial={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -30, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              <GlassLayers />
              <h3>Árvore de busca</h3>
              <SearchTree nodes={runner.tree} height={104} limit={700} />
            </motion.aside>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div
              className="glass toast"
              initial={{ opacity: 0, y: -18, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <GlassLayers gloss={false} />
              <span>{toast}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar active={panel} onClose={() => setPanel(null)}>
          {panelContent()}
        </Sidebar>

        <Dock
          active={panel}
          onChange={setPanel}
          tray={{
            remaining: Math.max(0, n - queens.length),
            cell: cellSize,
            onHover: trayHover,
            onDrop: trayDrop,
          }}
        />
      </div>
    </>
  );
}
