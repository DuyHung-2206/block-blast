import { PieceShape } from './types.js';

export function normalizeMatrix(matrix: number[][]): PieceShape | null {
  const height = matrix.length;
  const width = matrix[0].length;
  let minR = height, maxR = -1, minC = width, maxC = -1;

  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      if (matrix[r][c] === 1) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
      }
    }
  }

  if (maxR === -1) return null; // empty shape

  const normH = maxR - minR + 1;
  const normW = maxC - minC + 1;
  const normMatrix: number[][] = Array.from({ length: normH }, () => Array(normW).fill(0));
  const cells: Array<[number, number]> = [];

  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      if (matrix[r][c] === 1) {
        normMatrix[r - minR][c - minC] = 1;
        cells.push([r - minR, c - minC]);
      }
    }
  }

  const id = `custom_${cells.map(([r, c]) => `${r}-${c}`).join('_')}`;

  return {
    id,
    name: 'Khối tùy chỉnh',
    category: 'custom' as any,
    color: '#60a5fa',
    matrix: normMatrix,
    cells,
    area: cells.length,
    width: normW,
    height: normH,
  };
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
