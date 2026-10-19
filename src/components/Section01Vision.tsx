import React from 'react';
import { Upload, Clipboard, Trash2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { BoardMatrix, PieceShape } from '../core/types.js';
import { normalizeMatrix } from '../core/shapes.js';

interface Section01VisionProps {
  onApplyBoard: (board: BoardMatrix) => void;
  onApplyPiece?: (slotIndex: number, piece: PieceShape) => void;
}

export const Section01Vision: React.FC<Section01VisionProps> = ({ onApplyBoard, onApplyPiece }) => {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [imageFileName, setImageFileName] = React.useState<string>('Không có tệp nào được chọn');
  const [boardY, setBoardY] = React.useState<number>(18);
  const [boardH, setBoardH] = React.useState<number>(50);
  const [trayY, setTrayY] = React.useState<number>(72);
  const [trayH, setTrayH] = React.useState<number>(24);
  const [showROI, setShowROI] = React.useState<boolean>(true);
  const [isScanning, setIsScanning] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileName(file.name);
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const url = URL.createObjectURL(blob);
            setImageSrc(url);
            setImageFileName('Ảnh từ clipboard');
            return;
          }
        }
      }
      alert('Không tìm thấy ảnh trong clipboard.');
    } catch (err) {
      alert('Trình duyệt chưa cấp quyền đọc clipboard. Hãy nhấn Ctrl + V trên trang web.');
    }
  };

  const handleClearImage = () => {
    setImageSrc(null);
    setImageFileName('Không có tệp nào được chọn');
  };

  const handleAutoScan = () => {
    if (!imageSrc) return;
    setIsScanning(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);

        // Calculate ROI in pixels
        const by = Math.floor((boardY / 100) * img.height);
        const bh = Math.floor((boardH / 100) * img.height);
        const bx = Math.floor(img.width * 0.05);
        const bw = Math.floor(img.width * 0.90);

        const imgData = ctx.getImageData(bx, by, bw, bh);
        const matrix: BoardMatrix = Array.from({ length: 8 }, () => Array(8).fill(0));

        const cellW = bw / 8;
        const cellH = bh / 8;

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const cx = Math.floor((c + 0.5) * cellW);
            const cy = Math.floor((r + 0.5) * cellH);

            let occupiedVotes = 0;
            let totalVotes = 0;
            for (let dy = -3; dy <= 3; dy += 3) {
              for (let dx = -3; dx <= 3; dx += 3) {
                const sx = Math.min(bw - 1, Math.max(0, cx + dx));
                const sy = Math.min(bh - 1, Math.max(0, cy + dy));
                const idx = (sy * bw + sx) * 4;
                const red = imgData.data[idx];
                const green = imgData.data[idx + 1];
                const blue = imgData.data[idx + 2];

                const brightness = (red + green + blue) / 3;
                const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);

                if (brightness > 65 && (saturation > 25 || brightness > 120)) {
                  occupiedVotes++;
                }
                totalVotes++;
              }
            }

            if (occupiedVotes / totalVotes > 0.45) {
              matrix[r][c] = 1;
            }
          }
        }

        onApplyBoard(matrix);

        // Scan Tray 3 Pieces Region
        if (onApplyPiece) {
          const ty = Math.floor((trayY / 100) * img.height);
          const th = Math.floor((trayH / 100) * img.height);
          const tx = Math.floor(img.width * 0.05);
          const tw = Math.floor(img.width * 0.90);
          const slotW = tw / 3;

          for (let s = 0; s < 3; s++) {
            const slotStartX = Math.floor(tx + s * slotW);
            const slotData = ctx.getImageData(slotStartX, ty, Math.floor(slotW), th);
            const slotMatrix5x5: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
            const subCellW = slotW / 5;
            const subCellH = th / 5;

            let anyOccupied = false;
            for (let r = 0; r < 5; r++) {
              for (let c = 0; c < 5; c++) {
                const scx = Math.floor((c + 0.5) * subCellW);
                const scy = Math.floor((r + 0.5) * subCellH);
                const sIdx = (scy * Math.floor(slotW) + scx) * 4;
                const red = slotData.data[sIdx];
                const grn = slotData.data[sIdx + 1];
                const blu = slotData.data[sIdx + 2];
                const brt = (red + grn + blu) / 3;
                const sat = Math.max(red, grn, blu) - Math.min(red, grn, blu);

                if (brt > 65 && (sat > 25 || brt > 120)) {
                  slotMatrix5x5[r][c] = 1;
                  anyOccupied = true;
                }
              }
            }

            if (anyOccupied) {
              // Normalize matrix to PieceShape
              const normPiece = normalizeMatrix(slotMatrix5x5);
              if (normPiece) {
                onApplyPiece(s, normPiece);
              }
            }
          }
        }
      }
      setIsScanning(false);
    };
    img.src = imageSrc;
  };

  return (
    <div className="bg-[#101726]/90 border border-[#1e293b] rounded-2xl p-5 shadow-xl flex flex-col gap-4 text-slate-200">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-3">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          01 / Phân tích ảnh chụp
        </h2>
        <span className="text-xs font-medium text-slate-400">Canvas Vision</span>
      </div>

      {/* Upload & Clipboard Row */}
      <div className="border border-[#1e293b] bg-[#0c121e]/80 rounded-xl p-3.5 flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-slate-300">Ảnh game</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-xs font-medium text-slate-200 border border-slate-700/80 transition-all cursor-pointer"
          >
            Chọn tệp
          </button>
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            {imageFileName}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="flex-1 py-2 px-3 rounded-lg bg-[#192337] hover:bg-[#22304a] text-xs font-semibold text-slate-200 border border-[#2b3a56] flex items-center justify-center gap-1.5 transition-all"
          >
            <Clipboard className="w-3.5 h-3.5 text-blue-400" />
            <span>Dán ảnh clipboard</span>
          </button>
          <button
            type="button"
            onClick={handleClearImage}
            className="py-2 px-3 rounded-lg bg-[#192337] hover:bg-[#22304a] text-xs font-semibold text-slate-300 border border-[#2b3a56] flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Bỏ ảnh</span>
          </button>
        </div>
      </div>

      {/* Main Image & ROI Preview Container */}
      <div className="relative border border-dashed border-[#23314c] bg-[#0a0e17] rounded-xl min-h-[170px] flex flex-col items-center justify-center p-3 overflow-hidden">
        {imageSrc ? (
          <div className="relative max-h-80 w-full flex items-center justify-center">
            <img
              src={imageSrc}
              alt="Block Blast Captured"
              className="max-h-80 object-contain rounded-lg"
            />
            {/* ROI Visual Overlay */}
            {showROI && (
              <>
                <div
                  className="absolute border-2 border-cyan-400 bg-cyan-500/10 pointer-events-none rounded transition-all"
                  style={{
                    top: `${boardY}%`,
                    height: `${boardH}%`,
                    left: '5%',
                    width: '90%',
                  }}
                >
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-cyan-600 text-white rounded">
                    Lưới 8×8 ({boardY}% - {boardY + boardH}%)
                  </span>
                </div>
                <div
                  className="absolute border-2 border-amber-400 bg-amber-500/10 pointer-events-none rounded transition-all"
                  style={{
                    top: `${trayY}%`,
                    height: `${trayH}%`,
                    left: '5%',
                    width: '90%',
                  }}
                >
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-amber-600 text-white rounded">
                    Khay 3 khối ({trayY}%)
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-6">
            <div className="w-9 h-9 rounded-lg border border-slate-700/80 bg-slate-800/40 flex items-center justify-center">
              <Upload className="w-4 h-4 text-slate-400" />
            </div>
            <span className="text-xs font-medium text-slate-300">
              Thả ảnh vào đây
            </span>
            <span className="text-[11px] text-slate-500">
              Hoặc tải ảnh lên / nhấn Ctrl + V
            </span>
          </div>
        )}
      </div>

      {/* Fine-Tuning ROI Sliders */}
      <div className="border border-[#1e293b] bg-[#0c121e]/80 rounded-xl p-3.5 flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Vị trí Y bàn cờ</span>
            <span className="font-mono text-blue-400 font-bold">{boardY}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={boardY}
            onChange={(e) => setBoardY(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Chiều cao bàn cờ</span>
            <span className="font-mono text-blue-400 font-bold">{boardH}%</span>
          </div>
          <input
            type="range"
            min="20"
            max="80"
            value={boardH}
            onChange={(e) => setBoardH(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Vị trí Y khay gạch</span>
            <span className="font-mono text-blue-400 font-bold">{trayY}%</span>
          </div>
          <input
            type="range"
            min="40"
            max="90"
            value={trayY}
            onChange={(e) => setTrayY(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-slate-300">
            <span>Chiều cao khay</span>
            <span className="font-mono text-blue-400 font-bold">{trayH}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="40"
            value={trayH}
            onChange={(e) => setTrayH(Number(e.target.value))}
            className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* Action Scan & Toggle ROI Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!imageSrc || isScanning}
          onClick={handleAutoScan}
          className="py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs tracking-wide shadow-lg shadow-blue-500/25 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
        >
          <Sparkles className="w-4 h-4 fill-current" />
          <span>{isScanning ? 'Đang quét ảnh...' : '✦ Tự động quét ảnh'}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowROI(!showROI)}
          className="py-3 px-4 rounded-xl bg-[#192337] hover:bg-[#22304a] text-slate-200 font-semibold text-xs border border-[#2b3a56] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
        >
          {showROI ? <EyeOff className="w-4 h-4 text-slate-400" /> : <Eye className="w-4 h-4 text-slate-400" />}
          <span>{showROI ? 'Ẩn ROI' : 'Hiện ROI'}</span>
        </button>
      </div>

      {/* Instruction Note */}
      <div className="border border-[#1e293b] bg-[#0c121e]/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed flex flex-col gap-1">
        <div className="font-semibold text-slate-300">
          Hướng dẫn căn chỉnh:
        </div>
        <div>
          Khung xanh dương là vùng bàn cờ 8×8, khung cam là vùng 3 khối gạch. Điều chỉnh Y và chiều cao trước khi quét nếu khung không khớp ảnh. Kết quả quét có thể chỉnh sửa trực tiếp trên các lưới bên dưới.
        </div>
      </div>

      {!imageSrc && (
        <div className="border border-[#1e293b] bg-[#0c121e]/50 rounded-xl p-3 text-xs text-slate-400">
          Chưa tải ảnh. Bạn vẫn có thể nhập bàn cờ và các khối bằng tay.
        </div>
      )}
    </div>
  );
};
