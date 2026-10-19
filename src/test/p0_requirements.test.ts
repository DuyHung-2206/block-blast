import { describe, it, expect } from 'vitest';
import { BOARD_SIZE, BoardMatrix } from '../core/types.js';
import { getShapeById, PRESET_SHAPES } from '../core/shapes.js';
import { Exact3PieceSolver } from '../core/ExactSolver.js';

function emptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

describe('P0 Requirements & Rigorous Edge Cases', () => {
  it('P0-1: SEARCH_INCOMPLETE returned when timeout occurs with 0 solutions (Never false NO_COMPLETE_SOLUTION)', () => {
    // Fill board with a complex dense pattern
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((r * 3 + c) % 2 === 0) board[r][c] = 1;
      }
    }
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('bar_2_h')!;
    const p2 = getShapeById('square_2x2')!;

    // Set timeLimitMs to 0ms to immediately trigger timeout
    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], {
      timeLimitMs: 0,
      maxSolutions: 100,
    });

    // If 0 solutions found within 0ms, it MUST be SEARCH_INCOMPLETE, never NO_COMPLETE_SOLUTION
    if (result.solutions.length === 0) {
      expect(result.status).toBe('SEARCH_INCOMPLETE');
      expect(result.terminationReason).toBe('TIMEOUT');
      expect(result.searchCompletedExhaustively).toBe(false);
    }
  });

  it('P0-2: Provably NO_COMPLETE_SOLUTION only when search completes exhaustively with 0 solutions', () => {
    // Fill board so only (0, 0) is free, but all 3 pieces are 2x2 or 3x3 squares
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        board[r][c] = 1;
      }
    }
    board[0][0] = 0; // only 1 single cell free
    const p0 = getShapeById('square_2x2')!;
    const p1 = getShapeById('square_3x3')!;
    const p2 = getShapeById('bar_5_h')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], {
      timeLimitMs: 3000,
      maxSolutions: 50,
    });

    expect(result.status).toBe('NO_COMPLETE_SOLUTION');
    expect(result.searchCompletedExhaustively).toBe(true);
    expect(result.allSolutionsEnumerated).toBe(true);
    expect(result.solutions.length).toBe(0);
  });

  it('P0-3: When maxSolutions is reached, allSolutionsEnumerated is false', () => {
    const board = emptyBoard();
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('dot_1')!;
    const p2 = getShapeById('dot_1')!;

    // Cap at 3 solutions
    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], {
      maxSolutions: 3,
      timeLimitMs: 5000,
    });

    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.solutions.length).toBe(3);
    expect(result.allSolutionsEnumerated).toBe(false);
    expect(result.terminationReason).toBe('MAX_SOLUTIONS_REACHED');
  });

  it('P0-4: Shape library verification: all presets have valid dimensions, areas, and normalized coordinates', () => {
    expect(PRESET_SHAPES.length).toBeGreaterThan(30);

    for (const shape of PRESET_SHAPES) {
      expect(shape.id).toBeDefined();
      expect(shape.name).toBeDefined();
      expect(shape.cells.length).toBe(shape.area);
      expect(shape.width).toBeGreaterThanOrEqual(1);
      expect(shape.height).toBeGreaterThanOrEqual(1);

      // Verify normalization starts at row 0 and col 0
      const minR = Math.min(...shape.cells.map(([r]) => r));
      const minC = Math.min(...shape.cells.map(([, c]) => c));
      expect(minR).toBe(0);
      expect(minC).toBe(0);

      // Verify cells are inside bounding matrix
      for (const [r, c] of shape.cells) {
        expect(r).toBeLessThan(shape.height);
        expect(c).toBeLessThan(shape.width);
        expect(shape.matrix[r][c]).toBe(1);
      }
    }
  });

  it('P0-5: Flipped diagonals and flipped asymmetrical shapes exist and are geometrically unique', () => {
    const diagMain = getShapeById('diag_2_main')!;
    const diagFlip = getShapeById('diag_2_flip')!;
    expect(diagMain).toBeDefined();
    expect(diagFlip).toBeDefined();
    expect(diagMain.matrix).not.toEqual(diagFlip.matrix);

    const m2Standard = getShapeById('m2_b5_0')!;
    const m2Flip = getShapeById('m2_b5_flip_0')!;
    expect(m2Standard).toBeDefined();
    expect(m2Flip).toBeDefined();
    expect(m2Standard.matrix).not.toEqual(m2Flip.matrix);
  });
});
