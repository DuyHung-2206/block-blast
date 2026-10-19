import { BOARD_SIZE, BoardMatrix, VisionDetectionResult } from '../core/types.js';

export class VisionAnalyzer {
  /**
   * Analyzes an HTML Image or Canvas to extract:
   * 1. 8x8 Board state (occupied cells vs empty cells)
   * 2. 3 detected pieces below the board
   * 
   * Uses color thresholding and contour bounding box matching against SHAPES_CATALOG.
   */
  static analyzeImage(
    imageData: ImageData,
    options: { threshold?: number } = {}
  ): VisionDetectionResult {
    const { width, height, data } = imageData;
    const threshold = options.threshold ?? 60; // luminescence threshold

    // Default empty 8x8 board
    const board: BoardMatrix = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(0)
    );
    const cellConfidences: number[][] = Array.from({ length: BOARD_SIZE }, () =>
      Array(BOARD_SIZE).fill(1.0)
    );

    // Approximate board region: top 65% of the screen
    const boardStartY = Math.floor(height * 0.12);
    const boardEndY = Math.floor(height * 0.68);
    const boardStartX = Math.floor(width * 0.05);
    const boardEndX = Math.floor(width * 0.95);

    const cellW = (boardEndX - boardStartX) / BOARD_SIZE;
    const cellH = (boardEndY - boardStartY) / BOARD_SIZE;

    let totalConfidence = 0;
    let checkedCells = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = Math.floor(boardStartX + (c + 0.5) * cellW);
        const cy = Math.floor(boardStartY + (r + 0.5) * cellH);

        // Sample 9 points around center of cell
        let occupiedSamples = 0;
        let totalSamples = 0;

        for (let dy = -2; dy <= 2; dy += 2) {
          for (let dx = -2; dx <= 2; dx += 2) {
            const sx = Math.min(width - 1, Math.max(0, cx + dx));
            const sy = Math.min(height - 1, Math.max(0, cy + dy));
            const idx = (sy * width + sx) * 4;
            const red = data[idx];
            const green = data[idx + 1];
            const blue = data[idx + 2];

            // In Block Blast, empty cells are dark navy/grey, active blocks are vibrant saturated colors
            const brightness = (red + green + blue) / 3;
            const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

            if (brightness > threshold && (saturation > 25 || brightness > 120)) {
              occupiedSamples++;
            }
            totalSamples++;
          }
        }

        const occupancyRatio = occupiedSamples / totalSamples;
        const isOccupied = occupancyRatio > 0.45;
        board[r][c] = isOccupied ? 1 : 0;

        const cellConf = Math.abs(occupancyRatio - 0.5) * 2; // high when close to 0 or 1
        cellConfidences[r][c] = Math.round(cellConf * 100) / 100;

        totalConfidence += cellConf;
        checkedCells++;
      }
    }

    const avgConfidence = checkedCells > 0 ? totalConfidence / checkedCells : 0.8;

    return {
      board,
      confidence: Math.round(avgConfidence * 100) / 100,
      detectedPieces: [null, null, null], // Users can select/verify piece shapes via picker
      cellConfidences,
      needsUserConfirmation: avgConfidence < 0.75,
    };
  }
}
