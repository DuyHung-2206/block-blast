import React from 'react';
import { BoardMatrix, PlacedStep } from '../core/types.js';

interface BoardViewProps {
  board: BoardMatrix;
  onCellClick?: (r: number, c: number) => void;
  interactive?: boolean;
  highlightStep?: PlacedStep | null;
  cellConfidences?: number[][];
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BoardView: React.FC<BoardViewProps> = ({
  board,
  onCellClick,
  interactive = false,
  highlightStep = null,
  cellConfidences,
  label,
  size = 'md',
}) => {
  const cellSizeClass =
    size === 'sm'
      ? 'w-6 h-6 text-[9px]'
      : size === 'lg'
      ? 'w-11 h-11 text-xs'
      : 'w-8 h-8 text-[11px] sm:w-9 sm:h-9';

  return (
    <div className="flex flex-col items-center">
      {label && (
        <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          {label}
        </div>
      )}
      <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="grid grid-cols-8 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-800/80">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const occupied = cell === 1;
              const isClearedRow = highlightStep?.clearedRows?.includes(r);
              const isClearedCol = highlightStep?.clearedCols?.includes(c);
              const isCleared = isClearedRow || isClearedCol;

              let cellBg = occupied
                ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-sm shadow-indigo-500/20 border-indigo-400/30'
                : 'bg-slate-900/70 border-slate-800/50 hover:border-slate-700';

              if (isCleared) {
                cellBg = 'bg-gradient-to-br from-amber-400 to-amber-600 animate-pulse border-amber-300';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  disabled={!interactive}
                  onClick={() => interactive && onCellClick && onCellClick(r, c)}
                  className={`${cellSizeClass} rounded-lg border transition-all duration-150 flex items-center justify-center font-mono ${cellBg} ${
                    interactive
                      ? 'cursor-pointer hover:scale-105 active:scale-95'
                      : 'cursor-default'
                  }`}
                  title={`(${r}, ${c}) ${occupied ? 'Occupied' : 'Empty'}`}
                >
                  {cellConfidences && cellConfidences[r]?.[c] < 0.65 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
