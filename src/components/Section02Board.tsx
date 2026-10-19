import React from 'react';
import { BoardMatrix } from '../core/types.js';

interface Section02BoardProps {
  board: BoardMatrix;
  onToggleCell: (r: number, c: number) => void;
  onClearBoard: () => void;
  onGenerateHardPuzzle: () => void;
  onInvertBoard: () => void;
}

export const Section02Board: React.FC<Section02BoardProps> = ({
  board,
  onToggleCell,
  onClearBoard,
  onGenerateHardPuzzle,
  onInvertBoard,
}) => {
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const [dragPaintVal, setDragPaintVal] = React.useState<number>(1);

  // Count occupied cells
  const occupiedCount = board.flat().filter((c) => c === 1).length;

  // Count full rows & cols
  let fullRows = 0;
  for (let r = 0; r < 8; r++) {
    if (board[r].every((c) => c === 1)) fullRows++;
  }
  let fullCols = 0;
  for (let c = 0; c < 8; c++) {
    let allOccupied = true;
    for (let r = 0; r < 8; r++) {
      if (board[r][c] === 0) {
        allOccupied = false;
        break;
      }
    }
    if (allOccupied) fullCols++;
  }

  const handleMouseDown = (r: number, c: number) => {
    setIsDragging(true);
    const targetVal = board[r][c] === 1 ? 0 : 1;
    setDragPaintVal(targetVal);
    onToggleCell(r, c);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (isDragging) {
      if (board[r][c] !== dragPaintVal) {
        onToggleCell(r, c);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-5 shadow-xl flex flex-col gap-4 text-slate-200 select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <h2 className="text-base font-bold text-slate-100">
          02 / Bàn cờ tương tác 8×8
        </h2>
        <span className="text-xs font-mono font-medium text-slate-400">
          {occupiedCount} / 64 ô
        </span>
      </div>

      {/* 8x8 Grid Container */}
      <div className="flex flex-col items-center">
        <div className="bg-[#0b101c] p-2 rounded-2xl border border-[#1e293b] w-full max-w-[420px]">
          <div className="grid grid-cols-8 gap-1.5 p-1">
            {board.map((row, r) =>
              row.map((cell, c) => {
                const occupied = cell === 1;
                return (
                  <div
                    key={`${r}-${c}`}
                    onMouseDown={() => handleMouseDown(r, c)}
                    onMouseEnter={() => handleMouseEnter(r, c)}
                    className={`aspect-square rounded-lg border transition-all duration-100 flex items-center justify-center cursor-pointer ${
                      occupied
                        ? 'bg-blue-600/90 border-blue-400 shadow-sm shadow-blue-500/20'
                        : 'bg-[#141d2d] border-[#223049] hover:border-slate-500'
                    }`}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Footer info under grid */}
        <div className="flex items-center justify-between w-full max-w-[420px] mt-2.5 text-xs text-slate-400">
          <span>Kéo chuột/ngón tay để tô ô</span>
          <span>{fullRows} hàng · {fullCols} cột đầy</span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onClearBoard}
          className="py-3 px-2 rounded-xl bg-[#192337] hover:bg-[#22304a] text-slate-200 font-semibold text-xs border border-[#2b3a56] flex flex-col items-center justify-center transition-all cursor-pointer"
        >
          <span>Xóa sạch</span>
          <span>bàn cờ</span>
        </button>

        <button
          type="button"
          onClick={onGenerateHardPuzzle}
          className="py-3 px-2 rounded-xl bg-[#192337] hover:bg-[#22304a] text-slate-200 font-semibold text-xs border border-[#2b3a56] flex flex-col items-center justify-center transition-all cursor-pointer"
        >
          <span>Tạo thế cờ</span>
          <span>khó ngẫu</span>
          <span>nhiên</span>
        </button>

        <button
          type="button"
          onClick={onInvertBoard}
          className="py-3 px-2 rounded-xl bg-[#192337] hover:bg-[#22304a] text-slate-200 font-semibold text-xs border border-[#2b3a56] flex items-center justify-center transition-all cursor-pointer"
        >
          <span>Đảo ngược</span>
        </button>
      </div>
    </div>
  );
};
