import React from 'react';
import { BoardMatrix, PieceShape, SolveResult, VerifiedSolution } from './core/types.js';
import { getShapeById, normalizeMatrix } from './core/shapes.js';
import { Exact3PieceSolver } from './core/ExactSolver.js';
import { FutureStatePlanner, PlanningStrategy } from './core/FuturePlanner.js';
import { Section01Vision } from './components/Section01Vision.js';
import { Section02Board } from './components/Section02Board.js';
import { Section03Pieces } from './components/Section03Pieces.js';
import { Section05StepViewer } from './components/Section05StepViewer.js';
import { Play, CheckCircle2, AlertTriangle } from 'lucide-react';

function createEmptyBoard(): BoardMatrix {
  return Array.from({ length: 8 }, () => Array(8).fill(0));
}

function createEmpty5x5(): number[][] {
  return Array.from({ length: 5 }, () => Array(5).fill(0));
}

export function App() {
  const [board, setBoard] = React.useState<BoardMatrix>(() => createEmptyBoard());
  const [selectedSlot, setSelectedSlot] = React.useState<number>(0);

  // 3 slots 5x5 matrices for custom drawing
  const [slotMatrices, setSlotMatrices] = React.useState<number[][][]>([
    createEmpty5x5(),
    createEmpty5x5(),
    createEmpty5x5(),
  ]);

  // Normalized pieces for the 3 slots
  const [pieces, setPieces] = React.useState<(PieceShape | null)[]>([null, null, null]);

  // Strategy & Solver state
  const [strategy, setStrategy] = React.useState<PlanningStrategy>('balanced');
  const [solveResult, setSolveResult] = React.useState<SolveResult | null>(null);
  const [rankedSolutions, setRankedSolutions] = React.useState<VerifiedSolution[]>([]);
  const [selectedSolution, setSelectedSolution] = React.useState<VerifiedSolution | null>(null);
  const [isSolving, setIsSolving] = React.useState<boolean>(false);

  // Initial demo pieces
  React.useEffect(() => {
    const p1 = getShapeById('square_2x2');
    const p2 = getShapeById('bar_3_h');
    const p3 = getShapeById('corner_small_90');
    if (p1 && p2 && p3) {
      applyPresetShape(0, p1);
      applyPresetShape(1, p2);
      applyPresetShape(2, p3);
    }
  }, []);

  const handleToggleBoardCell = (r: number, c: number) => {
    setBoard((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = next[r][c] === 1 ? 0 : 1;
      return next;
    });
    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const handleClearBoard = () => {
    setBoard(createEmptyBoard());
    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const handleGenerateHardPuzzle = () => {
    const next = createEmptyBoard();
    // Fill ~35 cells randomly
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (Math.random() < 0.45) {
          next[r][c] = 1;
        }
      }
    }
    setBoard(next);
    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const handleInvertBoard = () => {
    setBoard((prev) => prev.map((row) => row.map((cell) => (cell === 1 ? 0 : 1))));
    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const handleToggle5x5Cell = (slotIdx: number, r: number, c: number) => {
    const nextMatrices = slotMatrices.map((m, sIdx) => {
      if (sIdx !== slotIdx) return m;
      const copy = m.map((row) => [...row]);
      copy[r][c] = copy[r][c] === 1 ? 0 : 1;
      return copy;
    });
    setSlotMatrices(nextMatrices);

    // Normalize piece
    const normalized = normalizeMatrix(nextMatrices[slotIdx]);
    const nextPieces = [...pieces];
    nextPieces[slotIdx] = normalized;
    setPieces(nextPieces);

    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const applyPresetShape = (slotIdx: number, shape: PieceShape) => {
    // Fill centered into 5x5
    const new5x5 = createEmpty5x5();
    const startR = Math.max(0, Math.floor((5 - shape.height) / 2));
    const startC = Math.max(0, Math.floor((5 - shape.width) / 2));

    for (let r = 0; r < shape.height; r++) {
      for (let c = 0; c < shape.width; c++) {
        if (shape.matrix[r][c] === 1) {
          new5x5[startR + r][startC + c] = 1;
        }
      }
    }

    const nextMatrices = [...slotMatrices];
    nextMatrices[slotIdx] = new5x5;
    setSlotMatrices(nextMatrices);

    const nextPieces = [...pieces];
    nextPieces[slotIdx] = shape;
    setPieces(nextPieces);

    setSolveResult(null);
    setRankedSolutions([]);
    setSelectedSolution(null);
  };

  const handleSolve = () => {
    if (pieces.some((p) => p === null)) {
      alert('Vui lòng thiết kế hoặc chọn đủ 3 khối gạch trước khi giải.');
      return;
    }

    setIsSolving(true);
    setTimeout(() => {
      const validPieces = pieces as PieceShape[];
      // Tầng A: Exact 3-Piece Solver
      const res = Exact3PieceSolver.solve(board, validPieces, {
        maxSolutions: 150,
        timeLimitMs: 4000,
      });
      setSolveResult(res);

      if (res.status === 'SOLVED_COMPLETE' && res.solutions.length > 0) {
        // Tầng B: Future-State Strategic Planner
        const ranked = FutureStatePlanner.rankSolutions(res.solutions, {
          strategy,
          scenarioMode: 'representative',
          futureDepth: strategy === 'deep' ? 3 : 2,
          maxScenarios: strategy === 'fast' ? 12 : strategy === 'deep' ? 30 : 18,
        });
        setRankedSolutions(ranked);
        setSelectedSolution(ranked[0]);
      } else {
        setRankedSolutions([]);
        setSelectedSolution(null);
      }
      setIsSolving(false);
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans pb-16 selection:bg-blue-600 selection:text-white">
      {/* Top App Header matching exact screenshot */}
      <header className="px-5 pt-7 pb-4 max-w-xl mx-auto w-full">
        <div className="text-[11px] font-mono tracking-widest text-blue-400 uppercase font-semibold mb-1">
          PUZZLE INTELLIGENCE LAB
        </div>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-blue-500/25">
            B!
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Block Blast! Pro Solver
            </h1>
            <p className="text-xs text-slate-400">
              Vision Analyzer · Robust Future Search · Step-by-Step Visualizer
            </p>
          </div>
        </div>
      </header>

      {/* Main Stack Content */}
      <main className="max-w-xl mx-auto w-full px-4 flex flex-col gap-6">
        {/* Section 01: Phân tích ảnh chụp */}
        <Section01Vision
          onApplyBoard={(scannedBoard) => {
            setBoard(scannedBoard);
            setSolveResult(null);
            setRankedSolutions([]);
            setSelectedSolution(null);
          }}
          onApplyPiece={(slotIdx, shape) => {
            applyPresetShape(slotIdx, shape);
          }}
        />

        {/* Section 02: Bàn cờ tương tác 8x8 */}
        <Section02Board
          board={board}
          onToggleCell={handleToggleBoardCell}
          onClearBoard={handleClearBoard}
          onGenerateHardPuzzle={handleGenerateHardPuzzle}
          onInvertBoard={handleInvertBoard}
        />

        {/* Section 03: Thiết kế 3 khối gạch & Quick Shape Presets */}
        <Section03Pieces
          selectedSlot={selectedSlot}
          onSelectSlot={setSelectedSlot}
          pieces={pieces}
          slotMatrices={slotMatrices}
          onToggle5x5Cell={handleToggle5x5Cell}
          onApplyPresetShape={applyPresetShape}
        />

        {/* Strategy Selector & Big Action Button */}
        <div className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold">Mức độ phân tích tương lai:</span>
            <div className="flex rounded-xl bg-[#0a0e17] p-1 border border-[#1e293b]">
              {[
                { id: 'fast', label: 'Nhanh' },
                { id: 'balanced', label: 'Cân bằng' },
                { id: 'deep', label: 'Chuyên sâu' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStrategy(st.id as PlanningStrategy)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    strategy === st.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={isSolving || pieces.some((p) => p === null)}
            onClick={handleSolve}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isSolving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang phân tích 3! hoán vị & đường đi tương lai...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Tìm kiếm nước đi hoàn chỉnh (Đủ cả 3 khối)</span>
              </>
            )}
          </button>
        </div>

        {/* Solver Result Feedback */}
        {solveResult && (
          <div
            className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
              solveResult.status === 'SOLVED_COMPLETE'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                : solveResult.status === 'NO_COMPLETE_SOLUTION'
                ? 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                : solveResult.status === 'SEARCH_INCOMPLETE'
                ? 'bg-amber-950/20 border-amber-500/30 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {solveResult.status === 'SOLVED_COMPLETE' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : solveResult.status === 'NO_COMPLETE_SOLUTION' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span>
                {solveResult.status === 'SOLVED_COMPLETE' && 'Tìm thấy phương án đặt đủ 3 khối thành công!'}
                {solveResult.status === 'NO_COMPLETE_SOLUTION' && 'Chứng minh vô nghiệm: Không thể đặt đủ cả 3 khối (NO_COMPLETE_SOLUTION)'}
                {solveResult.status === 'SEARCH_INCOMPLETE' && 'Chưa tìm thấy lời giải trong giới hạn hiện tại (SEARCH_INCOMPLETE)'}
                {solveResult.status === 'INPUT_UNCERTAIN' && 'Dữ liệu đầu vào chưa chắc chắn (INPUT_UNCERTAIN)'}
                {solveResult.status === 'INTERNAL_ERROR' && 'Lỗi xử lý nội bộ (INTERNAL_ERROR)'}
              </span>
            </div>
            <div className="text-xs opacity-90 leading-relaxed">
              {solveResult.message}
            </div>
            <div className="text-[11px] opacity-75 font-mono">
              Đã xét {solveResult.nodesVisited} trạng thái trong {solveResult.timeMs}ms · {solveResult.allSolutionsEnumerated ? 'Đã duyệt toàn bộ không gian nghiệm' : 'Dừng sớm theo giới hạn'} · {solveResult.verifiedSolutionCount} nghiệm đạt chuẩn 100%.
            </div>
          </div>
        )}

        {/* 05 / Trình xem từng bước (Luôn hiển thị ở cuối, có trạng thái trống và trạng thái giải) */}
        <Section05StepViewer
          initialBoard={board}
          solution={selectedSolution}
          solutions={rankedSolutions}
          onSelectSolution={setSelectedSolution}
          pieces={pieces}
          nodesVisited={solveResult?.nodesVisited}
          onApplyFinalBoard={(newBoard) => {
            setBoard(newBoard);
            setSolveResult(null);
            setRankedSolutions([]);
            setSelectedSolution(null);
          }}
        />
      </main>
    </div>
  );
}

export default App;
