import { PieceShape, VerifiedSolution, FutureStatusCode, FuturePlanningMetrics, BitBoard } from './types.js';
import { BitBoardHelper } from './BitBoard.js';
import { getUniqueShapes } from './shapes.js';
import { Exact3PieceSolver } from './ExactSolver.js';

export type PlanningStrategy = 'fast' | 'balanced' | 'deep' | 'exhaustive';
export type ScenarioMode = 'exhaustive' | 'representative' | 'probabilistic';

export interface EvaluationWeights {
  futureSurvivalDepthWeight: number; // Reward completing turns ahead
  freeCellsWeight: number;           // Usable free space
  open3x3SlotsWeight: number;        // Crucial survival against 3x3 blocks
  open5LineSlotsWeight: number;      // Survival against 5-cell bars
  isolatedHolesPenalty: number;      // Penalty for trapped 1x1 unusable cells
  linesClearedBonus: number;         // Reward clearing lines
  uniqueShapeFitWeight: number;      // Reward percentage of unique library shapes placeable
}

export const DEFAULT_WEIGHTS: EvaluationWeights = {
  futureSurvivalDepthWeight: 100.0,
  freeCellsWeight: 1.5,
  open3x3SlotsWeight: 15.0,
  open5LineSlotsWeight: 8.0,
  isolatedHolesPenalty: -12.0,
  linesClearedBonus: 10.0,
  uniqueShapeFitWeight: 80.0,
};

export interface PlanningOptions {
  strategy?: PlanningStrategy;
  scenarioMode?: ScenarioMode;
  futureDepth?: number; // 1, 2, or 3 (default 2)
  maxScenarios?: number;
  timeLimitMs?: number;
  shapePool?: PieceShape[];
  weights?: EvaluationWeights;
}

export interface ShapeFitAnalysis {
  totalShapes: number;
  placeableShapes: number;
  fitRatio: number; // 0..1
  canFitSquare3x3: boolean;
  canFitBar5: boolean;
  placementsPerShape: Map<string, number>;
}

export interface FutureScenario {
  id: string;
  name: string;
  category: 'high_stress' | 'medium' | 'low_stress' | 'mixed' | 'exhaustive';
  pieces: PieceShape[];
}

export class FutureStatePlanner {
  /**
   * CẤP A: Kiểm thử từng hình dạng hình học độc nhất trên bàn cờ.
   * Đánh giá trực tiếp khả năng tiếp nhận từng khối trong toàn bộ thư viện độc nhất,
   * đặc biệt kiểm tra các khối áp lực cao (Vuông 3x3, Thanh 5).
   */
  static testAllUniqueShapesFit(boardBb: BitBoard, shapePool: PieceShape[]): ShapeFitAnalysis {
    const placementsPerShape = new Map<string, number>();
    let placeableCount = 0;
    let canFitSquare3x3 = false;
    let canFitBar5 = false;

    for (const shape of shapePool) {
      let count = 0;
      const maxR = 8 - shape.height;
      const maxC = 8 - shape.width;

      for (let r = 0; r <= maxR; r++) {
        for (let c = 0; c <= maxC; c++) {
          const mask = Exact3PieceSolver.getCachedMask(shape, r, c);
          if (mask !== null && BitBoardHelper.canPlace(boardBb, mask)) {
            count++;
          }
        }
      }

      placementsPerShape.set(shape.id, count);
      if (count > 0) {
        placeableCount++;
        if (shape.id === 'square_3x3') canFitSquare3x3 = true;
        if (shape.id.startsWith('bar_5_')) canFitBar5 = true;
      }
    }

    const totalShapes = shapePool.length;
    const fitRatio = totalShapes > 0 ? placeableCount / totalShapes : 0;

    return {
      totalShapes,
      placeableShapes: placeableCount,
      fitRatio,
      canFitSquare3x3,
      canFitBar5,
      placementsPerShape,
    };
  }

  /**
   * CẤP B: Sinh các kịch bản bộ ba khối tương lai từ toàn bộ thư viện hình dạng độc nhất.
   * Với N hình dạng độc nhất: Tổng số bộ ba có thứ tự có thể tạo là N^3.
   * Hỗ trợ các chế độ:
   * - 'exhaustive': Vét cạn toàn bộ N^3 (hoặc tới giới hạn maxScenarios).
   * - 'representative': Phủ sóng 100% các hình dạng độc nhất qua các bộ ba phân tầng áp lực.
   * - 'probabilistic': Lấy mẫu giả ngẫu nhiên có kiểm soát hạt giống.
   */
  static generateScenarios(
    shapePool: PieceShape[],
    mode: ScenarioMode = 'representative',
    maxScenarios: number = 30
  ): { scenarios: FutureScenario[]; totalPossibleTriplets: number; shapeCoverage: number } {
    const N = shapePool.length;
    const totalPossibleTriplets = N * N * N;
    const scenarios: FutureScenario[] = [];
    const usedShapeIds = new Set<string>();

    if (N === 0) {
      return { scenarios: [], totalPossibleTriplets: 0, shapeCoverage: 0 };
    }

    if (mode === 'exhaustive') {
      let count = 0;
      outer: for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          for (let k = 0; k < N; k++) {
            scenarios.push({
              id: `ex_${i}_${j}_${k}`,
              name: `Vét cạn [${shapePool[i].name}, ${shapePool[j].name}, ${shapePool[k].name}]`,
              category: 'exhaustive',
              pieces: [shapePool[i], shapePool[j], shapePool[k]],
            });
            usedShapeIds.add(shapePool[i].id);
            usedShapeIds.add(shapePool[j].id);
            usedShapeIds.add(shapePool[k].id);
            count++;
            if (count >= maxScenarios) break outer;
          }
        }
      }
    } else {
      // Phân nhóm hình dạng độc nhất để lấy mẫu đại diện toàn diện
      const largeShapes = shapePool.filter((s) => s.area >= 5 || s.width >= 4 || s.height >= 4);
      const mediumShapes = shapePool.filter((s) => s.area >= 3 && s.area <= 4 && s.width < 4 && s.height < 4);
      const smallShapes = shapePool.filter((s) => s.area <= 2);

      // 1. Nhóm kịch bản áp lực cao (High-stress: kết hợp các khối lớn/khó)
      for (let i = 0; i < largeShapes.length && scenarios.length < maxScenarios; i += 2) {
        const p1 = largeShapes[i % largeShapes.length];
        const p2 = largeShapes[(i + 1) % largeShapes.length];
        const p3 = mediumShapes[i % Math.max(1, mediumShapes.length)] || p1;
        scenarios.push({
          id: `high_${i}`,
          name: `Áp lực cao: ${p1.name} + ${p2.name} + ${p3.name}`,
          category: 'high_stress',
          pieces: [p1, p2, p3],
        });
        usedShapeIds.add(p1.id);
        usedShapeIds.add(p2.id);
        usedShapeIds.add(p3.id);
      }

      // 2. Nhóm kịch bản hình dạng chuẩn & góc xoay đa dạng
      for (let i = 0; i < mediumShapes.length && scenarios.length < maxScenarios; i += 3) {
        const p1 = mediumShapes[i % mediumShapes.length];
        const p2 = mediumShapes[(i + 1) % mediumShapes.length];
        const p3 = mediumShapes[(i + 2) % mediumShapes.length];
        scenarios.push({
          id: `med_${i}`,
          name: `Chuẩn: ${p1.name} + ${p2.name} + ${p3.name}`,
          category: 'medium',
          pieces: [p1, p2, p3],
        });
        usedShapeIds.add(p1.id);
        usedShapeIds.add(p2.id);
        usedShapeIds.add(p3.id);
      }

      // 3. Phủ sóng các hình dạng độc nhất còn lại chưa có mặt trong kịch bản
      const remainingShapes = shapePool.filter((s) => !usedShapeIds.has(s.id));
      for (let i = 0; i < remainingShapes.length && scenarios.length < maxScenarios; i += 3) {
        const p1 = remainingShapes[i];
        const p2 = remainingShapes[(i + 1) % remainingShapes.length] || shapePool[0];
        const p3 = remainingShapes[(i + 2) % remainingShapes.length] || shapePool[1];
        scenarios.push({
          id: `cov_${i}`,
          name: `Bao phủ: ${p1.name} + ${p2.name} + ${p3.name}`,
          category: 'mixed',
          pieces: [p1, p2, p3],
        });
        usedShapeIds.add(p1.id);
        usedShapeIds.add(p2.id);
        usedShapeIds.add(p3.id);
      }

      // 4. Nhóm kịch bản hỗn hợp phổ biến (1 lớn + 1 vừa + 1 nhỏ)
      let mixIdx = 0;
      while (scenarios.length < maxScenarios && mixIdx < shapePool.length) {
        const p1 = largeShapes[mixIdx % Math.max(1, largeShapes.length)] || shapePool[0];
        const p2 = mediumShapes[mixIdx % Math.max(1, mediumShapes.length)] || shapePool[1];
        const p3 = smallShapes[mixIdx % Math.max(1, smallShapes.length)] || shapePool[2];
        scenarios.push({
          id: `mix_${mixIdx}`,
          name: `Hỗn hợp: ${p1.name} + ${p2.name} + ${p3.name}`,
          category: 'mixed',
          pieces: [p1, p2, p3],
        });
        usedShapeIds.add(p1.id);
        usedShapeIds.add(p2.id);
        usedShapeIds.add(p3.id);
        mixIdx++;
      }
    }

    const shapeCoverage = N > 0 ? usedShapeIds.size / N : 0;

    return {
      scenarios,
      totalPossibleTriplets,
      shapeCoverage,
    };
  }

  /**
   * CẤP C: Mô phỏng liên tục nhiều lượt (Continuous Multi-Turn Chaining).
   * Đánh giá và xếp hạng tất cả các lời giải đã ĐƯỢC CHỨNG MINH HỢP LỆ ở lượt hiện tại (Turn 1).
   * Lấy trạng thái bàn cờ sau khi hoàn thành 3 khối của Turn 1, mô phỏng Turn 2 với bộ ba khối tương lai,
   * cập nhật bàn cờ (xóa hàng/cột) và nối tiếp sang Turn 3 nếu độ sâu yêu cầu.
   */
  static rankSolutions(
    solutions: VerifiedSolution[],
    strategyOrOptions?: PlanningStrategy | PlanningOptions,
    weightsOverride?: EvaluationWeights
  ): VerifiedSolution[] {
    if (solutions.length === 0) return [];

    let options: PlanningOptions;
    if (typeof strategyOrOptions === 'string') {
      options = {
        strategy: strategyOrOptions,
        scenarioMode: strategyOrOptions === 'exhaustive' ? 'exhaustive' : 'representative',
        futureDepth: strategyOrOptions === 'deep' ? 3 : 2,
        maxScenarios: strategyOrOptions === 'fast' ? 1 : strategyOrOptions === 'deep' ? 4 : 2,
      };
    } else {
      options = strategyOrOptions || {};
    }

    const strategy = options.strategy || 'balanced';
    const scenarioMode = options.scenarioMode || (strategy === 'exhaustive' ? 'exhaustive' : 'representative');
    const futureDepth = options.futureDepth ?? (strategy === 'deep' ? 3 : 2);
    const maxScenarios = options.maxScenarios ?? (strategy === 'fast' ? 1 : strategy === 'deep' ? 4 : 2);
    const weights = weightsOverride || options.weights || DEFAULT_WEIGHTS;
    const shapePool = options.shapePool || getUniqueShapes();

    // Sinh kịch bản tương lai từ thư viện độc nhất
    const { scenarios, totalPossibleTriplets, shapeCoverage } = this.generateScenarios(
      shapePool,
      scenarioMode,
      maxScenarios
    );

    const evaluatedSolutions = solutions.map((sol) => {
      const finalBb = BitBoardHelper.matrixToBitBoard(sol.finalBoard);

      // Cấp A: Đánh giá khả năng đặt vừa từng hình dạng độc nhất
      const shapeFit = this.testAllUniqueShapesFit(finalBb, shapePool);

      const freeCells = BitBoardHelper.countFreeCells(finalBb);
      const open3x3 = BitBoardHelper.count3x3Openings(finalBb);
      const open5Line = BitBoardHelper.count5LineOpenings(finalBb);
      const isolatedHoles = BitBoardHelper.countIsolatedHoles(finalBb);

      // Điểm nền tảng trạng thái bàn cờ
      let score =
        freeCells * weights.freeCellsWeight +
        open3x3 * weights.open3x3SlotsWeight +
        open5Line * weights.open5LineSlotsWeight +
        isolatedHoles * weights.isolatedHolesPenalty +
        sol.linesClearedTotal * weights.linesClearedBonus +
        shapeFit.fitRatio * weights.uniqueShapeFitWeight +
        (shapeFit.canFitSquare3x3 ? 25 : 0) +
        (shapeFit.canFitBar5 ? 15 : 0);

      // Cấp C: Mô phỏng liên tục chuỗi các lượt tiếp theo
      let scenariosSurvived = 0;
      let scenariosFailed = 0;
      let maxSurvivalDepth = 1; // Đã vượt qua Turn 1
      let futurePathsFound = 0;

      const perScenarioTimeLimit = strategy === 'deep' ? 60 : 35;

      for (const scenario of scenarios) {
        // 1. Mô phỏng Turn 2 trên bàn cờ kết thúc của Turn 1
        const t2Result = Exact3PieceSolver.solve(
          sol.finalBoard,
          scenario.pieces,
          { maxSolutions: 1, timeLimitMs: perScenarioTimeLimit }
        );

        if (t2Result.status === 'SOLVED_COMPLETE' && t2Result.solutions.length > 0) {
          scenariosSurvived++;
          futurePathsFound++;
          maxSurvivalDepth = Math.max(maxSurvivalDepth, 2);
          score += weights.futureSurvivalDepthWeight;

          // 2. Nếu cấu hình futureDepth >= 3, mô phỏng tiếp Turn 3
          if (futureDepth >= 3) {
            const turn2FinalBoard = t2Result.solutions[0].finalBoard;
            // Chọn bộ ba tiếp theo từ thư viện
            const t3Pieces = [
              shapePool[0] || scenario.pieces[0],
              shapePool[1] || scenario.pieces[1],
              shapePool[2] || scenario.pieces[2],
            ];

            const t3Result = Exact3PieceSolver.solve(
              turn2FinalBoard,
              t3Pieces,
              { maxSolutions: 1, timeLimitMs: perScenarioTimeLimit }
            );

            if (t3Result.status === 'SOLVED_COMPLETE' && t3Result.solutions.length > 0) {
              maxSurvivalDepth = Math.max(maxSurvivalDepth, 3);
              score += weights.futureSurvivalDepthWeight * 1.5;
            }
          }
        } else {
          scenariosFailed++;
        }
      }

      // Xác định trạng thái tương lai chính xác theo Prompt
      let futureStatus: FutureStatusCode;
      if (scenariosSurvived > 0) {
        futureStatus = 'FUTURE_PATH_FOUND';
      } else if (scenarioMode === 'exhaustive' && scenarios.length === totalPossibleTriplets) {
        // Vét cạn toàn bộ không gian N^3 và không có đường nào sống sót
        futureStatus = 'FUTURE_PATH_FAILED';
      } else if (scenariosFailed === scenarios.length && scenarios.length > 0) {
        futureStatus = 'FUTURE_DEAD_END_FOUND';
      } else {
        futureStatus = 'FUTURE_SEARCH_INCOMPLETE';
      }

      const scenarioCoverage = totalPossibleTriplets > 0 ? scenarios.length / totalPossibleTriplets : 0;
      const untestedCount = Math.max(0, totalPossibleTriplets - scenarios.length);

      const futureMetrics: FuturePlanningMetrics = {
        status: futureStatus,
        scenarioMode,
        futureDepth,
        totalPossibleTriplets,
        scenariosTested: scenarios.length,
        scenariosSurvived,
        scenariosFailed,
        scenarioCoverage,
        shapeCoverage,
        uniqueShapesCount: shapePool.length,
        untestedScenariosCount: untestedCount,
        fitRatio: shapeFit.fitRatio,
        notes: `Đã thử nghiệm ${scenarios.length}/${totalPossibleTriplets} kịch bản bộ ba (${(scenarioCoverage * 100).toFixed(2)}% độ bao phủ không gian tổ hợp). Tỷ lệ sống sót: ${scenariosSurvived}/${scenarios.length}.`,
      };

      return {
        ...sol,
        futureScore: Math.round(score),
        futureStatus,
        predictedSurvivalDepth: maxSurvivalDepth,
        testedFutureBranches: scenarios.length,
        freeCells,
        open3x3Slots: open3x3,
        openLine5Slots: open5Line,
        isolatedHoles,
        futureMetrics,
      };
    });

    // Sắp xếp theo futureScore giảm dần
    evaluatedSolutions.sort((a, b) => b.futureScore - a.futureScore);

    // Gán thứ hạng Rank
    evaluatedSolutions.forEach((sol, idx) => {
      sol.rank = idx + 1;
    });

    return evaluatedSolutions;
  }
}
