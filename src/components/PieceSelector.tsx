import React from 'react';
import { PieceShape } from '../core/types.js';

interface PieceSelectorProps {
  selectedPiece: PieceShape | null;
  onSelect: (piece: PieceShape) => void;
  availableShapes: PieceShape[];
  slotIndex: number;
}

export const PieceSelector: React.FC<PieceSelectorProps> = ({
  selectedPiece,
  onSelect,
  availableShapes,
  slotIndex,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-semibold text-slate-400 mb-1">
        Piece Slot #{slotIndex + 1}
      </div>

      {/* Main Display Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-28 h-28 rounded-2xl border-2 flex flex-col items-center justify-center p-2 cursor-pointer transition-all ${
          selectedPiece
            ? 'bg-slate-900/90 border-indigo-500/60 shadow-lg shadow-indigo-500/10 hover:border-indigo-400'
            : 'bg-slate-900/40 border-dashed border-slate-700 hover:border-slate-500'
        }`}
      >
        {selectedPiece ? (
          <div className="flex flex-col items-center">
            <div
              className="grid gap-1 mb-1.5"
              style={{
                gridTemplateColumns: `repeat(${selectedPiece.width}, minmax(0, 1fr))`,
              }}
            >
              {selectedPiece.matrix.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      cell === 1 ? 'shadow-sm' : 'opacity-0'
                    }`}
                    style={{ backgroundColor: cell === 1 ? selectedPiece.color : 'transparent' }}
                  />
                ))
              )}
            </div>
            <div className="text-[10px] font-medium text-slate-300 truncate max-w-[100px]">
              {selectedPiece.name}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 text-center">
            Click to select shape
          </div>
        )}
      </div>

      {/* Modal / Dropdown Picker */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-200">
                Choose Shape for Slot #{slotIndex + 1}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white px-2 py-1 text-sm bg-slate-800 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 overflow-y-auto pr-1">
              {availableShapes.map((shape) => (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => {
                    onSelect(shape);
                    setIsOpen(false);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center h-20 transition-all ${
                    selectedPiece?.id === shape.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div
                    className="grid gap-0.5 mb-1"
                    style={{
                      gridTemplateColumns: `repeat(${shape.width}, minmax(0, 1fr))`,
                    }}
                  >
                    {shape.matrix.map((row, r) =>
                      row.map((cell, c) => (
                        <div
                          key={`${r}-${c}`}
                          className={`w-2 h-2 rounded-[2px] ${
                            cell === 1 ? '' : 'opacity-0'
                          }`}
                          style={{
                            backgroundColor: cell === 1 ? shape.color : 'transparent',
                          }}
                        />
                      ))
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 truncate w-full text-center">
                    {shape.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
