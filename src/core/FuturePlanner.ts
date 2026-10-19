import { PieceShape, VerifiedSolution, FutureStatusCode } from './types.js';
import { BitBoardHelper } from './BitBoard.js';
import { getShapeById } from './shapes.js';
import { Exact3PieceSolver } from './ExactSolver.js';

export type PlanningStrategy = 'fast' | 'balanced' | 'deep';

export interface EvaluationWeights {
  futureSurvivalDepthWeight: number; // Reward completing turns ahead
  freeCellsWeight: number;           // Usable free space
  open3x3SlotsWeight: number;        // Crucial survival against 3x3 blocks
  open5LineSlotsWeight: number;      // Survival against 5-cell bars
  isolatedHolesPenalty: number;      // Penalty for trapped 1x1 unusable cells
  linesClearedBonus: number;         // Reward clearing lines
}

export const DEFAULT_WEIGHTS: EvaluationWeights = {
  futureSurvivalDepthWeight: 100.0,
  freeCellsWeight: 1.5,
  open3x3SlotsWeight: 15.0,
  open5LineSlotsWeight: 8.0,
  isolatedHolesPenalty: -12.0,
  linesClearedBonus: 10.0,
};

/**
 * Benchmark representative scenarios of future piece triplets:
 * Includes high-risk demanding shapes (3x3 square, 5-bar, big corners)
 * and flexible shapes (dots, 2x2, small corners).
 */
const REPRESENTATIVE_FUTURE_TRIPLETS: PieceShape[][] = [
  // Triplet 1: High pressure (Big 3x3 + 5-bar line + 2x2)
  [
    getShapeById('square_3x3')!,
    getShapeById('line_5_h')!,
    getShapeById('square_2x2')!,
  ],
  // Triplet 2: Heavy corners (Big corner + L 3x2 + 3-line)
  [
    getShapeById('corner_big_tl')!,
    getShapeById('L_3x2_0')!,
    getShapeById('line_3_v')!,
  ],
  // Triplet 3: Mixed standard (T-shape + Z-shape + 4-line)
  [
    getShapeById('T_2x3_down')!,
    getShapeById('Z_2x3')!,
    getShapeById('line_4_h')!,
  ],
  // Triplet 4: Rapid fill (2x2 + 3x1 + Corner small)
  [
    getShapeById('square_2x2')!,
    getShapeById('line_3_h')!,
    getShapeById('corner_small_tl')!,
  ],
];

export class FutureStatePlanner {
  /**
   * Evaluates and ranks all candidates that have ALREADY PASSED the Exact 3-Piece Solver.
   * Does NOT filter or invent solutions. Only assigns future quality scores, survival depths,
   * and ranks.
   */
  static rankSolutions(
    solutions: VerifiedSolution[],
    strategy: PlanningStrategy = 'balanced',
    weights: EvaluationWeights = DEFAULT_WEIGHTS
  ): VerifiedSolution[] {
    if (solutions.length === 0) return [];

    const testScenarios =
      strategy === 'fast'
        ? REPRESENTATIVE_FUTURE_TRIPLETS.slice(0, 1)
        : strategy === 'balanced'
        ? REPRESENTATIVE_FUTURE_TRIPLETS.slice(0, 2)
        : REPRESENTATIVE_FUTURE_TRIPLETS; // deep: all 4 scenarios

    const evaluatedSolutions = solutions.map((sol) => {
      const finalBb = BitBoardHelper.matrixToBitBoard(sol.finalBoard);

      const freeCells = BitBoardHelper.countFreeCells(finalBb);
      const open3x3 = BitBoardHelper.count3x3Openings(finalBb);
      const open5Line = BitBoardHelper.count5LineOpenings(finalBb);
      const isolatedHoles = BitBoardHelper.countIsolatedHoles(finalBb);

      // Base heuristic score on current turn result
      let score =
        freeCells * weights.freeCellsWeight +
        open3x3 * weights.open3x3SlotsWeight +
        open5Line * weights.open5LineSlotsWeight +
        isolatedHoles * weights.isolatedHolesPenalty +
        sol.linesClearedTotal * weights.linesClearedBonus;

      // Multi-turn lookahead simulation
      let futureBranchesTested = 0;
      let turnsSurvived = 1; // Passed turn 1
      let deadEndsFound = 0;
      let futurePathsFound = 0;

      for (const futureTriplet of testScenarios) {
        futureBranchesTested++;

        // Run fast one-turn solver on the future triplet
        const futureResult = Exact3PieceSolver.solve(
          sol.finalBoard,
          futureTriplet,
          { maxSolutions: 1, timeLimitMs: strategy === 'deep' ? 120 : 60 }
        );

        if (futureResult.status === 'SOLVED_COMPLETE' && futureResult.solutions.length > 0) {
          turnsSurvived = Math.max(turnsSurvived, 2);
          futurePathsFound++;
          score += weights.futureSurvivalDepthWeight;

          // If in deep mode, simulate one step further with the future final board
          if (strategy === 'deep') {
            const nextBest = futureResult.solutions[0];
            const secondaryTriplet = [
              getShapeById('square_2x2')!,
              getShapeById('line_3_h')!,
              getShapeById('dot_1')!,
            ];
            const t3Result = Exact3PieceSolver.solve(
              nextBest.finalBoard,
              secondaryTriplet,
              { maxSolutions: 1, timeLimitMs: 60 }
            );
            if (t3Result.status === 'SOLVED_COMPLETE') {
              turnsSurvived = 3;
              score += weights.futureSurvivalDepthWeight * 0.8;
            }
          }
        } else if (futureResult.status === 'NO_COMPLETE_SOLUTION') {
          deadEndsFound++;
          score -= 30.0; // Penalty for failing a standard pressure scenario
        }
      }

      let futureStatus: FutureStatusCode = 'FUTURE_SEARCH_INCOMPLETE';
      if (futurePathsFound === testScenarios.length) {
        futureStatus = 'FUTURE_PATH_FOUND';
      } else if (deadEndsFound > 0) {
        futureStatus = 'FUTURE_DEAD_END_FOUND';
      } else {
        futureStatus = 'FUTURE_RISK_ESTIMATE';
      }

      return {
        ...sol,
        futureScore: Math.round(score * 10) / 10,
        futureStatus,
        predictedSurvivalDepth: turnsSurvived,
        testedFutureBranches: futureBranchesTested,
        freeCells,
        open3x3Slots: open3x3,
        openLine5Slots: open5Line,
        isolatedHoles,
      };
    });

    // Rank 1: highest futureScore, stable tie-breaker
    evaluatedSolutions.sort((a, b) => {
      if (b.futureScore !== a.futureScore) {
        return b.futureScore - a.futureScore;
      }
      if (b.open3x3Slots !== a.open3x3Slots) {
        return b.open3x3Slots - a.open3x3Slots;
      }
      if (b.freeCells !== a.freeCells) {
        return b.freeCells - a.freeCells;
      }
      return a.id.localeCompare(b.id);
    });

    // Assign ranking indices
    evaluatedSolutions.forEach((sol, idx) => {
      sol.rank = idx + 1;
    });

    return evaluatedSolutions;
  }
}
