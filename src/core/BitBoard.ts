import { BOARD_SIZE, TOTAL_CELLS, BitBoard, BoardMatrix, PieceShape } from './types.js';

export class BitBoardHelper {
  static readonly ROW_MASKS: bigint[] = (() => {
    const masks: bigint[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      let mask = 0n;
      for (let c = 0; c < BOARD_SIZE; c++) {
        mask |= (1n << BigInt(r * BOARD_SIZE + c));
      }
      masks.push(mask);
    }
    return masks;
  })();

  static readonly COL_MASKS: bigint[] = (() => {
    const masks: bigint[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      let mask = 0n;
      for (let r = 0; r < BOARD_SIZE; r++) {
        mask |= (1n << BigInt(r * BOARD_SIZE + c));
      }
      masks.push(mask);
    }
    return masks;
  })();

  static readonly ALL_CELLS_MASK: bigint = (1n << 64n) - 1n;

  static matrixToBitBoard(matrix: BoardMatrix): BitBoard {
    let bb = 0n;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (matrix[r][c] !== 0) {
          bb |= (1n << BigInt(r * BOARD_SIZE + c));
        }
      }
    }
    return bb;
  }

  static bitBoardToMatrix(bb: BitBoard): BoardMatrix {
    const matrix: BoardMatrix = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if ((bb & (1n << BigInt(r * BOARD_SIZE + c))) !== 0n) {
          matrix[r][c] = 1;
        }
      }
    }
    return matrix;
  }

  static getPieceMaskAt(piece: PieceShape, r: number, c: number): bigint | null {
    if (r < 0 || c < 0 || r + piece.height > BOARD_SIZE || c + piece.width > BOARD_SIZE) {
      return null;
    }
    let mask = 0n;
    for (let i = 0; i < piece.cells.length; i++) {
      const [dr, dc] = piece.cells[i];
      const cellR = r + dr;
      const cellC = c + dc;
      if (cellR >= BOARD_SIZE || cellC >= BOARD_SIZE) return null;
      mask |= (1n << BigInt(cellR * BOARD_SIZE + cellC));
    }
    return mask;
  }

  static canPlace(bb: BitBoard, pieceMask: bigint): boolean {
    return (bb & pieceMask) === 0n;
  }

  /**
   * Applies placement and simultaneous line clears (horizontal & vertical).
   * Returns: { nextBb, clearedRows, clearedCols, linesCleared }
   */
  static placeAndClear(bb: BitBoard, pieceMask: bigint): {
    nextBb: BitBoard;
    clearedRows: number[];
    clearedCols: number[];
    linesCleared: number;
  } {
    const placedBb = bb | pieceMask;
    const clearedRows: number[] = [];
    const clearedCols: number[] = [];
    let clearMask = 0n;

    for (let r = 0; r < BOARD_SIZE; r++) {
      const rMask = this.ROW_MASKS[r];
      if ((placedBb & rMask) === rMask) {
        clearedRows.push(r);
        clearMask |= rMask;
      }
    }

    for (let c = 0; c < BOARD_SIZE; c++) {
      const cMask = this.COL_MASKS[c];
      if ((placedBb & cMask) === cMask) {
        clearedCols.push(c);
        clearMask |= cMask;
      }
    }

    const nextBb = placedBb & (~clearMask);
    return {
      nextBb,
      clearedRows,
      clearedCols,
      linesCleared: clearedRows.length + clearedCols.length,
    };
  }

  static countSetBits(bb: BitBoard): number {
    let count = 0;
    let b = bb;
    while (b > 0n) {
      b &= (b - 1n);
      count++;
    }
    return count;
  }

  static countFreeCells(bb: BitBoard): number {
    return TOTAL_CELLS - this.countSetBits(bb);
  }

  /**
   * Fast count of available 3x3 slots on board (critical for large block survival)
   */
  static count3x3Openings(bb: BitBoard): number {
    let count = 0;
    // 3x3 mask at (0, 0)
    let p3x3 = 0n;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        p3x3 |= (1n << BigInt(r * BOARD_SIZE + c));
      }
    }

    for (let r = 0; r <= BOARD_SIZE - 3; r++) {
      for (let c = 0; c <= BOARD_SIZE - 3; c++) {
        const shift = BigInt(r * BOARD_SIZE + c);
        const mask = p3x3 << shift;
        if ((bb & mask) === 0n) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Fast count of open 5-lines (horizontal and vertical)
   */
  static count5LineOpenings(bb: BitBoard): number {
    let count = 0;
    // Horizontal 5
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c <= BOARD_SIZE - 5; c++) {
        let mask = 0n;
        for (let i = 0; i < 5; i++) {
          mask |= (1n << BigInt(r * BOARD_SIZE + (c + i)));
        }
        if ((bb & mask) === 0n) count++;
      }
    }
    // Vertical 5
    for (let c = 0; c < BOARD_SIZE; c++) {
      for (let r = 0; r <= BOARD_SIZE - 5; r++) {
        let mask = 0n;
        for (let i = 0; i < 5; i++) {
          mask |= (1n << BigInt((r + i) * BOARD_SIZE + c));
        }
        if ((bb & mask) === 0n) count++;
      }
    }
    return count;
  }

  /**
   * Detect isolated 1x1 empty pockets (holes surrounded by occupied cells)
   */
  static countIsolatedHoles(bb: BitBoard): number {
    let holes = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const isOccupied = (bb & (1n << BigInt(r * BOARD_SIZE + c))) !== 0n;
        if (!isOccupied) {
          // Check 4 neighbors
          let occupiedNeighbors = 0;
          let totalNeighbors = 0;
          const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
          for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              totalNeighbors++;
              if ((bb & (1n << BigInt(nr * BOARD_SIZE + nc))) !== 0n) {
                occupiedNeighbors++;
              }
            }
          }
          if (occupiedNeighbors === totalNeighbors && totalNeighbors >= 2) {
            holes++;
          }
        }
      }
    }
    return holes;
  }
}
