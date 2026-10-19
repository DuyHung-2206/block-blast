import { BOARD_SIZE, BitBoard, BoardMatrix, PieceShape, PlacedStep, SolveResult, SolverStatusCode, VerifiedSolution } from './types.js';
import { BitBoardHelper } from './BitBoard.js';
import { IndependentVerifier } from './verifier.js';

export interface SolverOptions {
  maxSolutions?: number; // e.g. 100
  timeLimitMs?: number;  // e.g. 5000 ms
  findAllPermutations?: boolean;
}

export class Exact3PieceSolver {
  /**
   * Precomputed piece masks across all 64 coordinates for fast lookup.
   * Key: `${piece.id}_${r}_${c}` -> bigint mask or null
   */
  private static maskCache = new Map<string, bigint | null>();

  static getCachedMask(piece: PieceShape, r: number, c: number): bigint | null {
    const key = `${piece.id}_${r}_${c}`;
    let mask = this.maskCache.get(key);
    if (mask === undefined) {
      mask = BitBoardHelper.getPieceMaskAt(piece, r, c);
      this.maskCache.set(key, mask);
    }
    return mask;
  }

  /**
   * Solves current turn strictly for EXACT 3-PIECE COMPLETION.
   * Tests all valid permutations (up to 3! = 6) and all valid positions.
   * Never accepts partial 1-piece or 2-piece placements.
   */
  static solve(
    initialBoard: BoardMatrix,
    pieces: PieceShape[],
    options: SolverOptions = {}
  ): SolveResult {
    const startTime = performance.now();
    const maxSolutions = options.maxSolutions ?? 200;
    const timeLimitMs = options.timeLimitMs ?? 4000;

    // Validate inputs
    if (!pieces || pieces.length !== 3 || pieces.some((p) => !p)) {
      return {
        status: 'INPUT_UNCERTAIN',
        solutions: [],
        bestSolution: null,
        totalPermutationsTested: 0,
        nodesVisited: 0,
        timeMs: 0,
        searchCompletedExhaustively: false,
        message: 'Exact Solver requires exactly 3 valid pieces.',
      };
    }

    const initialBb = BitBoardHelper.matrixToBitBoard(initialBoard);

    // Permutations of indices [0, 1, 2]
    const allPermutations: number[][] = [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ];

    // Filter identical piece permutations to avoid redundant duplicates
    const uniquePermutations: number[][] = [];
    const seenPermKey = new Set<string>();

    for (const perm of allPermutations) {
      const shapeKey = perm.map((idx) => pieces[idx].id).join('->');
      if (!seenPermKey.has(shapeKey)) {
        seenPermKey.add(shapeKey);
        uniquePermutations.push(perm);
      }
    }

    const rawSolutions: Array<{
      permutation: number[];
      steps: PlacedStep[];
      finalBb: BitBoard;
      linesClearedTotal: number;
    }> = [];

    let nodesVisited = 0;
    let searchCompletedExhaustively = true;
    let timedOut = false;

    // Transposition table for state deduplication per permutation:
    // Key: `${stepDepth}_${bb.toString()}`
    const transposition = new Set<string>();

    // Backtracking search function
    const search = (
      perm: number[],
      depth: number,
      currentBb: BitBoard,
      accumulatedSteps: PlacedStep[],
      linesClearedAcc: number
    ) => {
      nodesVisited++;

      // Check timeout
      if (performance.now() - startTime > timeLimitMs) {
        timedOut = true;
        searchCompletedExhaustively = false;
        return;
      }

      if (rawSolutions.length >= maxSolutions) {
        searchCompletedExhaustively = false;
        return;
      }

      // Base case: exactly 3 pieces placed successfully
      if (depth === 3) {
        rawSolutions.push({
          permutation: [...perm],
          steps: [...accumulatedSteps],
          finalBb: currentBb,
          linesClearedTotal: linesClearedAcc,
        });
        return;
      }

      // Transposition check to prune identical search subtrees
      const stateKey = `${depth}_${currentBb.toString()}`;
      if (transposition.has(stateKey)) {
        return;
      }

      const pieceIdx = perm[depth];
      const piece = pieces[pieceIdx];

      let anyPlacementPossible = false;

      // Iterate every possible anchor coordinate (r, c)
      const maxR = BOARD_SIZE - piece.height;
      const maxC = BOARD_SIZE - piece.width;

      for (let r = 0; r <= maxR; r++) {
        for (let c = 0; c <= maxC; c++) {
          const mask = this.getCachedMask(piece, r, c);
          if (mask === null) continue;

          if (BitBoardHelper.canPlace(currentBb, mask)) {
            anyPlacementPossible = true;

            // Place piece and simulate line clears
            const { nextBb, clearedRows, clearedCols, linesCleared } =
              BitBoardHelper.placeAndClear(currentBb, mask);

            accumulatedSteps.push({
              pieceIndex: pieceIdx,
              pieceId: piece.id,
              row: r,
              col: c,
              clearedRows,
              clearedCols,
              boardAfterPlacement: BitBoardHelper.bitBoardToMatrix(nextBb),
            });

            search(
              perm,
              depth + 1,
              nextBb,
              accumulatedSteps,
              linesClearedAcc + linesCleared
            );

            accumulatedSteps.pop();

            if (timedOut || rawSolutions.length >= maxSolutions) {
              return;
            }
          }
        }
      }

      if (!anyPlacementPossible) {
        // Mark state as dead-end for this depth
        transposition.add(stateKey);
      }
    };

    // Execute search across all unique permutations
    let permsTested = 0;
    for (const perm of uniquePermutations) {
      if (timedOut || rawSolutions.length >= maxSolutions) break;
      permsTested++;
      transposition.clear();
      search(perm, 0, initialBb, [], 0);
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    // Verify all solutions through the INDEPENDENT VERIFIER
    const verifiedSolutions: VerifiedSolution[] = [];
    const seenSolutionSignatures = new Set<string>();

    for (const raw of rawSolutions) {
      // Signature to deduplicate equivalent placements
      const signature = raw.steps
        .map((s) => `${s.pieceIndex}@${s.row},${s.col}`)
        .join('|');
      if (seenSolutionSignatures.has(signature)) continue;
      seenSolutionSignatures.add(signature);

      const candidateSolution: VerifiedSolution = {
        id: `sol_${verifiedSolutions.length + 1}`,
        permutation: raw.permutation,
        steps: raw.steps,
        finalBoard: BitBoardHelper.bitBoardToMatrix(raw.finalBb),
        linesClearedTotal: raw.linesClearedTotal,
        futureScore: 0,
        futureStatus: 'FUTURE_SEARCH_INCOMPLETE',
        predictedSurvivalDepth: 1,
        testedFutureBranches: 0,
        freeCells: BitBoardHelper.countFreeCells(raw.finalBb),
        open3x3Slots: BitBoardHelper.count3x3Openings(raw.finalBb),
        openLine5Slots: BitBoardHelper.count5LineOpenings(raw.finalBb),
        surfaceRoughness: 0,
        isolatedHoles: BitBoardHelper.countIsolatedHoles(raw.finalBb),
        verified: false,
      };

      // Strict Independent Verification check
      const verification = IndependentVerifier.verifySolution(
        initialBoard,
        pieces,
        candidateSolution
      );

      if (verification.isValid) {
        candidateSolution.verified = true;
        verifiedSolutions.push(candidateSolution);
      }
    }

    // Determine status according to requirements:
    let status: SolverStatusCode;
    if (verifiedSolutions.length > 0) {
      status = 'SOLVED_COMPLETE';
    } else if (timedOut) {
      // Never mislabel timeout as NO_COMPLETE_SOLUTION
      status = 'SEARCH_INCOMPLETE';
    } else {
      // Exhaustive search finished and zero valid 3-piece solutions exist
      status = 'NO_COMPLETE_SOLUTION';
    }

    return {
      status,
      solutions: verifiedSolutions,
      bestSolution: verifiedSolutions[0] || null,
      totalPermutationsTested: permsTested,
      nodesVisited,
      timeMs: elapsedMs,
      searchCompletedExhaustively: searchCompletedExhaustively && !timedOut,
      message:
        status === 'NO_COMPLETE_SOLUTION'
          ? 'Exhaustive search verified: No sequence of placements can accommodate all 3 pieces.'
          : status === 'SEARCH_INCOMPLETE'
          ? 'Search reached resource/time limit before completing exhaustive search.'
          : `Found and independently verified ${verifiedSolutions.length} complete 3-piece placement solutions.`,
    };
  }
}
