"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  Grid,
  Settings2
} from 'lucide-react';
import { 
  PrintSheetConfig, 
  SHEET_DIMENSIONS, 
  PHOTO_SIZES_FOR_PRINT, 
  calculateCopyCount, 
  generatePrintSheet 
} from '../lib/printSheetGenerator';

interface PrintSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSource: string | null;
}

export default function PrintSheetModal({ isOpen, onClose, imageSource }: PrintSheetModalProps) {
  const [config, setConfig] = useState<PrintSheetConfig>({
    sheetSize: 'a4',
    photoSize: 'passport',
    showCropMarks: true,
    spacing: 2,
    backgroundColor: '#ffffff'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  
  const counts = calculateCopyCount(config);
  
  useEffect(() => {
    if (isOpen && imageSource) {
      setPreviewDataUrl(null);
    }
  }, [isOpen, imageSource]);
  
  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!imageSource) return;
    
    setIsGenerating(true);
    try {
      const canvas = await generatePrintSheet(imageSource, config, 300);
      setPreviewDataUrl(canvas.toDataURL('image/jpeg', 0.95));
    } catch (error) {
      console.error('Error generating print sheet:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!previewDataUrl) return;
    const a = document.createElement('a');
    a.href = previewDataUrl;
    a.download = `print-sheet-${config.sheetSize}-${config.photoSize}.jpg`;
    a.click();
  };

  const handlePrint = () => {
    if (!previewDataUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Sheet - Smart Image Studio</title>
          <style>
            @media print {
              @page { margin: 0; }
              body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            }
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #f0f0f0; }
            img { max-width: 90vw; max-height: 90vh; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          </style>
        </head>
        <body>
          <img src="${previewDataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-[#1A1C29] border border-gray-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500">
              <Grid size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">প্রিন্ট শিট তৈরি</h2>
              <p className="text-sm text-gray-400">মাল্টি-কপি প্রিন্ট লেআউট</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Controls - Left Side */}
          <div className="w-full lg:w-80 border-r border-gray-800 p-6 overflow-y-auto flex flex-col gap-6">
            
            {/* Sheet Size */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <Settings2 size={16} className="text-orange-500" />
                শিট সাইজ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(SHEET_DIMENSIONS) as [keyof typeof SHEET_DIMENSIONS, any][]).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setConfig({...config, sheetSize: key as PrintSheetConfig['sheetSize']})}
                    className={`py-2 px-3 rounded-lg text-sm transition-all border ${
                      config.sheetSize === key 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-medium' 
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    {val.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Size */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-3 block flex items-center gap-2">
                <Settings2 size={16} className="text-orange-500" />
                ছবির মাপ
              </label>
              <div className="flex flex-col gap-2">
                {(Object.entries(PHOTO_SIZES_FOR_PRINT) as [keyof typeof PHOTO_SIZES_FOR_PRINT, any][]).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => setConfig({...config, photoSize: key as PrintSheetConfig['photoSize']})}
                    className={`py-2 px-3 rounded-lg text-sm text-left transition-all border ${
                      config.photoSize === key 
                      ? 'bg-orange-500/20 border-orange-500 text-orange-400 font-medium' 
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600'
                    }`}
                  >
                    {val.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Settings2 size={16} className="text-orange-500" />
                  স্পেসিং (mm)
                </label>
                <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                  {config.spacing}mm
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="10" 
                step="1"
                value={config.spacing}
                onChange={(e) => setConfig({...config, spacing: parseInt(e.target.value)})}
                className="w-full accent-orange-500"
              />
            </div>

            {/* Crop Marks */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-800/30 border border-gray-700/50">
              <span className="text-sm text-gray-300">কাটিং গাইড</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={config.showCropMarks}
                  onChange={(e) => setConfig({...config, showCropMarks: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
              </label>
            </div>

            {/* Info Box */}
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-blue-400 text-sm font-medium mb-1">হিসাব</h4>
              <p className="text-gray-300 text-lg font-bold">
                {counts.total} কপি <span className="text-sm text-gray-400 font-normal">({counts.cols} × {counts.rows})</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-4 flex flex-col gap-3">
              <button
                onClick={handleGenerate}
                disabled={!imageSource || isGenerating}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Grid size={18} /> জেনারেট করুন
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview - Right Side */}
          <div className="flex-1 bg-[#151722] p-6 flex flex-col items-center justify-center min-h-[400px] relative">
            {previewDataUrl ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="flex-1 w-full max-h-[60vh] flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800 p-4 mb-6">
                  <img 
                    src={previewDataUrl} 
                    alt="Print Sheet Preview" 
                    className="max-w-full max-h-full object-contain shadow-2xl"
                    style={{
                      aspectRatio: `${SHEET_DIMENSIONS[config.sheetSize]?.w} / ${SHEET_DIMENSIONS[config.sheetSize]?.h}`
                    }}
                  />
                </div>
                
                <div className="flex items-center gap-4 w-full max-w-md">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 border border-gray-700"
                  >
                    <Download size={18} /> ডাউনলোড
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex-1 py-3 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer size={18} /> প্রিন্ট করুন
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700/50">
                  <Grid size={32} className="text-gray-500" />
                </div>
                <h3 className="text-xl font-medium text-white mb-2">প্রিভিউ প্রস্তুত নয়</h3>
                <p className="text-gray-400 max-w-xs mx-auto">
                  শিট সাইজ ও ছবির মাপ নির্বাচন করে 'জেনারেট করুন' বাটনে ক্লিক করুন।
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
