export const BOARD_SIZE = 8;
export const TOTAL_CELLS = 64;

export type BoardMatrix = number[][]; // 0 = empty, 1 = occupied
export type BitBoard = bigint; // 64-bit unsigned representation

export interface PieceShape {
  id: string;
  name: string;
  category: 'dot' | 'line' | 'square' | 'L' | 'J' | 'T' | 'Z' | 'S' | 'corner' | 'giant';
  color: string;
  matrix: number[][]; // 2D bounding grid [row][col]
  cells: Array<[number, number]>; // Normalized relative [r, c]
  area: number;
  width: number;
  height: number;
}

export interface PlacedStep {
  pieceIndex: number; // 0, 1, or 2 from original inputs
  pieceId: string;
  row: number; // top-left placement anchor row
  col: number; // top-left placement anchor col
  clearedRows: number[];
  clearedCols: number[];
  boardAfterPlacement: BoardMatrix;
}

export type SolverStatusCode = 
  | 'SOLVED_COMPLETE'
  | 'NO_COMPLETE_SOLUTION'
  | 'SEARCH_INCOMPLETE'
  | 'INPUT_UNCERTAIN'
  | 'INTERNAL_ERROR';

export type FutureStatusCode =
  | 'FUTURE_PATH_FOUND'
  | 'FUTURE_DEAD_END_FOUND'
  | 'FUTURE_SEARCH_INCOMPLETE'
  | 'FUTURE_RISK_ESTIMATE';

export interface VerifiedSolution {
  id: string;
  permutation: number[]; // e.g. [0, 2, 1]
  steps: PlacedStep[];
  finalBoard: BoardMatrix;
  linesClearedTotal: number;
  
  // Future Planning & Evaluation Metrics
  futureScore: number;
  futureStatus: FutureStatusCode;
  predictedSurvivalDepth: number;
  testedFutureBranches: number;
  freeCells: number;
  open3x3Slots: number;
  openLine5Slots: number;
  surfaceRoughness: number;
  isolatedHoles: number;
  verified: boolean;
  rank?: number;
}

export interface SolveResult {
  status: SolverStatusCode;
  solutions: VerifiedSolution[];
  bestSolution: VerifiedSolution | null;
  totalPermutationsTested: number;
  nodesVisited: number;
  timeMs: number;
  searchCompletedExhaustively: boolean;
  message?: string;
}

export interface VisionDetectionResult {
  board: BoardMatrix;
  confidence: number;
  detectedPieces: (PieceShape | null)[];
  cellConfidences: number[][];
  needsUserConfirmation: boolean;
}
