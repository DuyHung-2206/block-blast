import { PieceShape } from './types.js';

/**
 * Returns a canonical deterministic string representing the geometric cell structure.
 * Translates coordinates so minR=0, minC=0, sorts cells, and encodes as:
 * `${height}x${width}:r1,c1;r2,c2;...`
 */
export function getCanonicalShapeKey(
  input: number[][] | Array<[number, number]> | PieceShape
): string {
  let cells: Array<[number, number]> = [];

  if (Array.isArray(input)) {
    if (input.length === 0) return 'empty';
    if (Array.isArray(input[0])) {
      if (typeof input[0][0] === 'number' && input[0].length === 2 && !Array.isArray(input[0][0])) {
        // Array of coordinate pairs [r, c]
        cells = (input as Array<[number, number]>).slice();
      } else {
        // 2D number[][] matrix
        const mat = input as number[][];
        for (let r = 0; r < mat.length; r++) {
          for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] !== 0) cells.push([r, c]);
          }
        }
      }
    }
  } else if (input && 'cells' in input) {
    cells = input.cells.slice();
  }

  if (cells.length === 0) return 'empty';

  let minR = Infinity, maxR = -Infinity;
  let minC = Infinity, maxC = -Infinity;

  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const normH = maxR - minR + 1;
  const normW = maxC - minC + 1;

  const normalizedCells = cells.map(([r, c]): [number, number] => [r - minR, c - minC]);
  // Sort canonically: primary by row ascending, secondary by column ascending
  normalizedCells.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));

  return `${normH}x${normW}:${normalizedCells.map(([r, c]) => `${r},${c}`).join(';')}`;
}

/**
 * Normalizes any shape, cell list, or matrix so that coordinates are relative to (0, 0)
 * with accurate dimensions, sorted cells, and minimal bounding matrix.
 */
export function normalizeShape(
  input: number[][] | Array<[number, number]> | PieceShape,
  customName?: string,
  customCategory?: any
): PieceShape {
  let cells: Array<[number, number]> = [];
  let name = customName || 'Khối chuẩn hóa';
  let category = customCategory || 'custom';
  let color = '#60a5fa';

  if (!Array.isArray(input) && input && 'cells' in input) {
    cells = input.cells.slice();
    name = customName || input.name;
    category = customCategory || input.category;
    color = input.color;
  } else if (Array.isArray(input)) {
    if (input.length > 0 && Array.isArray(input[0])) {
      if (typeof input[0][0] === 'number' && input[0].length === 2 && !Array.isArray(input[0][0])) {
        cells = (input as Array<[number, number]>).slice();
      } else {
        const mat = input as number[][];
        for (let r = 0; r < mat.length; r++) {
          for (let c = 0; c < mat[r].length; c++) {
            if (mat[r][c] !== 0) cells.push([r, c]);
          }
        }
      }
    }
  }

  if (cells.length === 0) {
    return {
      id: 'empty',
      name: 'Khối rỗng',
      category: 'dot',
      color: '#60a5fa',
      matrix: [[0]],
      cells: [],
      area: 0,
      width: 0,
      height: 0,
    };
  }

  let minR = Infinity, maxR = -Infinity;
  let minC = Infinity, maxC = -Infinity;

  for (const [r, c] of cells) {
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const normH = maxR - minR + 1;
  const normW = maxC - minC + 1;
  const normMatrix: number[][] = Array.from({ length: normH }, () => Array(normW).fill(0));
  const normCells: Array<[number, number]> = [];

  for (const [r, c] of cells) {
    const nr = r - minR;
    const nc = c - minC;
    normMatrix[nr][nc] = 1;
    normCells.push([nr, nc]);
  }

  normCells.sort((a, b) => (a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]));
  const id = `shape_${normCells.map(([r, c]) => `${r}-${c}`).join('_')}`;

  return {
    id,
    name,
    category,
    color,
    matrix: normMatrix,
    cells: normCells,
    area: normCells.length,
    width: normW,
    height: normH,
  };
}

/**
 * Rotates a 2D binary matrix by 90, 180, or 270 degrees clockwise.
 */
export function rotateMatrix(matrix: number[][], degrees: 90 | 180 | 270): number[][] {
  const H = matrix.length;
  const W = matrix[0].length;

  if (degrees === 90) {
    const res: number[][] = Array.from({ length: W }, () => Array(H).fill(0));
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        res[c][H - 1 - r] = matrix[r][c];
      }
    }
    return res;
  } else if (degrees === 180) {
    const res: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        res[H - 1 - r][W - 1 - c] = matrix[r][c];
      }
    }
    return res;
  } else if (degrees === 270) {
    const res: number[][] = Array.from({ length: W }, () => Array(H).fill(0));
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        res[W - 1 - c][r] = matrix[r][c];
      }
    }
    return res;
  }
  return matrix;
}

/**
 * Flips a 2D binary matrix horizontally (left-right) or vertically (top-bottom).
 */
export function flipMatrix(matrix: number[][], axis: 'horizontal' | 'vertical'): number[][] {
  const H = matrix.length;
  const W = matrix[0].length;
  const res: number[][] = Array.from({ length: H }, () => Array(W).fill(0));

  if (axis === 'horizontal') {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        res[r][W - 1 - c] = matrix[r][c];
      }
    }
  } else {
    for (let r = 0; r < H; r++) {
      for (let c = 0; c < W; c++) {
        res[H - 1 - r][c] = matrix[r][c];
      }
    }
  }
  return res;
}

/**
 * Generates all allowed geometric rotations and reflections for a shape,
 * removing redundant identical configurations due to symmetry.
 */
export function generateAllowedTransforms(shape: PieceShape): PieceShape[] {
  const transforms: PieceShape[] = [];
  const seenCanonical = new Set<string>();

  const baseMatrix = shape.matrix;
  const candidates: Array<{ matrix: number[][]; rotation: 0 | 90 | 180 | 270; isFlipped: boolean }> = [
    { matrix: baseMatrix, rotation: 0, isFlipped: false },
    { matrix: rotateMatrix(baseMatrix, 90), rotation: 90, isFlipped: false },
    { matrix: rotateMatrix(baseMatrix, 180), rotation: 180, isFlipped: false },
    { matrix: rotateMatrix(baseMatrix, 270), rotation: 270, isFlipped: false },
    { matrix: flipMatrix(baseMatrix, 'horizontal'), rotation: 0, isFlipped: true },
    { matrix: rotateMatrix(flipMatrix(baseMatrix, 'horizontal'), 90), rotation: 90, isFlipped: true },
    { matrix: rotateMatrix(flipMatrix(baseMatrix, 'horizontal'), 180), rotation: 180, isFlipped: true },
    { matrix: rotateMatrix(flipMatrix(baseMatrix, 'horizontal'), 270), rotation: 270, isFlipped: true },
  ];

  for (const cand of candidates) {
    const key = getCanonicalShapeKey(cand.matrix);
    if (!seenCanonical.has(key)) {
      seenCanonical.add(key);
      const normalized = normalizeShape(cand.matrix, `${shape.name} (${cand.rotation}°${cand.isFlipped ? ' Lật' : ''})`, shape.category);
      normalized.baseShapeId = shape.baseShapeId || shape.id;
      normalized.rotation = cand.rotation;
      normalized.isFlipped = cand.isFlipped;
      transforms.push(normalized);
    }
  }

  return transforms;
}

export function normalizeMatrix(matrix: number[][]): PieceShape | null {
  const norm = normalizeShape(matrix);
  if (norm.area === 0) return null;
  return norm;
}

function createPreset(
  id: string,
  name: string,
  category: 'bar' | 'square' | 'lj' | 'tzs' | 'diagonal' | 'new',
  matrix: number[][]
): PieceShape & { filterCat: 'bar' | 'square' | 'lj' | 'tzs' | 'diagonal' | 'new' } {
  const height = matrix.length;
  const width = matrix[0].length;
  const cells: Array<[number, number]> = [];
  let area = 0;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (matrix[r][c] === 1) {
        cells.push([r, c]);
        area++;
      }
    }
  }

  return {
    id,
    name,
    category: 'line',
    filterCat: category,
    color: '#60a5fa',
    matrix,
    cells,
    area,
    width,
    height,
  };
}

export const PRESET_SHAPES = [
  // ==========================================
  // 1. THANH (Bars)
  // ==========================================
  createPreset('bar_2_h', 'Thanh ngang 2', 'bar', [[1, 1]]),
  createPreset('bar_2_v', 'Thanh dọc 2', 'bar', [[1], [1]]),
  createPreset('bar_3_h', 'Thanh ngang 3', 'bar', [[1, 1, 1]]),
  createPreset('bar_3_v', 'Thanh dọc 3', 'bar', [[1], [1], [1]]),
  createPreset('bar_4_h', 'Thanh ngang 4', 'bar', [[1, 1, 1, 1]]),
  createPreset('bar_4_v', 'Thanh dọc 4', 'bar', [[1], [1], [1], [1]]),
  createPreset('bar_5_h', 'Thanh ngang 5', 'bar', [[1, 1, 1, 1, 1]]),
  createPreset('bar_5_v', 'Thanh dọc 5', 'bar', [[1], [1], [1], [1], [1]]),

  // ==========================================
  // 2. VUÔNG & Ô ĐƠN (Squares)
  // ==========================================
  createPreset('dot_1', 'Ô đơn', 'square', [[1]]),
  createPreset('square_2x2', 'Vuông 2×2', 'square', [
    [1, 1],
    [1, 1],
  ]),
  createPreset('square_3x3', 'Vuông 3×3', 'square', [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ]),

  // ==========================================
  // 3. L / J (Góc L nhỏ, L lớn, Chữ L truyền thống 4 ô)
  // ==========================================
  // L nhỏ (Corner 2x2 - 3 ô)
  createPreset('corner_small_0', 'L nhỏ · 0°', 'lj', [
    [1, 0],
    [1, 1],
  ]),
  createPreset('corner_small_90', 'L nhỏ · 90°', 'lj', [
    [1, 1],
    [1, 0],
  ]),
  createPreset('corner_small_180', 'L nhỏ · 180°', 'lj', [
    [1, 1],
    [0, 1],
  ]),
  createPreset('corner_small_270', 'L nhỏ · 270°', 'lj', [
    [0, 1],
    [1, 1],
  ]),

  // L lớn (Corner 3x3 - 5 ô)
  createPreset('corner_big_0', 'L lớn · 0°', 'lj', [
    [1, 0, 0],
    [1, 0, 0],
    [1, 1, 1],
  ]),
  createPreset('corner_big_90', 'L lớn · 90°', 'lj', [
    [1, 1, 1],
    [1, 0, 0],
    [1, 0, 0],
  ]),
  createPreset('corner_big_180', 'L lớn · 180°', 'lj', [
    [1, 1, 1],
    [0, 0, 1],
    [0, 0, 1],
  ]),
  createPreset('corner_big_270', 'L lớn · 270°', 'lj', [
    [0, 0, 1],
    [0, 0, 1],
    [1, 1, 1],
  ]),

  // Chữ L 4 ô chuẩn (3x2 và 2x3)
  createPreset('L_std_0', 'L 4 ô · 0°', 'lj', [
    [1, 0],
    [1, 0],
    [1, 1],
  ]),
  createPreset('L_std_90', 'L 4 ô · 90°', 'lj', [
    [1, 1, 1],
    [1, 0, 0],
  ]),
  createPreset('L_std_180', 'L 4 ô · 180°', 'lj', [
    [1, 1],
    [0, 1],
    [0, 1],
  ]),
  createPreset('L_std_270', 'L 4 ô · 270°', 'lj', [
    [0, 0, 1],
    [1, 1, 1],
  ]),

  // Chữ J (L lật ngược 4 ô chuẩn)
  createPreset('J_std_0', 'J (L lật) · 0°', 'lj', [
    [0, 1],
    [0, 1],
    [1, 1],
  ]),
  createPreset('J_std_90', 'J (L lật) · 90°', 'lj', [
    [1, 0, 0],
    [1, 1, 1],
  ]),
  createPreset('J_std_180', 'J (L lật) · 180°', 'lj', [
    [1, 1],
    [1, 0],
    [1, 0],
  ]),
  createPreset('J_std_270', 'J (L lật) · 270°', 'lj', [
    [1, 1, 1],
    [0, 0, 1],
  ]),

  // ==========================================
  // 4. T / Z / S (Đầy đủ cả bản xuôi và bản lật ngược đối xứng)
  // ==========================================
  createPreset('T_0', 'T · 0°', 'tzs', [
    [1, 1, 1],
    [0, 1, 0],
  ]),
  createPreset('T_90', 'T · 90°', 'tzs', [
    [1, 0],
    [1, 1],
    [1, 0],
  ]),
  createPreset('T_180', 'T · 180°', 'tzs', [
    [0, 1, 0],
    [1, 1, 1],
  ]),
  createPreset('T_270', 'T · 270°', 'tzs', [
    [0, 1],
    [1, 1],
    [0, 1],
  ]),

  // Z-Shape (4 góc xoay)
  createPreset('Z_0', 'Z · 0°', 'tzs', [
    [1, 1, 0],
    [0, 1, 1],
  ]),
  createPreset('Z_90', 'Z · 90°', 'tzs', [
    [0, 1],
    [1, 1],
    [1, 0],
  ]),
  createPreset('Z_180', 'Z · 180°', 'tzs', [
    [0, 1, 1],
    [1, 1, 0],
  ]),
  createPreset('Z_270', 'Z · 270°', 'tzs', [
    [1, 0],
    [1, 1],
    [0, 1],
  ]),

  // S-Shape (Z lật ngược - 4 góc xoay)
  createPreset('S_0', 'S (Z lật) · 0°', 'tzs', [
    [0, 1, 1],
    [1, 1, 0],
  ]),
  createPreset('S_90', 'S (Z lật) · 90°', 'tzs', [
    [1, 0],
    [1, 1],
    [0, 1],
  ]),
  createPreset('S_180', 'S (Z lật) · 180°', 'tzs', [
    [1, 1, 0],
    [0, 1, 1],
  ]),
  createPreset('S_270', 'S (Z lật) · 270°', 'tzs', [
    [0, 1],
    [1, 1],
    [1, 0],
  ]),

  // ==========================================
  // 5. ĐƯỜNG CHÉO (Cả hướng chính và hướng lật ngược đối xứng)
  // ==========================================
  createPreset('diag_2_main', 'Đường chéo 2 · Chính', 'diagonal', [
    [1, 0],
    [0, 1],
  ]),
  createPreset('diag_2_flip', 'Đường chéo 2 · Lật ngược', 'diagonal', [
    [0, 1],
    [1, 0],
  ]),
  createPreset('diag_3_main', 'Đường chéo 3 · Chính', 'diagonal', [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]),
  createPreset('diag_3_flip', 'Đường chéo 3 · Lật ngược', 'diagonal', [
    [0, 0, 1],
    [0, 1, 0],
    [1, 0, 0],
  ]),
  createPreset('diag_4_main', 'Đường chéo 4 · Chính', 'diagonal', [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ]),
  createPreset('diag_4_flip', 'Đường chéo 4 · Lật ngược', 'diagonal', [
    [0, 0, 0, 1],
    [0, 0, 1, 0],
    [0, 1, 0, 0],
    [1, 0, 0, 0],
  ]),

  // ==========================================
  // 6. KHỐI MỚI (Từ ảnh người dùng: Mẫu 1, 2, 3, 4 + lật ngược)
  // ==========================================

  // --- MẪU 1: Khối chữ nhật đặc 2×3 (6 ô) ---
  createPreset('m1_2x3_0', 'Mẫu 1 · 2×3 (6 ô) · 0°', 'new', [
    [1, 1],
    [1, 1],
    [1, 1],
  ]),
  createPreset('m1_2x3_90', 'Mẫu 1 · 2×3 (6 ô) · 90°', 'new', [
    [1, 1, 1],
    [1, 1, 1],
  ]),
  createPreset('m1_2x3_180', 'Mẫu 1 · 2×3 (6 ô) · 180°', 'new', [
    [1, 1],
    [1, 1],
    [1, 1],
  ]),
  createPreset('m1_2x3_270', 'Mẫu 1 · 2×3 (6 ô) · 270°', 'new', [
    [1, 1, 1],
    [1, 1, 1],
  ]),

  // --- MẪU 2: Bậc 5 (5 ô) - Khối 2x3 khuyết 1 ô cạnh giữa ---
  createPreset('m2_b5_0', 'Mẫu 2 · bậc 5 (5 ô) · 0°', 'new', [
    [1, 1],
    [1, 0],
    [1, 1],
  ]),
  createPreset('m2_b5_90', 'Mẫu 2 · bậc 5 (5 ô) · 90°', 'new', [
    [1, 1, 1],
    [1, 0, 1],
  ]),
  createPreset('m2_b5_180', 'Mẫu 2 · bậc 5 (5 ô) · 180°', 'new', [
    [1, 1],
    [0, 1],
    [1, 1],
  ]),
  createPreset('m2_b5_270', 'Mẫu 2 · bậc 5 (5 ô) · 270°', 'new', [
    [1, 0, 1],
    [1, 1, 1],
  ]),

  // Mẫu 2 LẬT NGƯỢC (Đảm bảo đầy đủ cả 2 chiều đối xứng)
  createPreset('m2_b5_flip_0', 'Mẫu 2 lật · bậc 5 · 0°', 'new', [
    [1, 1],
    [0, 1],
    [1, 1],
  ]),
  createPreset('m2_b5_flip_90', 'Mẫu 2 lật · bậc 5 · 90°', 'new', [
    [1, 0, 1],
    [1, 1, 1],
  ]),
  createPreset('m2_b5_flip_180', 'Mẫu 2 lật · bậc 5 · 180°', 'new', [
    [1, 1],
    [1, 0],
    [1, 1],
  ]),
  createPreset('m2_b5_flip_270', 'Mẫu 2 lật · bậc 5 · 270°', 'new', [
    [1, 1, 1],
    [1, 0, 1],
  ]),

  // --- MẪU 3: Bậc 4 (4 ô) - Cột 3 ô + 1 ô gắn ở góc (nhánh 2x3 khuyết 2 ô) ---
  createPreset('m3_b4_0', 'Mẫu 3 · bậc 4 (4 ô) · 0°', 'new', [
    [1, 1],
    [1, 0],
    [1, 0],
  ]),
  createPreset('m3_b4_90', 'Mẫu 3 · bậc 4 (4 ô) · 90°', 'new', [
    [1, 1, 1],
    [0, 0, 1],
  ]),
  createPreset('m3_b4_180', 'Mẫu 3 · bậc 4 (4 ô) · 180°', 'new', [
    [0, 1],
    [0, 1],
    [1, 1],
  ]),
  createPreset('m3_b4_270', 'Mẫu 3 · bậc 4 (4 ô) · 270°', 'new', [
    [1, 0, 0],
    [1, 1, 1],
  ]),

  // Mẫu 3 LẬT NGƯỢC (Cột bên phải hoặc ô phụ gắn ngược chiều)
  createPreset('m3_b4_flip_0', 'Mẫu 3 lật · bậc 4 · 0°', 'new', [
    [1, 1],
    [0, 1],
    [0, 1],
  ]),
  createPreset('m3_b4_flip_90', 'Mẫu 3 lật · bậc 4 · 90°', 'new', [
    [0, 0, 1],
    [1, 1, 1],
  ]),
  createPreset('m3_b4_flip_180', 'Mẫu 3 lật · bậc 4 · 180°', 'new', [
    [1, 0],
    [1, 0],
    [1, 1],
  ]),
  createPreset('m3_b4_flip_270', 'Mẫu 3 lật · bậc 4 · 270°', 'new', [
    [1, 1, 1],
    [1, 0, 0],
  ]),

  // --- MẪU 4: Bậc 5 (5 ô) - Khối T mở rộng / Lạc đà (Cột 3 + nhô 2 ô cạnh) ---
  createPreset('m4_b5_0', 'Mẫu 4 · bậc 5 (5 ô) · 0°', 'new', [
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 0],
  ]),
  createPreset('m4_b5_90', 'Mẫu 4 · bậc 5 (5 ô) · 90°', 'new', [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ]),
  createPreset('m4_b5_180', 'Mẫu 4 · bậc 5 (5 ô) · 180°', 'new', [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
  ]),
  createPreset('m4_b5_270', 'Mẫu 4 · bậc 5 (5 ô) · 270°', 'new', [
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ]),

  // Mẫu 4 LẬT NGƯỢC (Tùy biến lật đối xứng)
  createPreset('m4_b5_flip_0', 'Mẫu 4 lật · bậc 5 · 0°', 'new', [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 1],
  ]),
  createPreset('m4_b5_flip_90', 'Mẫu 4 lật · bậc 5 · 90°', 'new', [
    [0, 1, 0],
    [0, 1, 0],
    [1, 1, 1],
  ]),
  createPreset('m4_b5_flip_180', 'Mẫu 4 lật · bậc 5 · 180°', 'new', [
    [1, 0, 0],
    [1, 1, 1],
    [1, 0, 0],
  ]),
  createPreset('m4_b5_flip_270', 'Mẫu 4 lật · bậc 5 · 270°', 'new', [
    [1, 1, 1],
    [0, 1, 0],
    [0, 1, 0],
  ]),

  // Các khối đặc biệt khác (Dấu cộng, chữ U)
  createPreset('plus_5', 'Dấu cộng 5', 'new', [
    [0, 1, 0],
    [1, 1, 1],
    [0, 1, 0],
  ]),
  createPreset('u_shape', 'Chữ U 5', 'new', [
    [1, 0, 1],
    [1, 1, 1],
  ]),
  createPreset('u_shape_flip', 'Chữ U lật ngược 5', 'new', [
    [1, 1, 1],
    [1, 0, 1],
  ]),
];

export const SHAPES_MAP = new Map<string, PieceShape>(
  PRESET_SHAPES.map((s) => [s.id, s])
);

// Compatibility aliases for legacy IDs and test cases
const ALIASES: Record<string, string> = {
  line_2_h: 'bar_2_h',
  line_2_v: 'bar_2_v',
  line_3_h: 'bar_3_h',
  line_3_v: 'bar_3_v',
  line_4_h: 'bar_4_h',
  line_4_v: 'bar_4_v',
  line_5_h: 'bar_5_h',
  line_5_v: 'bar_5_v',
  corner_small_tl: 'corner_small_90',
  corner_small_tr: 'corner_small_180',
  corner_small_bl: 'corner_small_0',
  corner_small_br: 'corner_small_270',
  corner_big_tl: 'corner_big_90',
  corner_big_tr: 'corner_big_180',
  corner_big_bl: 'corner_big_0',
  corner_big_br: 'corner_big_270',
  T_2x3_down: 'T_0',
  T_3x2_left: 'T_90',
  T_2x3_up: 'T_180',
  T_3x2_right: 'T_270',
  Z_2x3: 'Z_0',
  Z_3x2: 'Z_90',
  L_3x2_0: 'corner_small_0',
  diag_2: 'diag_2_main',
  diag_3: 'diag_3_main',
};

for (const [alias, target] of Object.entries(ALIASES)) {
  const shape = SHAPES_MAP.get(target);
  if (shape) {
    SHAPES_MAP.set(alias, shape);
  }
}

export function getShapeById(id: string): PieceShape | undefined {
  return SHAPES_MAP.get(id);
}

let cachedUniqueShapes: PieceShape[] | null = null;

/**
 * Returns all geometrically unique shapes present across the library.
 * Filters out rotational/reflection clones that map to the identical cell matrix.
 */
export function getUniqueShapes(): PieceShape[] {
  if (cachedUniqueShapes) return cachedUniqueShapes;

  const seenKeys = new Set<string>();
  const uniqueList: PieceShape[] = [];

  for (const shape of PRESET_SHAPES) {
    const key = getCanonicalShapeKey(shape);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueList.push(shape);
    }
  }

  cachedUniqueShapes = uniqueList;
  return uniqueList;
}

/**
 * Returns all valid oriented shape variants declared in the catalog.
 */
export function getValidVariants(): PieceShape[] {
  return PRESET_SHAPES;
}

/**
 * Returns representative base shapes (parent polyominoes before rotation or reflection).
 */
export function getBaseShapes(): PieceShape[] {
  const baseMap = new Map<string, PieceShape>();
  for (const s of PRESET_SHAPES) {
    // Extract base family identifier
    const baseId = s.id.replace(/_(0|90|180|270|h|v|main|flip|tl|tr|bl|br)/g, '');
    if (!baseMap.has(baseId)) {
      baseMap.set(baseId, s);
    }
  }
  return Array.from(baseMap.values());
}

/**
 * In Block Blast, all unique oriented geometric shapes present in the preset catalog
 * are eligible to spawn in the bottom tray.
 */
export function getSpawnableShapes(): PieceShape[] {
  return getUniqueShapes();
}

