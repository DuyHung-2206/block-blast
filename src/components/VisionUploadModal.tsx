import React from 'react';
import { VisionDetectionResult } from '../core/types.js';
import { VisionAnalyzer } from '../vision/VisionAnalyzer.js';
import { Camera, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface VisionUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDetectedBoard: (board: number[][], confidences: number[][]) => void;
}

export const VisionUploadModal: React.FC<VisionUploadModalProps> = ({
  isOpen,
  onClose,
  onApplyDetectedBoard,
}) => {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [detectionResult, setDetectionResult] = React.useState<VisionDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = React.useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const result = VisionAnalyzer.analyzeImage(imgData);
        setDetectionResult(result);
      }
      setIsProcessing(false);
    };
    img.src = url;
  };

  const handleApply = () => {
    if (detectionResult) {
      onApplyDetectedBoard(detectionResult.board, detectionResult.cellConfidences);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                AI Vision Analyzer
              </h3>
              <p className="text-xs text-slate-400">
                Upload screenshot to extract board automatically
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white px-2.5 py-1 text-xs bg-slate-800 rounded-lg"
          >
            Cancel
          </button>
        </div>

        {/* Upload Zone */}
        {!previewUrl ? (
          <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40">
            <Upload className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-sm font-semibold text-slate-200">
              Upload Screenshot or Game Capture
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Supports PNG, JPG, WebP
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 max-h-56 flex items-center justify-center bg-black">
              <img
                src={previewUrl}
                alt="Game Preview"
                className="max-h-56 object-contain"
              />
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center text-sm font-semibold text-indigo-300">
                  Analyzing Board Grid & Saturation...
                </div>
              )}
            </div>

            {detectionResult && (
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Vision Confidence:</span>
                  <span className="font-bold text-emerald-400">
                    {Math.round(detectionResult.confidence * 100)}%
                  </span>
                </div>

                {detectionResult.needsUserConfirmation && (
                  <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      Confidence below 75%. Please verify board cells after importing.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!detectionResult || isProcessing}
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Apply Detected Board
          </button>
        </div>
      </div>
    </div>
  );
};
