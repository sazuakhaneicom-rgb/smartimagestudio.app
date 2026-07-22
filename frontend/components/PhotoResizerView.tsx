'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Download, Settings, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { trackGeneration } from '@/lib/adminAnalytics';

type Tab = 'size' | 'percentage' | 'social';
type Format = 'Original' | 'image/jpeg' | 'image/png' | 'image/webp';

interface Preset {
  label: string;
  width: number;
  height: number;
}

const SOCIAL_PRESETS: Record<string, Preset[]> = {
  'Facebook': [
    { label: 'Profile Picture (170x170)', width: 170, height: 170 },
    { label: 'Cover Photo (820x312)', width: 820, height: 312 },
    { label: 'Post (1200x630)', width: 1200, height: 630 },
  ],
  'Instagram': [
    { label: 'Profile Picture (320x320)', width: 320, height: 320 },
    { label: 'Square Post (1080x1080)', width: 1080, height: 1080 },
    { label: 'Story (1080x1920)', width: 1080, height: 1920 },
  ],
  'Twitter': [
    { label: 'Profile Picture (400x400)', width: 400, height: 400 },
    { label: 'Header (1500x500)', width: 1500, height: 500 },
    { label: 'Post (1200x675)', width: 1200, height: 675 },
  ]
};

export default function PhotoResizerView() {
  const { t } = useTranslation();
  
  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Image Meta
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Editor State
  const [activeTab, setActiveTab] = useState<Tab>('size');
  
  // By Size
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  
  // As Percentage
  const [percentage, setPercentage] = useState<number>(100);

  // Background Fill
  const [backgroundFill, setBackgroundFill] = useState(false);
  const [bgType, setBgType] = useState<'color' | 'transparent'>('color');
  const [bgColor, setBgColor] = useState('#000000');

  // Export Settings
  const [targetSizeKb, setTargetSizeKb] = useState<string>('');
  const [saveFormat, setSaveFormat] = useState<Format>('Original');

  // Load Image Meta when uploaded
  useEffect(() => {
    if (originalUrl) {
      const img = new Image();
      img.onload = () => {
        setOrigW(img.width);
        setOrigH(img.height);
        setWidth(img.width);
        setHeight(img.height);
        setImageObj(img);
      };
      img.src = originalUrl;
    }
  }, [originalUrl]);

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockAspectRatio && origW > 0) {
      setHeight(Math.round(val * (origH / origW)));
    }
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockAspectRatio && origH > 0) {
      setWidth(Math.round(val * (origW / origH)));
    }
  };

  const getTargetDimensions = () => {
    if (activeTab === 'size') {
      return { w: width, h: height };
    } else if (activeTab === 'percentage') {
      return {
        w: Math.round(origW * (percentage / 100)),
        h: Math.round(origH * (percentage / 100))
      };
    }
    // For social, the width/height state is directly set when selecting a preset
    return { w: width, h: height };
  };

  const handleDownload = async () => {
    if (!imageObj) return;

    const { w: targetW, h: targetH } = getTargetDimensions();
    
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Draw Background
    if (backgroundFill && bgType === 'color') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, targetW, targetH);
    } else if (!backgroundFill || (backgroundFill && bgType === 'transparent')) {
      ctx.clearRect(0, 0, targetW, targetH);
    }

    // 2. Calculate drawing dimensions (Contain logic if aspect ratio differs and bg fill is used)
    let drawW = targetW;
    let drawH = targetH;
    let drawX = 0;
    let drawY = 0;

    if (backgroundFill) {
      // Contain logic
      const targetRatio = targetW / targetH;
      const origRatio = origW / origH;

      if (origRatio > targetRatio) {
        // Image is wider than target
        drawW = targetW;
        drawH = Math.round(targetW / origRatio);
        drawY = Math.round((targetH - drawH) / 2);
      } else {
        // Image is taller than target
        drawH = targetH;
        drawW = Math.round(targetH * origRatio);
        drawX = Math.round((targetW - drawW) / 2);
      }
    } else {
      // Direct stretch (or exact fit if locked aspect ratio)
      drawW = targetW;
      drawH = targetH;
    }

    // 3. Draw Image
    ctx.drawImage(imageObj, drawX, drawY, drawW, drawH);

    // 4. Determine format
    let finalMime = saveFormat;
    if (saveFormat === 'Original' && originalFile) {
      finalMime = originalFile.type as Format;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(finalMime)) {
        finalMime = 'image/png';
      }
    }

    // 5. Compression / Export
    let dataUrl = '';
    const targetKb = parseFloat(targetSizeKb);

    if (!isNaN(targetKb) && targetKb > 0 && (finalMime === 'image/jpeg' || finalMime === 'image/webp')) {
      // Binary search for quality
      let minQ = 0.0;
      let maxQ = 1.0;
      let bestQ = 0.8; // default fallback
      let bestUrl = canvas.toDataURL(finalMime, 1.0);
      
      for(let i=0; i<7; i++) {
        const q = (minQ + maxQ) / 2;
        const url = canvas.toDataURL(finalMime, q);
        const kb = (url.length * 0.75) / 1024;
        
        if (kb <= targetKb) {
          bestUrl = url;
          bestQ = q;
          minQ = q; // try to get higher quality while still under limit
        } else {
          maxQ = q; // need lower quality
        }
      }
      dataUrl = bestUrl;
    } else {
      dataUrl = canvas.toDataURL(finalMime, 1.0);
    }

    // 6. Download
    const ext = finalMime === 'image/jpeg' ? 'jpg' : finalMime === 'image/webp' ? 'webp' : 'png';
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `SmartImageStudio-Resized-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    trackGeneration('photo_resizer');
  };

  const handleFile = (file: File) => {
    setOriginalFile(file);
    setOriginalUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // --- Render Upload State ---
  if (!originalUrl) {
    return (
      <div className="w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-12 fade-in duration-1000 p-4">
        <div 
          className={`relative w-full aspect-square max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center p-8 group cursor-pointer overflow-hidden shadow-2xl
            ${isDragging 
              ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-[0_0_80px_rgba(16,185,129,0.3)]' 
              : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-emerald-500/70 hover:bg-emerald-500/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(16,185,129,0.15)]'
            }
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
          
          <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
            ${isDragging ? 'scale-110 -translate-y-2 bg-emerald-500/20 shadow-[0_10px_40px_rgba(16,185,129,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(16,185,129,0.2)]'}`}>
            <div className="absolute inset-0 rounded-[2rem] border border-emerald-500/40 animate-[ping_3s_ease-in-out_infinite]" />
            <UploadCloud className="w-12 h-12 text-emerald-500 animate-[bounce_3s_ease-in-out_infinite]" />
          </div>

          <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
            {t('upload.dragDrop')}
          </h3>
          <p className="relative z-10 text-lg font-bold text-emerald-500 group-hover:text-emerald-400 mb-10 text-center cursor-pointer transition-colors duration-500">
            {t('upload.orClick')}
          </p>
          <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              <span>{t('upload.formats')}</span>
            </div>
            <span className="opacity-80 font-medium">{t('upload.maxSize')}</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Render Editor State ---
  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto h-[calc(100vh-140px)] animate-in fade-in duration-500">
      
      {/* Left Preview Area */}
      <div className="flex-1 min-h-[300px] lg:min-h-0 bg-gray-100 dark:bg-[#15151A] rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden relative flex flex-col p-4 sm:p-8">
        <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-lg text-white font-mono text-xs z-10">
          Original: {origW} × {origH}
        </div>
        
        <div className="flex-1 w-full flex items-center justify-center checkerboard rounded-xl border border-black/10 dark:border-white/5 relative overflow-hidden bg-white dark:bg-black/40">
          <img 
            src={originalUrl} 
            alt="Preview" 
            className="w-auto h-auto max-w-full max-h-[50vh] lg:max-h-full object-contain drop-shadow-xl"
            style={{
              width: backgroundFill && lockAspectRatio ? '100%' : undefined,
              height: backgroundFill && lockAspectRatio ? '100%' : undefined,
            }}
          />
        </div>
        
        <div className="mt-4 flex justify-between items-center bg-white/50 dark:bg-black/30 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Target Resolution</span>
            <span className="text-xl font-black text-gray-800 dark:text-gray-100 font-mono">
              {getTargetDimensions().w} <span className="text-emerald-500 text-sm">×</span> {getTargetDimensions().h}
            </span>
          </div>
          <button 
            onClick={() => setOriginalUrl(null)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Right Settings Sidebar */}
      <div className="w-full lg:w-[380px] shrink-0 bg-[#1A1A24] text-gray-200 rounded-[2rem] border border-gray-800 shadow-2xl overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-800 bg-[#21212C] sticky top-0 z-10 flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            Resize Settings
          </h2>
        </div>

        <div className="p-6 flex flex-col gap-8 flex-1">
          
          {/* Tabs */}
          <div className="bg-[#121218] p-1 rounded-xl flex items-center border border-gray-800 shadow-inner">
            <button onClick={() => setActiveTab('size')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'size' ? 'bg-[#2D2D3B] text-white shadow' : 'text-gray-400 hover:text-white'}`}>By Size</button>
            <button onClick={() => setActiveTab('percentage')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'percentage' ? 'bg-[#2D2D3B] text-white shadow' : 'text-gray-400 hover:text-white'}`}>As Percentage</button>
            <button onClick={() => setActiveTab('social')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'social' ? 'bg-[#2D2D3B] text-white shadow' : 'text-gray-400 hover:text-white'}`}>Social Media</button>
          </div>

          {/* Size Tab Content */}
          {activeTab === 'size' && (
            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Width (px)</label>
                  <input 
                    type="number" 
                    value={width || ''} 
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-full bg-[#121218] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Enter Width"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Height (px)</label>
                  <input 
                    type="number" 
                    value={height || ''} 
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-full bg-[#121218] border border-gray-700 rounded-xl px-4 py-3 text-white font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="Enter Height"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group w-fit">
                <input 
                  type="checkbox" 
                  checked={lockAspectRatio} 
                  onChange={(e) => setLockAspectRatio(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-700 bg-[#121218] text-emerald-500 focus:ring-emerald-500/20"
                />
                <span className="text-sm font-semibold text-gray-300 group-hover:text-white transition-colors">Lock Aspect Ratio</span>
              </label>
            </div>
          )}

          {/* Percentage Tab Content */}
          {activeTab === 'percentage' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300">
              <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Scale Percentage</label>
                <span className="text-emerald-400 font-mono font-bold text-lg">{percentage}%</span>
              </div>
              <input 
                type="range" min="1" max="300" 
                value={percentage} 
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[25, 50, 75, 100].map(p => (
                  <button 
                    key={p} 
                    onClick={() => setPercentage(p)}
                    className="bg-[#121218] hover:bg-emerald-500/20 border border-gray-700 hover:border-emerald-500 text-gray-300 text-xs font-bold py-2 rounded-lg transition-all"
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Social Tab Content */}
          {activeTab === 'social' && (
            <div className="flex flex-col gap-4 animate-in fade-in duration-300 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {Object.entries(SOCIAL_PRESETS).map(([platform, presets]) => (
                <div key={platform} className="mb-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">{platform}</h4>
                  <div className="flex flex-col gap-2">
                    {presets.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setWidth(p.width); setHeight(p.height); }}
                        className={`text-left px-4 py-3 rounded-xl text-sm font-semibold border transition-all ${
                          width === p.width && height === p.height 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                            : 'bg-[#121218] border-gray-800 text-gray-300 hover:border-gray-600 hover:bg-[#1A1A24]'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <hr className="border-gray-800" />

          {/* Background Fill Section */}
          <div className="flex flex-col gap-4 border border-gray-800 rounded-xl p-4 bg-[#1A1A24]">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={backgroundFill} 
                onChange={(e) => setBackgroundFill(e.target.checked)}
                className="w-4 h-4 rounded border-gray-700 bg-[#121218] text-emerald-500 focus:ring-emerald-500/20"
              />
              <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">Background Fill</span>
            </label>

            {backgroundFill && (
              <div className="pl-7 flex flex-col gap-4 animate-in fade-in">
                <label className="flex justify-between items-center cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input type="radio" name="bgType" checked={bgType === 'color'} onChange={() => setBgType('color')} className="w-4 h-4 text-emerald-500 bg-[#121218] border-gray-700" />
                    <span className="text-sm text-gray-300">Pick a color</span>
                  </div>
                  {bgType === 'color' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-200 font-bold">{bgColor.toUpperCase()}</span>
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-6 h-6 p-0 rounded overflow-hidden cursor-pointer bg-transparent border-0" />
                    </div>
                  )}
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="radio" name="bgType" checked={bgType === 'transparent'} onChange={() => setBgType('transparent')} className="w-4 h-4 text-emerald-500 bg-[#121218] border-gray-700" />
                  <span className="text-sm text-gray-300">Transparent</span>
                </label>
              </div>
            )}
          </div>

          <hr className="border-gray-800" />

          {/* Export Settings */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              Export Settings
            </h3>
            
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Target File Size <span className="lowercase font-normal opacity-60">(optional)</span></label>
              <div className="flex items-center">
                <input 
                  type="number" 
                  value={targetSizeKb} 
                  onChange={(e) => setTargetSizeKb(e.target.value)}
                  className="flex-1 bg-[#121218] border border-gray-700 rounded-l-xl px-4 py-3 text-white font-mono focus:border-emerald-500 outline-none"
                  placeholder="e.g. 500"
                />
                <div className="bg-[#2D2D3B] border border-l-0 border-gray-700 rounded-r-xl px-4 py-3 text-gray-300 font-bold text-sm">
                  KB
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-2 font-medium">Set a max output file size. Only works for JPG / WEBP files.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Save Image As</label>
              <select 
                value={saveFormat} 
                onChange={(e) => setSaveFormat(e.target.value as Format)}
                className="w-full bg-[#121218] border border-gray-700 rounded-xl px-4 py-3 text-white font-bold focus:border-emerald-500 outline-none appearance-none"
              >
                <option value="Original">Original</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
                <option value="image/webp">WEBP</option>
              </select>
            </div>
          </div>

        </div>
        
        {/* Download Action */}
        <div className="p-6 bg-[#1A1A24] border-t border-gray-800 mt-auto">
          <button 
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-6 h-6" />
            Download Image
          </button>
        </div>
      </div>
    </div>
  );
}
