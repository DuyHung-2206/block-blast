import React from 'react';
import { PieceShape } from '../core/types.js';
import { PRESET_SHAPES } from '../core/shapes.js';

interface Section03PiecesProps {
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  pieces: (PieceShape | null)[];
  slotMatrices: number[][][]; // 3 matrices of 5x5
  onToggle5x5Cell: (slotIdx: number, r: number, c: number) => void;
  onApplyPresetShape: (slotIdx: number, shape: PieceShape) => void;
}

type FilterCategory = 'all' | 'bar' | 'square' | 'lj' | 'tzs' | 'diagonal' | 'new';

export const Section03Pieces: React.FC<Section03PiecesProps> = ({
  selectedSlot,
  onSelectSlot,
  pieces,
  slotMatrices,
  onToggle5x5Cell,
  onApplyPresetShape,
}) => {
  const [activeFilter, setActiveFilter] = React.useState<FilterCategory>('all');

  const filteredPresets = PRESET_SHAPES.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.filterCat === activeFilter;
  });

  return (
    <div className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-5 shadow-xl flex flex-col gap-5 text-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <h2 className="text-base font-bold text-slate-100">
          03 / Thiết kế 3 khối gạch
        </h2>
        <span className="text-xs font-mono font-medium text-slate-400">
          3 × 5×5
        </span>
      </div>

      {/* 3 Slots Horizontal Grid */}
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((idx) => {
          const isCurrent = selectedSlot === idx;
          const piece = pieces[idx];
          const matrix5x5 = slotMatrices[idx];

          return (
            <div
              key={idx}
              onClick={() => onSelectSlot(idx)}
              className={`rounded-2xl p-3 border cursor-pointer transition-all flex flex-col items-center ${
                isCurrent
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/15'
                  : 'border-[#1e293b] bg-[#0c121e]/80 hover:border-slate-700'
              }`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-bold text-slate-200">
                  Khối {idx + 1}
                </span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                    isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#192337] text-slate-400'
                  }`}
                >
                  {isCurrent ? 'Đang chọn' : 'Chọn'}
                </span>
              </div>

              {/* 5x5 Mini Drawing Grid */}
              <div className="grid grid-cols-5 gap-1 p-1 bg-[#090d16] rounded-xl border border-[#1e293b] w-full max-w-[110px] aspect-square">
                {matrix5x5.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSlot(idx);
                        onToggle5x5Cell(idx, r, c);
                      }}
                      className={`aspect-square rounded-[3px] border cursor-pointer transition-colors ${
                        cell === 1
                          ? 'bg-blue-500 border-blue-400 shadow-sm'
                          : 'bg-[#131b2a] border-[#1d273a] hover:border-slate-600'
                      }`}
                    />
                  ))
                )}
              </div>

              {/* Status footer */}
              <div className="mt-2 text-[11px] text-slate-400 truncate text-center w-full">
                {piece ? piece.name : 'Khối trống'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Note */}
      <div className="border border-[#1e293b] bg-[#0c121e]/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed">
        Chọn khối 1, 2 hoặc 3 rồi bấm hình mẫu để nạp nhanh. Lưới 5×5 cho phép vẽ hình bất kỳ; thuật toán tự chuẩn hóa hình về tọa độ nhỏ nhất. Khối để trống sẽ được bỏ qua.
      </div>

      {/* Preset Shapes Header & Categories Filter */}
      <div className="flex flex-col gap-3 pt-2 border-t border-[#1e293b]">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-100">
            Thư viện hình mẫu
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Quick Shape Presets
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'bar', label: 'Thanh' },
            { id: 'square', label: 'Vuông' },
            { id: 'lj', label: 'L / J' },
            { id: 'tzs', label: 'T / Z / S' },
            { id: 'diagonal', label: 'Đường chéo' },
            { id: 'new', label: 'Khối mới' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveFilter(cat.id as FilterCategory)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeFilter === cat.id
                  ? 'bg-emerald-700/80 text-white border border-emerald-500/80 shadow-sm shadow-emerald-500/20'
                  : 'bg-[#162032] text-slate-400 hover:text-white border border-[#233149]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 4-Column Presets Grid matching exact reference screenshot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPresetShape(selectedSlot, preset)}
              className="p-3 rounded-2xl border border-[#1e293b] bg-[#0c121e]/90 hover:border-blue-500 hover:bg-[#141d2e] flex flex-col items-center justify-between h-28 transition-all cursor-pointer"
            >
              {/* Centered preview inside preset card */}
              <div className="flex-1 flex items-center justify-center">
                <div
                  className="grid gap-0.5"
                  style={{
                    gridTemplateColumns: `repeat(${preset.width}, minmax(0, 1fr))`,
                  }}
                >
                  {preset.matrix.map((row, r) =>
                    row.map((cell, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={`w-2.5 h-2.5 rounded-[2px] ${
                          cell === 1
                            ? 'bg-blue-400 border border-blue-300'
                            : 'opacity-0'
                        }`}
                      />
                    ))
                  )}
                </div>
              </div>

              <span className="text-[11px] font-medium text-slate-300 truncate w-full text-center">
                {preset.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
