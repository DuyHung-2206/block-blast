import { describe, it, expect } from 'vitest';
import { BOARD_SIZE, BoardMatrix } from '../core/types.js';
import { getShapeById } from '../core/shapes.js';
import { Exact3PieceSolver } from '../core/ExactSolver.js';
import { FutureStatePlanner } from '../core/FuturePlanner.js';

function emptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

describe('Group C & D Detailed Tests', () => {
  it('C1: Honors time limit gracefully and preserves valid completed solutions found so far', () => {
    const board = emptyBoard();
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('dot_1')!;
    const p2 = getShapeById('dot_1')!;

    // Request up to 10000 solutions but limit to 50ms
    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], {
      maxSolutions: 10000,
      timeLimitMs: 50,
    });

    if (result.searchCompletedExhaustively) {
      expect(result.status).toBe('SOLVED_COMPLETE');
    } else {
      // If time stopped before full space exhausted
      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.status).toBe('SOLVED_COMPLETE');
      expect(result.searchCompletedExhaustively).toBe(false);
    }
  });

  it('D3: Evaluates multiple survival depth tiers between fast, balanced, and deep strategies', () => {
    const board = emptyBoard();
    const p0 = getShapeById('square_2x2')!;
    const p1 = getShapeById('line_3_h')!;
    const p2 = getShapeById('corner_small_tl')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], { maxSolutions: 5 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const rankedFast = FutureStatePlanner.rankSolutions(result.solutions, 'fast');
    const rankedDeep = FutureStatePlanner.rankSolutions(result.solutions, 'deep');

    expect(rankedFast[0].testedFutureBranches).toBe(1);
    expect(rankedDeep[0].testedFutureBranches).toBe(4);
    expect(rankedDeep[0].rank).toBe(1);
  });
});
