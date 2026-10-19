import { BOARD_SIZE, BoardMatrix, PieceShape, VerifiedSolution } from './types.js';
import { BitBoardHelper } from './BitBoard.js';

export interface VerificationResult {
  isValid: boolean;
  errorReason?: string;
  stepSnapshots: BoardMatrix[];
  clearedLinesPerStep: Array<{ rows: number[]; cols: number[] }>;
  finalBoard: BoardMatrix;
}

/**
 * IndependentVerifier performs a step-by-step re-simulation of the proposed solution
 * completely independent of the search tree logic.
 */
export class IndependentVerifier {
  /**
   * Verifies that:
   * 1. Exactly all 3 pieces are placed in the given sequence.
   * 2. Every piece placement is strictly inside bounds and on free cells.
   * 3. Row/column clears follow official rules (simultaneous horizontal + vertical clear).
   * 4. Next piece uses the updated board strictly AFTER the previous placement + line clear.
   * 5. The reported finalBoard strictly matches the step-by-step re-simulated finalBoard.
   */
  static verifySolution(
    initialBoard: BoardMatrix,
    pieces: PieceShape[],
    solution: VerifiedSolution
  ): VerificationResult {
    if (!solution.steps || solution.steps.length !== 3) {
      return {
        isValid: false,
        errorReason: `Expected exactly 3 steps, got ${solution.steps?.length ?? 0}`,
        stepSnapshots: [],
        clearedLinesPerStep: [],
        finalBoard: initialBoard,
      };
    }

    if (pieces.length !== 3) {
      return {
        isValid: false,
        errorReason: `Expected 3 input pieces to be verified, got ${pieces.length}`,
        stepSnapshots: [],
        clearedLinesPerStep: [],
        finalBoard: initialBoard,
      };
    }

    let currentBb = BitBoardHelper.matrixToBitBoard(initialBoard);
    const stepSnapshots: BoardMatrix[] = [];
    const clearedLinesPerStep: Array<{ rows: number[]; cols: number[] }> = [];

    const usedIndices = new Set<number>();

    for (let stepIdx = 0; stepIdx < 3; stepIdx++) {
      const step = solution.steps[stepIdx];
      const { pieceIndex, row, col } = step;

      if (pieceIndex < 0 || pieceIndex >= 3) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1}: pieceIndex ${pieceIndex} is out of bounds`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }

      if (usedIndices.has(pieceIndex)) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1}: pieceIndex ${pieceIndex} was already used in a prior step`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }
      usedIndices.add(pieceIndex);

      const piece = pieces[pieceIndex];
      if (!piece) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1}: No piece found at index ${pieceIndex}`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }

      // Check boundary constraints
      if (
        row < 0 ||
        col < 0 ||
        row + piece.height > BOARD_SIZE ||
        col + piece.width > BOARD_SIZE
      ) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1} (${piece.id}): Out of bounds at row ${row}, col ${col} (piece dim: ${piece.width}x${piece.height})`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }

      const pieceMask = BitBoardHelper.getPieceMaskAt(piece, row, col);
      if (pieceMask === null) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1} (${piece.id}): Invalid piece mask at (${row}, ${col})`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }

      // Check collision with already occupied cells on updated board
      if (!BitBoardHelper.canPlace(currentBb, pieceMask)) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1} (${piece.id}): Collision detected with occupied cells at (${row}, ${col})`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: BitBoardHelper.bitBoardToMatrix(currentBb),
        };
      }

      // Execute placement and clear
      const { nextBb, clearedRows, clearedCols } = BitBoardHelper.placeAndClear(currentBb, pieceMask);
      currentBb = nextBb;

      const boardSnapshot = BitBoardHelper.bitBoardToMatrix(currentBb);
      stepSnapshots.push(boardSnapshot);
      clearedLinesPerStep.push({ rows: clearedRows, cols: clearedCols });

      // Check if step claims match verified simulation
      if (
        step.clearedRows.length !== clearedRows.length ||
        step.clearedCols.length !== clearedCols.length
      ) {
        return {
          isValid: false,
          errorReason: `Step ${stepIdx + 1} (${piece.id}): Claimed line clears do not match simulation (claimed ${step.clearedRows.length}r/${step.clearedCols.length}c, got ${clearedRows.length}r/${clearedCols.length}c)`,
          stepSnapshots,
          clearedLinesPerStep,
          finalBoard: boardSnapshot,
        };
      }
    }

    const verifiedFinalBoard = BitBoardHelper.bitBoardToMatrix(currentBb);

    // Verify solver's reported finalBoard matches independently verified finalBoard cell-by-cell
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (solution.finalBoard[r][c] !== verifiedFinalBoard[r][c]) {
          return {
            isValid: false,
            errorReason: `Final board mismatch at cell (${r}, ${c}): solver reported ${solution.finalBoard[r][c]}, simulated is ${verifiedFinalBoard[r][c]}`,
            stepSnapshots,
            clearedLinesPerStep,
            finalBoard: verifiedFinalBoard,
          };
        }
      }
    }

    return {
      isValid: true,
      stepSnapshots,
      clearedLinesPerStep,
      finalBoard: verifiedFinalBoard,
    };
  }
}
