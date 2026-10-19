import { describe, it, expect } from 'vitest';
import { BOARD_SIZE, BoardMatrix } from '../core/types.js';
import { BitBoardHelper } from '../core/BitBoard.js';
import {
  getShapeById,
  getUniqueShapes,
  getBaseShapes,
  getValidVariants,
  normalizeShape,
  getCanonicalShapeKey,
  rotateMatrix,
  flipMatrix,
  generateAllowedTransforms,
} from '../core/shapes.js';
import { Exact3PieceSolver } from '../core/ExactSolver.js';
import { IndependentVerifier } from '../core/verifier.js';
import { FutureStatePlanner } from '../core/FuturePlanner.js';

function emptyBoard(): BoardMatrix {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

describe('16 Mandatory Rigorous Test Groups', () => {
  // 1. Kiểm tra chuẩn hóa hình dạng và loại bỏ biến thể trùng nhau
  it('Group 1: Shape normalization and deduplication by canonical key', () => {
    // Un-normalized coordinates
    const unshiftedCells: Array<[number, number]> = [[4, 5], [4, 6], [5, 5], [5, 6]];
    const norm = normalizeShape(unshiftedCells);
    expect(norm.cells).toEqual([[0, 0], [0, 1], [1, 0], [1, 1]]);
    expect(norm.width).toBe(2);
    expect(norm.height).toBe(2);

    const canonical1 = getCanonicalShapeKey(unshiftedCells);
    const canonical2 = getCanonicalShapeKey([[0, 0], [0, 1], [1, 0], [1, 1]]);
    expect(canonical1).toBe(canonical2);
    expect(canonical1).toBe('2x2:0,0;0,1;1,0;1,1');
  });

  // 2. Kiểm tra toàn bộ hình dạng độc nhất trong thư viện
  it('Group 2: Entire unique shape library inventory and validity', () => {
    const uniqueShapes = getUniqueShapes();
    const baseShapes = getBaseShapes();
    const validVariants = getValidVariants();

    expect(uniqueShapes.length).toBeGreaterThan(30);
    expect(baseShapes.length).toBe(23);
    expect(validVariants.length).toBe(76);
    expect(uniqueShapes.length).toBe(52);
    expect(Math.pow(uniqueShapes.length, 3)).toBe(140608);

    // Verify all canonical keys in uniqueShapes are pairwise distinct
    const keys = new Set<string>();
    for (const shape of uniqueShapes) {
      const key = getCanonicalShapeKey(shape);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
    }
  });

  // 3. Kiểm tra mọi bộ ba có thứ tự trong các tập nhỏ có thể vét cạn (K^3)
  it('Group 3: Exhaustive test across all ordered triplets in a small subset (3^3 = 27)', () => {
    const subset = [getShapeById('dot_1')!, getShapeById('bar_2_h')!, getShapeById('bar_2_v')!];
    const N = subset.length;
    let tripletsTested = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        for (let k = 0; k < N; k++) {
          const board = emptyBoard();
          const result = Exact3PieceSolver.solve(board, [subset[i], subset[j], subset[k]], {
            maxSolutions: 1,
            timeLimitMs: 100,
          });
          expect(result.status).toBe('SOLVED_COMPLETE');
          tripletsTested++;
        }
      }
    }
    expect(tripletsTested).toBe(27);
  });

  // 4. Kiểm tra phép lặp hình dạng khi luật cho phép (3 khối giống nhau)
  it('Group 4: Allows identical shape repetition and deduplicates permutations cleanly', () => {
    const board = emptyBoard();
    const bar = getShapeById('bar_3_h')!;
    const result = Exact3PieceSolver.solve(board, [bar, bar, bar], { maxSolutions: 5 });

    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.totalPermutationsTested).toBe(1); // 3 identical pieces only have 1 unique permutation
    expect(result.solutions.length).toBeGreaterThan(0);
  });

  // 5. Kiểm tra chính xác việc xoay/lật
  it('Group 5: Mathematical accuracy of rotation and reflection transforms', () => {
    const lShape = [[1, 0], [1, 0], [1, 1]]; // 3x2 L shape
    const rot90 = rotateMatrix(lShape, 90);
    expect(rot90).toEqual([[1, 1, 1], [1, 0, 0]]);

    const flipH = flipMatrix(lShape, 'horizontal');
    expect(flipH).toEqual([[0, 1], [0, 1], [1, 1]]);

    const allowed = generateAllowedTransforms(getShapeById('L_std_0')!);
    expect(allowed.length).toBeGreaterThanOrEqual(4);
  });

  // 6. Kiểm tra các vị trí đặt sát biên
  it('Group 6: Edge and corner placement boundaries on 8x8 board', () => {
    const board = emptyBoard();
    const bb = BitBoardHelper.matrixToBitBoard(board);
    const p5 = getShapeById('bar_5_h')!;

    // Test placement at top-left edge (0, 0)
    const maskTL = BitBoardHelper.getPieceMaskAt(p5, 0, 0);
    expect(maskTL).not.toBeNull();
    expect(BitBoardHelper.canPlace(bb, maskTL!)).toBe(true);

    // Test placement at right-most edge (0, 3) -> ends at col 7
    const maskTR = BitBoardHelper.getPieceMaskAt(p5, 0, 3);
    expect(maskTR).not.toBeNull();
    expect(BitBoardHelper.canPlace(bb, maskTR!)).toBe(true);

    // Test out of bounds (0, 4) -> would exceed col 7
    const maskOOB = BitBoardHelper.getPieceMaskAt(p5, 0, 4);
    expect(maskOOB).toBeNull();

    // Bottom-right corner placement for 2x2 square
    const sq2 = getShapeById('square_2x2')!;
    const maskBR = BitBoardHelper.getPieceMaskAt(sq2, 6, 6);
    expect(maskBR).not.toBeNull();
    const maskBROOB = BitBoardHelper.getPieceMaskAt(sq2, 7, 7);
    expect(maskBROOB).toBeNull();
  });

  // 7. Kiểm tra xóa hàng/cột và cập nhật bàn cờ
  it('Group 7: Clears rows/columns simultaneously and updates matrix correctly', () => {
    const board = emptyBoard();
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (c !== 4) board[4][c] = 1; // row 4 missing cell 4
    }
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (r !== 4) board[r][4] = 1; // col 4 missing cell 4
    }

    const dot = getShapeById('dot_1')!;
    const bb = BitBoardHelper.matrixToBitBoard(board);
    const mask = BitBoardHelper.getPieceMaskAt(dot, 4, 4)!;
    const { nextBb, clearedRows, clearedCols } = BitBoardHelper.placeAndClear(bb, mask);

    expect(clearedRows).toEqual([4]);
    expect(clearedCols).toEqual([4]);
    const matrixAfter = BitBoardHelper.bitBoardToMatrix(nextBb);
    expect(matrixAfter[4][4]).toBe(0);
  });

  // 8. Kiểm tra bộ ba mà chỉ có một thứ tự đặt là hợp lệ
  it('Group 8: Only 1 strict permutation valid out of 6', () => {
    const board = emptyBoard();
    // Fill board so only 1 dot cell fits at (0, 7), which clears row 0, then 5-bar fits, then 3-bar fits
    for (let c = 0; c < 7; c++) board[0][c] = 1;
    for (let r = 1; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) board[r][c] = 1;
    }
    const p0 = getShapeById('dot_1')!;
    const p1 = getShapeById('bar_5_h')!;
    const p2 = getShapeById('bar_3_h')!;

    const result = Exact3PieceSolver.solve(board, [p1, p0, p2]); // input order: [bar5, dot, bar3]
    expect(result.status).toBe('SOLVED_COMPLETE');
    // In every valid solution, dot (index 1) MUST be placed first!
    for (const sol of result.solutions) {
      expect(sol.steps[0].pieceIndex).toBe(1);
    }
  });

  // 9. Kiểm tra trường hợp phải đặt khối đầu để xóa hàng/cột mới đặt được khối sau
  it('Group 9: Clearing line with first piece creates space for subsequent pieces', () => {
    const board = emptyBoard();
    for (let c = 0; c < 7; c++) board[0][c] = 1;
    for (let r = 1; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) board[r][c] = 1;
    }
    const dot = getShapeById('dot_1')!;
    const bar5 = getShapeById('bar_5_h')!;
    const bar2 = getShapeById('bar_2_h')!;

    const result = Exact3PieceSolver.solve(board, [dot, bar5, bar2]);
    expect(result.status).toBe('SOLVED_COMPLETE');
    expect(result.solutions[0].steps[0].clearedRows).toContain(0);
  });

  // 10. Kiểm tra solver thực sự xác minh không có chuỗi đặt đủ 3 khối
  it('Group 10: Exhaustively proves NO_COMPLETE_SOLUTION when no 3-piece placement exists', () => {
    const board = emptyBoard();
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) board[r][c] = 1;
    }
    board[0][0] = 0; // only 1 single cell free
    const sq2 = getShapeById('square_2x2')!;
    const sq3 = getShapeById('square_3x3')!;
    const bar5 = getShapeById('bar_5_h')!;

    const result = Exact3PieceSolver.solve(board, [sq2, sq3, bar5], { timeLimitMs: 2000 });
    expect(result.status).toBe('NO_COMPLETE_SOLUTION');
    expect(result.searchCompletedExhaustively).toBe(true);
    expect(result.solutions.length).toBe(0);
  });

  // 11. Kiểm tra timeout và maxNodes không tạo kết luận vô nghiệm giả
  it('Group 11: Timeout and maxNodes return SEARCH_INCOMPLETE, never false NO_COMPLETE_SOLUTION', () => {
    const board = emptyBoard();
    const dot = getShapeById('dot_1')!;

    // Max nodes limit
    const resultNodes = Exact3PieceSolver.solve(board, [dot, dot, dot], { maxNodes: 1 });
    if (resultNodes.solutions.length === 0) {
      expect(resultNodes.status).toBe('SEARCH_INCOMPLETE');
      expect(resultNodes.terminationReason).toBe('MAX_NODES_REACHED');
    }

    // Timeout limit
    const resultTimeout = Exact3PieceSolver.solve(board, [dot, dot, dot], { timeLimitMs: 0 });
    if (resultTimeout.solutions.length === 0) {
      expect(resultTimeout.status).toBe('SEARCH_INCOMPLETE');
      expect(resultTimeout.terminationReason).toBe('TIMEOUT');
    }
  });

  // 12. Kiểm tra verifier độc lập phát hiện chuỗi đặt sai
  it('Group 12: IndependentVerifier catches corrupted coordinates or out-of-order execution', () => {
    const board = emptyBoard();
    const dot = getShapeById('dot_1')!;
    const result = Exact3PieceSolver.solve(board, [dot, dot, dot], { maxSolutions: 1 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const corruptedSol = JSON.parse(JSON.stringify(result.solutions[0]));
    corruptedSol.steps[1].row = corruptedSol.steps[0].row;
    corruptedSol.steps[1].col = corruptedSol.steps[0].col; // Intentional collision!

    const verification = IndependentVerifier.verifySolution(board, [dot, dot, dot], corruptedSol);
    expect(verification.isValid).toBe(false);
  });

  // 13. Kiểm tra mô phỏng liên tục qua nhiều lượt
  it('Group 13: Continuous multi-turn simulation maintains board state across Turn 1, Turn 2, and Turn 3', () => {
    const board = emptyBoard();
    const dot = getShapeById('dot_1')!;
    const bar2 = getShapeById('bar_2_h')!;
    const sq2 = getShapeById('square_2x2')!;

    const result = Exact3PieceSolver.solve(board, [dot, bar2, sq2], { maxSolutions: 2 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const ranked = FutureStatePlanner.rankSolutions(result.solutions, {
      strategy: 'deep',
      futureDepth: 3,
      maxScenarios: 3,
    });

    expect(ranked[0].predictedSurvivalDepth).toBeGreaterThanOrEqual(2);
    expect(ranked[0].futureMetrics).toBeDefined();
    expect(ranked[0].futureMetrics!.futureDepth).toBe(3);
  });

  // 14. Kiểm tra FUTURE_PATH_FOUND vs exhaustive FUTURE_PATH_FAILED
  it('Group 14: Future status distinguishes survival path found vs dead end', () => {
    const board = emptyBoard();
    const dot = getShapeById('dot_1')!;
    const result = Exact3PieceSolver.solve(board, [dot, dot, dot], { maxSolutions: 1 });
    expect(result.status).toBe('SOLVED_COMPLETE');

    const ranked = FutureStatePlanner.rankSolutions(result.solutions, {
      strategy: 'fast',
      maxScenarios: 2,
    });
    expect(ranked[0].futureStatus).toBe('FUTURE_PATH_FOUND');
  });

  // 15. Kiểm tra FUTURE_SEARCH_INCOMPLETE không bị hiển thị thành thất bại chắc chắn
  it('Group 15: Future planning metrics reports coverage, tested count, and incomplete status gracefully', () => {
    const board = emptyBoard();
    const dot = getShapeById('dot_1')!;
    const result = Exact3PieceSolver.solve(board, [dot, dot, dot], { maxSolutions: 1 });
    const ranked = FutureStatePlanner.rankSolutions(result.solutions, {
      scenarioMode: 'representative',
      maxScenarios: 5,
    });

    const m = ranked[0].futureMetrics!;
    expect(m.scenariosTested).toBe(5);
    expect(m.totalPossibleTriplets).toBeGreaterThan(1000);
    expect(m.scenarioCoverage).toBeLessThan(1.0);
    expect(m.untestedScenariosCount).toBeGreaterThan(0);
    expect(m.notes).toContain('Đã thử nghiệm');
  });

  // 16. Kiểm tra UI phân biệt rõ kết quả chính xác và kết quả dự đoán
  it('Group 16: Metrics separate exact solver state from future lookahead estimates', () => {
    const board = emptyBoard();
    const p0 = getShapeById('bar_2_h')!;
    const p1 = getShapeById('bar_3_h')!;
    const p2 = getShapeById('bar_4_h')!;

    const result = Exact3PieceSolver.solve(board, [p0, p1, p2], { maxSolutions: 3 });
    const ranked = FutureStatePlanner.rankSolutions(result.solutions, 'balanced');

    const sol = ranked[0];
    // Exact solver attributes:
    expect(sol.steps.length).toBe(3);
    expect(sol.verified).toBe(true);
    expect(sol.finalBoard).toBeDefined();

    // Lookahead metrics attributes:
    expect(sol.futureScore).toBeGreaterThan(0);
    expect(sol.predictedSurvivalDepth).toBeGreaterThanOrEqual(1);
    expect(sol.futureMetrics!.shapeCoverage).toBeGreaterThan(0);
    expect(sol.futureMetrics!.fitRatio).toBeGreaterThan(0);
  });
});
