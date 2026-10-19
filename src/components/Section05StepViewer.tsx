import React from 'react';
import { BoardMatrix, VerifiedSolution, PieceShape } from '../core/types.js';
import { Check } from 'lucide-react';

interface Section05StepViewerProps {
  initialBoard: BoardMatrix;
  solutions?: VerifiedSolution[];
  solution: VerifiedSolution | null;
  onSelectSolution?: (sol: VerifiedSolution) => void;
  pieces: (PieceShape | null)[];
  nodesVisited?: number;
  onApplyFinalBoard: (finalBoard: BoardMatrix) => void;
}

export const Section05StepViewer: React.FC<Section05StepViewerProps> = ({
  initialBoard,
  solutions = [],
  solution,
  onSelectSolution,
  pieces,
  nodesVisited = 723,
  onApplyFinalBoard,
}) => {
  // Step: 0 = Trạng thái gốc, 1 = Bước 1, 2 = Bước 2, 3 = Bước 3
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(0);

  // Reset to step 0 or step 3 when solution changes
  React.useEffect(() => {
    if (solution) {
      setCurrentStepIndex(solution.steps.length); // default to final step 3 as in screenshot
    } else {
      setCurrentStepIndex(0);
    }
  }, [solution?.id]);

  // Determine current display board & step info
  let currentBoard: BoardMatrix = initialBoard;
  let subTitleLeft = 'Trạng thái gốc';
  let subTitleRight = 'Chưa đặt khối';
  let activePlacedCells: Array<{ r: number; c: number; stepNum: number }> = [];
  let clearedRows: number[] = [];
  let clearedCols: number[] = [];

  if (solution && currentStepIndex > 0) {
    const step = solution.steps[currentStepIndex - 1];
    currentBoard = step.boardAfterPlacement;
    const piece = pieces[step.pieceIndex];
    subTitleLeft = `Bước ${currentStepIndex}: Khối ${step.pieceIndex + 1} tại hàng ${step.row + 1}, cột ${step.col + 1}`;
    subTitleRight = `Xóa ${step.clearedRows.length} hàng + ${step.clearedCols.length} cột`;
    clearedRows = step.clearedRows;
    clearedCols = step.clearedCols;

    // Track placed cells for this piece
    if (piece) {
      for (const [dr, dc] of piece.cells) {
        activePlacedCells.push({
          r: step.row + dr,
          c: step.col + dc,
          stepNum: currentStepIndex,
        });
      }
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (solution && currentStepIndex < solution.steps.length) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleApply = () => {
    if (solution) {
      onApplyFinalBoard(solution.finalBoard);
    }
  };

  return (
    <div className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <h2 className="text-base font-bold text-slate-100">
          05 / Trình xem từng bước
        </h2>
        <span className="text-xs font-mono font-medium text-slate-400">
          {solution ? `${currentStepIndex} / ${solution.steps.length} bước` : 'Chưa có lời giải'}
        </span>
      </div>

      {/* Steps Pill Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {/* Step 0: Trạng thái gốc */}
        <button
          type="button"
          onClick={() => setCurrentStepIndex(0)}
          className={`py-2 px-3 rounded-xl border text-left flex flex-col min-w-[110px] transition-all cursor-pointer ${
            currentStepIndex === 0
              ? 'border-blue-500 bg-blue-500/10 shadow-sm'
              : 'border-[#1e293b] bg-[#0c121e]/80 hover:border-slate-700'
          }`}
        >
          <span className="text-xs font-bold text-slate-100">Trạng thái gốc</span>
          <span className="text-[10px] text-slate-400">Bàn cờ ban đầu</span>
        </button>

        {/* Steps 1, 2, 3 */}
        {[0, 1, 2].map((idx) => {
          const stepNum = idx + 1;
          const isAvailable = solution && solution.steps.length >= stepNum;
          const isCurrent = currentStepIndex === stepNum;

          if (!isAvailable) return null;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStepIndex(stepNum)}
              className={`py-2 px-3 rounded-xl border text-left flex flex-col min-w-[100px] transition-all cursor-pointer ${
                isCurrent
                  ? 'border-blue-500 bg-blue-500/10 shadow-sm'
                  : 'border-[#1e293b] bg-[#0c121e]/80 hover:border-slate-700'
              }`}
            >
              <span className="text-xs font-bold text-slate-100">
                Bước {stepNum}
              </span>
              <span className="text-[10px] text-slate-400">
                Khối {solution.steps[idx].pieceIndex + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* 8x8 Board Visualizer */}
      <div className="flex flex-col items-center">
        <div className="bg-[#0b101c] p-2 rounded-2xl border border-[#1e293b] w-full max-w-[420px]">
          <div className="grid grid-cols-8 gap-1.5 p-1">
            {currentBoard.map((row, r) =>
              row.map((cell, c) => {
                const occupied = cell === 1;
                const isClearedRow = clearedRows.includes(r);
                const isClearedCol = clearedCols.includes(c);
                const isCleared = isClearedRow || isClearedCol;

                // Check if this cell is one of the newly placed piece cells in this step
                const placedCell = activePlacedCells.find(
                  (ac) => ac.r === r && ac.c === c
                );

                let cellStyle = 'bg-[#141d2d] border-[#223049]';
                let cellContent: React.ReactNode = null;

                if (isCleared) {
                  // Glowing cleared line cell (as seen in screenshot 2 with white glow outline)
                  cellStyle = 'bg-[#1a253a] border-2 border-white shadow-md shadow-white/20';
                }

                if (placedCell) {
                  // Newly placed block in green tone with number label
                  cellStyle = 'bg-emerald-400/90 border-emerald-300 text-emerald-950 font-bold font-mono text-xs shadow-sm';
                  cellContent = placedCell.stepNum;
                } else if (occupied) {
                  // Normal occupied block in game blue
                  cellStyle = 'bg-blue-500 border-blue-400 shadow-sm';
                }

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`aspect-square rounded-lg border transition-all duration-150 flex items-center justify-center ${cellStyle}`}
                  >
                    {cellContent}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer info under grid */}
        <div className="flex items-center justify-between w-full max-w-[420px] mt-2.5 text-xs text-slate-400 font-medium">
          <span>{subTitleLeft}</span>
          <span>{subTitleRight}</span>
        </div>
      </div>

      {/* Prev / Next Navigation Buttons matching exact screenshot */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={currentStepIndex <= 0}
          onClick={handlePrev}
          className="py-3 px-4 rounded-xl bg-[#192337] hover:bg-[#22304a] disabled:opacity-40 text-slate-200 font-semibold text-xs border border-[#2b3a56] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <span>← Bước trước</span>
        </button>

        <button
          type="button"
          disabled={!solution || currentStepIndex >= solution.steps.length}
          onClick={handleNext}
          className="py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs border border-blue-400/50 flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
        >
          <span>Bước tiếp →</span>
        </button>
      </div>

      {/* Summary or Empty State description */}
      {solution ? (
        <div className="flex flex-col gap-3">
          <div className="text-xs text-slate-300 leading-relaxed bg-[#0a0f1d] p-3 rounded-xl border border-[#1e293b] flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">
                ✓ Lời giải hoàn chỉnh (Đặt đủ 3/3 khối)
              </span>
              <span className="text-[11px] font-semibold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-800/40">
                Điểm chiến lược: {Math.round(solution.futureScore)}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Giải phóng: {solution.linesClearedTotal} hàng/cột · {nodesVisited ?? '—'} trạng thái đã duyệt · Ô trống: {solution.freeCells} ô · Slot mở 3×3: {solution.open3x3Slots} · Slot mở 5-line: {solution.openLine5Slots} · Lỗ thủng cô lập: {solution.isolatedHoles}.
            </div>
            {solution.futureMetrics && (
              <div className="text-[11px] text-slate-400 pt-1.5 border-t border-[#1e293b]/60 flex flex-col gap-1 font-mono">
                <div className="text-emerald-400 font-sans font-medium flex items-center gap-1.5">
                  <span>● Trạng thái tương lai:</span>
                  <span>
                    {solution.futureMetrics.status === 'FUTURE_PATH_FOUND' && `Tìm thấy đường sống sót qua ${solution.predictedSurvivalDepth} lượt`}
                    {solution.futureMetrics.status === 'FUTURE_DEAD_END_FOUND' && 'Các kịch bản đã thử đều dẫn đến bế tắc (Cần thận trọng)'}
                    {solution.futureMetrics.status === 'FUTURE_PATH_FAILED' && 'Đã vét cạn toàn bộ kịch bản và xác nhận không có đường sống sót'}
                    {solution.futureMetrics.status === 'FUTURE_SEARCH_INCOMPLETE' && 'Tìm kiếm tương lai chưa hoàn tất'}
                  </span>
                </div>
                <div>
                  Mô phỏng tương lai: Đã thử {solution.futureMetrics.scenariosTested}/{solution.futureMetrics.totalPossibleTriplets} kịch bản bộ ba ({(solution.futureMetrics.scenarioCoverage * 100).toFixed(2)}% không gian N³).
                </div>
                <div>
                  Độ bao phủ thư viện: Phủ sóng {Math.round(solution.futureMetrics.shapeCoverage * 100)}% hình dạng độc nhất · Bàn cờ sau lượt đặt vừa {Math.round(solution.futureMetrics.fitRatio * 100)}% tổng số khối trong thư viện ({solution.futureMetrics.uniqueShapesCount} khối độc nhất).
                </div>
                <div className="text-slate-500 text-[10px]">
                  * Giới hạn: Còn {solution.futureMetrics.untestedScenariosCount} kịch bản chưa kiểm tra (áp dụng phương pháp kịch bản đại diện để tránh treo trình duyệt).
                </div>
              </div>
            )}
          </div>

          {/* 3 Step Cards matching exact screenshot with colored step badges */}
          <div className="flex flex-col gap-2.5">
            {solution.steps.map((step, idx) => {
              const piece = pieces[step.pieceIndex];
              const badgeColors = [
                'bg-blue-600 text-white',
                'bg-amber-600 text-white',
                'bg-emerald-600 text-white',
              ];

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx + 1)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                    currentStepIndex === idx + 1
                      ? 'bg-blue-600/10 border-blue-500 shadow-sm'
                      : 'border-[#1e293b] bg-[#0c121e]/80 hover:border-slate-700'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${badgeColors[idx % 3]}`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-100">
                      Khối {step.pieceIndex + 1} — hàng {step.row + 1}, cột {step.col + 1}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {piece?.area || 5} ô · {step.clearedRows.length + step.clearedCols.length} hàng/cột xóa · {step.clearedRows.length} hàng, {step.clearedCols.length} cột
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Multiple Complete Solutions Switcher */}
          {solutions.length > 1 && (
            <div className="pt-2 flex flex-col gap-1.5 border-t border-[#1e293b]">
              <span className="text-[11px] text-slate-400">
                Các phương án đặt đủ 3 khối khác ({solutions.length}):
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {solutions.slice(0, 8).map((sol) => (
                  <button
                    key={sol.id}
                    type="button"
                    onClick={() => onSelectSolution && onSelectSolution(sol)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      sol.id === solution.id
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-[#090d16] text-slate-400 border-[#1e293b] hover:border-slate-700'
                    }`}
                  >
                    Hạng #{sol.rank || 1} ({sol.futureScore} đ)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 leading-relaxed py-1">
          Lời giải sẽ xuất hiện tại đây sau khi chạy thuật toán.
        </div>
      )}

      {/* Apply Result Button & Caution Note matching exact screenshot */}
      <div className="pt-3 border-t border-[#1e293b] flex flex-col gap-2">
        <button
          type="button"
          disabled={!solution}
          onClick={handleApply}
          className="w-full py-3.5 rounded-xl bg-[#162235] hover:bg-[#1e2f49] disabled:opacity-40 text-slate-200 font-bold text-xs border border-[#2b3a56] flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span>✓ Áp dụng kết quả & bắt đầu lượt mới</span>
        </button>

        <div className="text-[11px] text-slate-400 leading-relaxed">
          Chỉ áp dụng khi đã có lời giải. Nếu thế cờ vô nghiệm, ứng dụng giữ phương án vớt vát tốt nhất để bạn cân nhắc trước khi tiếp tục.
        </div>
      </div>
    </div>
  );
};
