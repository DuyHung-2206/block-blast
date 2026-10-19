import React from 'react';
import { VerifiedSolution, PieceShape } from '../core/types.js';
import { BoardView } from './BoardView.js';

interface SolutionViewerProps {
  solutions: VerifiedSolution[];
  selectedSolution: VerifiedSolution | null;
  onSelectSolution: (sol: VerifiedSolution) => void;
  pieces: PieceShape[];
}

export const SolutionViewer: React.FC<SolutionViewerProps> = ({
  solutions,
  selectedSolution,
  onSelectSolution,
  pieces,
}) => {
  const [activeStepIdx, setActiveStepIdx] = React.useState<number>(0);

  React.useEffect(() => {
    setActiveStepIdx(0);
  }, [selectedSolution?.id]);

  if (!selectedSolution) {
    return null;
  }

  const currentStep = selectedSolution.steps[activeStepIdx];
  const stepBoard = currentStep?.boardAfterPlacement || selectedSolution.finalBoard;

  return (
    <div className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-200">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e293b] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 font-bold flex items-center justify-center text-lg">
            #{selectedSolution.rank || 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                Phương án đề xuất #{selectedSolution.rank || 1}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Đã kiểm chứng đủ 3 khối
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Điểm tương lai: <span className="font-semibold text-slate-200">{selectedSolution.futureScore}</span> · Sống sót: <span className="font-semibold text-blue-400">Độ sâu {selectedSolution.predictedSurvivalDepth}</span>
            </div>
          </div>
        </div>

        {/* Permutation Sequence */}
        <div className="flex items-center gap-2 bg-[#090d16] px-3 py-1.5 rounded-xl border border-[#1e293b]">
          <span className="text-xs text-slate-400 font-medium">Thứ tự đặt:</span>
          {selectedSolution.steps.map((st, i) => (
            <React.Fragment key={i}>
              <span className="px-2 py-0.5 rounded bg-blue-600/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                Khối {st.pieceIndex + 1}
              </span>
              {i < 2 && <span className="text-slate-600 text-xs">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Strategic Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#090d16] border border-[#1e293b] p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400">Chỗ trống khối 3×3</div>
          <div className="text-base font-bold text-amber-400 mt-0.5">
            {selectedSolution.open3x3Slots} vị trí
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e293b] p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400">Đường 5 ô mở</div>
          <div className="text-base font-bold text-cyan-400 mt-0.5">
            {selectedSolution.openLine5Slots} vị trí
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e293b] p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400">Tổng dòng xóa</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">
            {selectedSolution.linesClearedTotal} dòng
          </div>
        </div>

        <div className="bg-[#090d16] border border-[#1e293b] p-2.5 rounded-xl">
          <div className="text-[10px] text-slate-400">Ô cô lập (chết)</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">
            {selectedSolution.isolatedHoles} ô
          </div>
        </div>
      </div>

      {/* Step Visualizer */}
      <div className="flex flex-col items-center">
        <BoardView
          board={stepBoard}
          highlightStep={currentStep}
          size="md"
          label={`Mô phỏng sau Bước ${activeStepIdx + 1} (Đặt Khối ${currentStep?.pieceIndex + 1})`}
        />
      </div>

      {/* Step Stepper List */}
      <div className="flex flex-col gap-2">
        {selectedSolution.steps.map((step, idx) => {
          const piece = pieces[step.pieceIndex];
          const isActive = activeStepIdx === idx;
          const clearedLines = step.clearedRows.length + step.clearedCols.length;

          return (
            <div
              key={idx}
              onClick={() => setActiveStepIdx(idx)}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                isActive
                  ? 'bg-blue-600/10 border-blue-500 shadow-md'
                  : 'bg-[#090d16] border-[#1e293b] hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Đặt Khối #{step.pieceIndex + 1} ({piece?.name || step.pieceId})
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tọa độ góc trên: hàng <span className="text-blue-300 font-mono">{step.row}</span>, cột <span className="text-blue-300 font-mono">{step.col}</span>
                    </div>
                  </div>
                </div>

                {clearedLines > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    +{clearedLines} Dòng Xóa!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Solutions Picker */}
      {solutions.length > 1 && (
        <div className="pt-3 border-t border-[#1e293b]">
          <div className="text-xs text-slate-400 mb-2">
            Chọn các phương án hợp lệ khác ({solutions.length}):
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {solutions.slice(0, 8).map((sol) => (
              <button
                key={sol.id}
                type="button"
                onClick={() => onSelectSolution(sol)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  sol.id === selectedSolution.id
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
  );
};
