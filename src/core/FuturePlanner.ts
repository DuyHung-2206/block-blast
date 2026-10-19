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
 * Standard representative testing triplets for future turns:
 * Turn 2 Pressure Triplet: High demanding giant shapes
 * Turn 2 Standard Triplet: Mixed shapes
 * Turn 3 Follow-up Triplet: Secondary continuation test
 */
const FUTURE_SCENARIOS: { name: string; pieces: PieceShape[] }[] = [
  {
    name: 'Kịch bản áp lực cao (Vuông 3x3 + Thanh 5 + Vuông 2x2)',
    pieces: [
      getShapeById('square_3x3')!,
      getShapeById('bar_5_h')!,
      getShapeById('square_2x2')!,
    ],
  },
  {
    name: 'Kịch bản góc lớn (L lớn + L nhỏ + Thanh 3)',
    pieces: [
      getShapeById('corner_big_90')!,
      getShapeById('corner_small_0')!,
      getShapeById('bar_3_v')!,
    ],
  },
  {
    name: 'Kịch bản chuẩn (Chữ T + Chữ Z + Thanh 4)',
    pieces: [
      getShapeById('T_0')!,
      getShapeById('Z_0')!,
      getShapeById('bar_4_h')!,
    ],
  },
  {
    name: 'Kịch bản lấp nhanh (Vuông 2x2 + Thanh 3 + Ô đơn)',
    pieces: [
      getShapeById('square_2x2')!,
      getShapeById('bar_3_h')!,
      getShapeById('dot_1')!,
    ],
  },
];

export class FutureStatePlanner {
  /**
   * Evaluates and ranks all candidates that have ALREADY PASSED the Exact 3-Piece Solver.
   * Does NOT filter or invent solutions. Only assigns future quality scores, survival depths,
   * and ranks.
   * 
   * MULTI-TURN CONTINUOUS PATH SIMULATION:
   * Takes the resulting board after all 3 pieces of Turn 1 are placed, then simulates
   * Turn 2 placement of 3 pieces, updates board, and proceeds to Turn 3 if depth allows.
   */
  static rankSolutions(
    solutions: VerifiedSolution[],
    strategy: PlanningStrategy = 'balanced',
    weights: EvaluationWeights = DEFAULT_WEIGHTS
  ): VerifiedSolution[] {
    if (solutions.length === 0) return [];

    const scenariosToTest =
      strategy === 'fast'
        ? FUTURE_SCENARIOS.slice(0, 1)
        : strategy === 'balanced'
        ? FUTURE_SCENARIOS.slice(0, 2)
        : FUTURE_SCENARIOS; // deep: all 4 scenarios

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
      let turnsSurvived = 1; // Passed turn 1 (current turn)
      let deadEndsFound = 0;
      let futurePathsFound = 0;

      for (const scenario of scenariosToTest) {
        futureBranchesTested++;

        // 1. Simulate Turn 2 on this solution's final board with exact 3-piece requirement
        const t2Result = Exact3PieceSolver.solve(
          sol.finalBoard,
          scenario.pieces,
          { maxSolutions: 1, timeLimitMs: strategy === 'deep' ? 120 : 60 }
        );

        if (t2Result.status === 'SOLVED_COMPLETE' && t2Result.solutions.length > 0) {
          turnsSurvived = Math.max(turnsSurvived, 2);
          futurePathsFound++;
          score += weights.futureSurvivalDepthWeight;

          // 2. Continuous Path Simulation: If in deep/balanced mode, chain to Turn 3
          // Take Turn 2's resulting final board and simulate Turn 3
          if (strategy === 'deep') {
            const turn2FinalBoard = t2Result.solutions[0].finalBoard;
            const turn3Scenario = [
              getShapeById('square_2x2')!,
              getShapeById('bar_3_h')!,
              getShapeById('dot_1')!,
            ];

            const t3Result = Exact3PieceSolver.solve(
              turn2FinalBoard,
              turn3Scenario,
              { maxSolutions: 1, timeLimitMs: 60 }
            );

            if (t3Result.status === 'SOLVED_COMPLETE') {
              turnsSurvived = 3;
              score += weights.futureSurvivalDepthWeight * 0.8;
            }
          }
        } else if (t2Result.status === 'NO_COMPLETE_SOLUTION') {
          deadEndsFound++;
          score -= 35.0; // Penalty for dead-ending under standard piece scenarios
        }
      }

      let futureStatus: FutureStatusCode;
      if (futurePathsFound === scenariosToTest.length) {
        futureStatus = 'FUTURE_PATH_FOUND';
      } else if (deadEndsFound > 0 && futurePathsFound === 0) {
        futureStatus = 'FUTURE_DEAD_END_FOUND';
      } else if (deadEndsFound > 0 && futurePathsFound > 0) {
        futureStatus = 'FUTURE_RISK_ESTIMATE';
      } else {
        futureStatus = 'FUTURE_SEARCH_INCOMPLETE';
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
