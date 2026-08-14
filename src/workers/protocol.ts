import type { Assignment, RaceResult, SolverId } from '../core/types';

export type WorkerRequest =
  | { id: number; cmd: 'race'; n: number; ids: SolverId[]; fixed: Assignment; timeoutMs: number }
  | { id: number; cmd: 'complete'; n: number; fixed: Assignment }
  | { id: number; cmd: 'enumerate'; n: number; limit: number };

export type WorkerResponse =
  | { id: number; type: 'race-progress'; result: RaceResult }
  | { id: number; type: 'race-done' }
  | { id: number; type: 'complete'; solution: Assignment | null; error: string | null }
  | {
      id: number;
      type: 'enumerate';
      n: number;
      count: number;
      packed: Uint8Array;
      fundamental: Uint32Array;
      truncated: boolean;
    }
  | { id: number; type: 'error'; message: string };
