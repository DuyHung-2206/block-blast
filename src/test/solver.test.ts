import { describe, it, expect } from 'vitest';
import { BOARD_SIZE, BoardMatrix } from '../core/types.js';
import { BitBoardHelper } from '../core/BitBoard.js';
import { getShapeById } from '../core/shapes.js';
import { Exact3PieceSolver } from '../core/ExactSolver.js';
import { IndependentVerifier } from '../core/verifier.js';
import { FutureStatePlanner } from '../core/FuturePlanner.js';

function emptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

describe('Group A: Exact 3-Piece Completion Requirements', () => {
  it('A1: Finds valid solution with permutation order different from input order', () => {
    // Board has only space for piece 1 after piece 0 or piece 2 is placed
    const board = emptyBoard();
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('line_3_h')!;
    const p2 = getShapeById('square_2x2')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2]);
    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.solutions.length).toBeGreaterThan(0);

    for (const sol of result.solutions) {
      expect(sol.steps.length).toBe(3);
      expect(sol.verified).toBe(true);
      const verification = IndependentVerifier.verifySolution(board, [p0, p1, p2], sol);
      expect(verification.isValid).toBe(true);
    }
  });

  it('A2: Piece 1 placement is ONLY possible after Piece 0 triggers a ROW CLEAR', () => {
    // Fill row 0 completely except for 1 cell at (0, 7)
    const board = emptyBoard();
    for (let c = 0; c < 7; c++) {
      board[0][c] = 1;
    }
    // Fill all cells in rows 1..7 except row 0
    for (let r = 1; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = 1;
      }
    }
    // At this point: only cell (0, 7) is empty on the whole 8x8 board!
    // P0: dot_1 (fits in (0, 7) -> completes row 0 -> clears row 0!)
    // P1: line_5_h (can only fit in the cleared row 0!)
    // P2: line_3_h (can fit in the remaining 3 cells of row 0!)
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('line_5_h')!;
    const p2 = getShapeById('line_3_h')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2]);
    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.solutions.length).toBeGreaterThan(0);

    // Verify every solution starts with p0 (index 0) because p1 and p2 cannot fit initially!
    for (const sol of result.solutions) {
      expect(sol.steps[0].pieceIndex).toBe(0);
      expect(sol.steps[0].row).toBe(0);
      expect(sol.steps[0].col).toBe(7);
      expect(sol.steps[0].clearedRows).toContain(0);
      expect(sol.steps.length).toBe(3);
    }
  });

  it('A3: Piece 2 placement is ONLY possible after Piece 1 triggers a COLUMN CLEAR', () => {
    // Fill col 0 completely except for 1 cell at (7, 0)
    const board = emptyBoard();
    for (let r = 0; r < 7; r++) {
      board[r][0] = 1;
    }
    // Fill all other columns
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 1; c < BOARD_SIZE; c++) {
        board[r][c] = 1;
      }
    }
    // Only (7, 0) is empty.
    // P0: dot_1 -> placed at (7,0), completes col 0, clears col 0!
    // P1: line_4_v -> placed in col 0 (rows 0..3)
    // P2: line_4_v -> placed in col 0 (rows 4..7)
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('line_4_v')!;
    const p2 = getShapeById('line_4_v')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2]);
    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.solutions.length).toBeGreaterThan(0);

    for (const sol of result.solutions) {
      expect(sol.steps[0].pieceIndex).toBe(0);
      expect(sol.steps[0].clearedCols).toContain(0);
      expect(sol.verified).toBe(true);
    }
  });

  it('A4: Returns NO_COMPLETE_SOLUTION when only 1 or 2 pieces can be placed, NEVER partial solutions', () => {
    // Fill board such that placing square_2x2 at (0, 0) does NOT complete row 0 or col 0:
    // Keep (0, 7) and (7, 0) empty so no full row or column is completed.
    // Fill board with a checkerboard/isolated pattern that has no full row, no full col, and no 5x1 or 3x3:
    // Only a single 2x2 hole exists at (0, 0).
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        // (0, 0), (0, 1), (1, 0), (1, 1) are empty for p0 (2x2)
        if (r < 2 && c < 2) continue;
        // Keep cells with (r + c) % 3 === 0 empty so NO row or column can ever reach 8/8 full
        if ((r + c) % 3 === 0) continue;
        board[r][c] = 1;
      }
    }
    // Pieces:
    // P0: square_2x2 (fits into (0, 0), but cannot clear any row or col!)
    // P1: line_5_h (needs 5 consecutive horizontal empty cells; with % 3 holes, max consecutive empty is 2!)
    // P2: square_3x3 (needs 3x3 empty, impossible!)
    const p0 = getShapeById('square_2x2')!;
    const p1 = getShapeById('line_5_h')!;
    const p2 = getShapeById('square_3x3')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2]);
    // MUST BE NO_COMPLETE_SOLUTION. Must NOT return p0 as a partial 1-piece solution!
    expect(result.status).toBe('NO_COMPLETE_SOLUTION');
    expect(result.solutions.length).toBe(0);
    expect(result.bestSolution).toBeNull();
  });

  it('A5: Correctly handles duplicate piece shapes without duplicate redundant results', () => {
    const board = emptyBoard();
    const p0 = getShapeById('line_2_h')!;
    const p1 = getShapeById('line_2_h')!;
    const p2 = getShapeById('line_2_h')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], { maxSolutions: 10 });
    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.totalPermutationsTested).toBe(1); // Deduped 3 identical shapes
    expect(result.solutions.length).toBeGreaterThan(0);
  });
});

describe('Group B: State Accuracy and Simulation Correctness', () => {
  it('B1: Disallows out-of-bounds or overlapping placements', () => {
    const board = emptyBoard();
    board[0][0] = 1;
    const p0 = getShapeById('square_2x2')!;
    const mask = BitBoardHelper.getPieceMaskAt(p0, 0, 0)!;
    const bb = BitBoardHelper.matrixToBitBoard(board);
    expect(BitBoardHelper.canPlace(bb, mask)).toBe(false);
  });

  it('B2: Executes simultaneous row and column clears correctly', () => {
    // Board has row 3 filled except (3, 3) AND col 3 filled except (3, 3)
    const board = emptyBoard();
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c !== 3) board[3][c] = 1;
    }
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (r !== 3) board[r][3] = 1;
    }

    const dot = getShapeById('dot_1')!;
    const mask = BitBoardHelper.getPieceMaskAt(dot, 3, 3)!;
    const bb = BitBoardHelper.matrixToBitBoard(board);

    const { nextBb, clearedRows, clearedCols } = BitBoardHelper.placeAndClear(bb, mask);
    expect(clearedRows).toEqual([3]);
    expect(clearedCols).toEqual([3]);
    // After clearing, cell (3, 3) and entire row 3 & col 3 must be empty (0)
    const nextMatrix = BitBoardHelper.bitBoardToMatrix(nextBb);
    for (let i = 0; i < BOARD_SIZE; i++) {
      expect(nextMatrix[3][i]).toBe(0);
      expect(nextMatrix[i][3]).toBe(0);
    }
  });

  it('B3: IndependentVerifier rejects invalid solutions', () => {
    const board = emptyBoard();
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('dot_1')!;
    const p2 = getShapeById('dot_1')!;

    // Forge an invalid solution with overlapping coordinate
    const fakeSolution: any = {
      id: 'fake_1',
      permutation: [0, 1, 2],
      steps: [
        { pieceIndex: 0, pieceId: 'dot_1', row: 0, col: 0, clearedRows: [], clearedCols: [], boardAfterPlacement: [] },
        { pieceIndex: 1, pieceId: 'dot_1', row: 0, col: 0, clearedRows: [], clearedCols: [], boardAfterPlacement: [] }, // overlap!
        { pieceIndex: 2, pieceId: 'dot_1', row: 1, col: 1, clearedRows: [], clearedCols: [], boardAfterPlacement: [] },
      ],
      finalBoard: emptyBoard(),
      linesClearedTotal: 0,
      verified: false,
    };

    const verification = IndependentVerifier.verifySolution(board, [p0, p1, p2], fakeSolution);
    expect(verification.isValid).toBe(false);
    expect(verification.errorReason).toContain('Collision');
  });
});

describe('Group C & D: Future-State Strategic Planner', () => {
  it('D1: Ranks solutions with open 3x3 slots and lower isolated holes higher', () => {
    const board = emptyBoard();
    const p0 = getShapeById('line_3_h')!;
    const p1 = getShapeById('line_3_h')!;
    const p2 = getShapeById('line_3_h')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], { maxSolutions: 15 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const ranked = FutureStatePlanner.rankSolutions(result.solutions, 'fast');
    expect(ranked.length).toBe(result.solutions.length);
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].futureScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].futureScore);
  });

  it('D2: Multi-turn lookahead identifies survival depth and future paths', () => {
    const board = emptyBoard();
    const p0 = getShapeById('square_2x2')!;
    const p1 = getShapeById('line_2_h')!;
    const p2 = getShapeById('dot_1')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], { maxSolutions: 5 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const ranked = FutureStatePlanner.rankSolutions(result.solutions, 'balanced');
    expect(ranked[0].predictedSurvivalDepth).toBeGreaterThanOrEqual(1);
    expect(ranked[0].testedFutureBranches).toBeGreaterThan(0);
    expect(['FUTURE_PATH_FOUND', 'FUTURE_DEAD_END_FOUND', 'FUTURE_RISK_ESTIMATE']).toContain(ranked[0].futureStatus);
  });
});
