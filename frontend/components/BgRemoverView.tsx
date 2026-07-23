'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2, Download, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { removeBackground, Config } from '@imgly/background-removal';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useAppStore } from '@/store/useAppStore';
import { useIsMobile } from '@/lib/device';
import { Sparkles, PenTool, Droplet } from 'lucide-react';
import ManualMaskEditor from './ManualMaskEditor';
import { trackGeneration } from '@/lib/adminAnalytics';

export default function BgRemoverView() {
  const { t } = useTranslation();
  const { setAppMode, setImageToUpscale, imageToBgRemove, setImageToBgRemove, bgRemoverMode, setBgRemoverMode, photoroomApiKey, setSettingsOpen, siteSettings, addNotification } = useAppStore();
  const isMobile = useIsMobile();
  
  const [isDragging, setIsDragging] = useState(false);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isEditingMask, setIsEditingMask] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load image if sent from HD Upscaler
  useEffect(() => {
    if (imageToBgRemove) {
      setOriginalUrl(imageToBgRemove);
      setResultUrl(null);
    }
  }, [imageToBgRemove]);

  const processImage = async (fileOrBlob: File | Blob) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setProgress(0);
      
      const origUrl = URL.createObjectURL(fileOrBlob);
      setOriginalUrl(origUrl);
      setResultUrl(null);

      if (bgRemoverMode === 'cloud') {
        if (!photoroomApiKey) {
          setErrorMsg('Ultra Quality ব্যবহারের জন্য সেটিংসে গিয়ে Photoroom API Key যুক্ত করুন।');
          setIsProcessing(false);
          setSettingsOpen(true);
          return;
        }

        setProgress(30); // Fake progress for upload
        
        const formData = new FormData();
        formData.append('image_file', fileOrBlob);
        formData.append('format', 'png');

        const response = await fetch('https://image-api.photoroom.com/v1/segment', {
          method: 'POST',
          headers: {
            'x-api-key': photoroomApiKey,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error('API Request Failed: ' + response.statusText);
        }

        const resultBlob = await response.blob();
        setProgress(100);
        
        const resUrl = URL.createObjectURL(resultBlob);
        setResultUrl(resUrl);
        trackGeneration('bg_remover');
      } else {
        // Local Mode
        let simulatedProgress: NodeJS.Timeout | null = null;
        const config: Config = {
          output: { format: 'image/png', quality: 1 },
          progress: (key: string, current: number, total: number) => {
            const downloadPercent = Math.round((current / total) * 75);
            setProgress(prev => Math.max(prev, downloadPercent));
            if (downloadPercent >= 75 && !simulatedProgress) {
              simulatedProgress = setInterval(() => {
                setProgress(p => (p < 98 ? p + 1 : p));
              }, 150);
            }
          }
        };

        const resultBlob = await removeBackground(fileOrBlob, config);
        if (simulatedProgress) clearInterval(simulatedProgress);
        setProgress(100);
        
        const resUrl = URL.createObjectURL(resultBlob);
        setResultUrl(resUrl);
        trackGeneration('bg_remover');
      }
    } catch (error: any) {
      console.error('BG Removal Error:', error);
      setErrorMsg('ব্যাকগ্রাউন্ড রিমুভ করতে সমস্যা হয়েছে। API Key সঠিক কি না চেক করুন, অথবা Local Mode ব্যবহার করুন।');
      setOriginalUrl(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('সাপোর্টেড ফরম্যাট নয় (শুধুমাত্র JPG/PNG/WEBP)');
      return;
    }
    const maxSize = (siteSettings?.maxUploadSizeMB || 15) * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorMsg(`ফাইল সাইজ ${siteSettings?.maxUploadSizeMB || 15} MB এর বেশি হওয়া যাবে না`);
      return;
    }
    processImage(file);
  }, []);

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
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startProcessingFromUrl = async () => {
    if (originalUrl) {
      try {
        const response = await fetch(originalUrl);
        const blob = await response.blob();
        processImage(blob);
      } catch (err) {
        setErrorMsg('ছবি প্রসেস করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleDownload = async (targetHeight: number, label: string) => {
    if (!resultUrl) return;
    try {
      const img = new Image();
      img.src = resultUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const aspectRatio = img.width / img.height;
      const targetWidth = Math.round(targetHeight * aspectRatio);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        const scaledUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = scaledUrl;
        a.download = `SmartImageStudio-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Download error", e);
    }
  };

  const reset = () => {
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg(null);
    setImageToBgRemove(null);
    setIsEditingMask(false);
  };

  const processLogoMode = async (bgType: 'white' | 'black') => {
    if (!originalUrl) return;
    setIsProcessing(true);
    setProgress(100);
    
    try {
      const img = new Image();
      img.src = originalUrl;
      await new Promise(r => img.onload = r);
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const tolerance = 50; 
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        if (a === 0) continue;
        
        if (bgType === 'white') {
           if (r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance) {
              const distance = Math.max(255 - r, 255 - g, 255 - b); 
              data[i+3] = (distance / tolerance) * 255;
           }
        } else {
           if (r < tolerance && g < tolerance && b < tolerance) {
              const distance = Math.max(r, g, b); 
              data[i+3] = (distance / tolerance) * 255;
           }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setResultUrl(canvas.toDataURL('image/png'));
    } catch (e) {
       console.error("Logo mode error", e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isProcessing || (originalUrl && !resultUrl)) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-12 glass-panel rounded-[2rem] animate-in zoom-in-95 duration-500">
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-100 dark:border-gray-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-pink-500 border-r-purple-500 animate-[spin_1.5s_linear_infinite]" />
          <div className="absolute inset-3 rounded-full border-[3px] border-transparent border-l-purple-500 border-b-pink-500 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-6 rounded-full border-[3px] border-transparent border-t-pink-400 border-l-purple-400 animate-[spin_1s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_15px_#ec4899] animate-ping" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100 mb-3">
          ব্যাকগ্রাউন্ড রিমুভ হচ্ছে...
        </h2>
        <p className="text-gray-500 dark:text-gray-400 font-medium mb-6">
          {bgRemoverMode === 'cloud' ? 'Cloud API দিয়ে প্রসেস হচ্ছে...' : 'AI ম্যাজিক কাজ করছে, দয়া করে অপেক্ষা করুন।'}
        </p>
        <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-pink-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(10, progress)}%` }}
          />
        </div>
        <p className="text-sm font-bold text-pink-600 dark:text-pink-400">{progress}%</p>
      </div>
    );
  }

  if (resultUrl && originalUrl) {
    if (isEditingMask) {
      return (
        <ManualMaskEditor 
          originalUrl={originalUrl}
          maskUrl={resultUrl}
          onSave={(newMaskUrl) => {
            setResultUrl(newMaskUrl);
            setIsEditingMask(false);
          }}
          onCancel={() => setIsEditingMask(false)}
        />
      );
    }

    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
        <div className="w-full glass-panel rounded-[2rem] overflow-hidden p-3 sm:p-5 relative">
          
          {/* Compare Slider Container */}
          <div className="relative w-full flex justify-center">
            <div className="relative inline-block max-w-full rounded-2xl overflow-hidden shadow-2xl border border-white/20 checkerboard bg-black/5 dark:bg-white/5">
              {/* Invisible spacer image to dictate exact bounds */}
              <img 
                src={originalUrl} 
                className="block w-auto h-auto max-h-[45vh] max-w-full opacity-0 pointer-events-none select-none" 
                alt="spacer" 
              />
              {/* Slider fills the exact bounds of the spacer */}
              <div className="absolute inset-0">
                <ReactCompareSlider
                  itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original" style={{ objectFit: 'fill', width: '100%', height: '100%' }} />}
                  itemTwo={<ReactCompareSliderImage src={resultUrl} alt="Removed Background" style={{ objectFit: 'fill', width: '100%', height: '100%' }} />}
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 items-center justify-center">
            
            <div className="flex flex-wrap items-center gap-4 bg-white/5 dark:bg-black/20 p-2 rounded-2xl border border-white/10">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 px-2 flex items-center gap-1">
                <Download className="w-4 h-4" /> ডাউনলোড করুন:
              </span>
              <button 
                onClick={() => handleDownload(720, '720p')}
                className="px-5 py-2.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold rounded-xl border border-pink-500/20 transition-all active:scale-95"
              >
                720p
              </button>
              <button 
                onClick={() => handleDownload(1080, '1080p')}
                className="px-6 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all active:scale-95"
              >
                1080p
              </button>
              <button 
                onClick={() => handleDownload(2160, '4K')}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-lg shadow-rose-600/25 transition-all active:scale-95"
              >
                4K
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 w-full">
              <button 
                onClick={() => setIsEditingMask(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold rounded-xl shadow-sm transition-all"
              >
                <PenTool className="w-5 h-5 text-gray-500" />
                ম্যানুয়ালি এডিট করুন
              </button>
              
              <button 
                onClick={() => {
                  setImageToUpscale(resultUrl);
                  setAppMode('image-upscaler');
                }}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Sparkles className="w-5 h-5 group-hover:animate-pulse" />
                ✨ HD তে রূপান্তর করুন
              </button>
              <button 
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3.5 glass-button text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4" />
                নতুন ছবি
              </button>
            </div>

            {/* Logo Mode Buttons */}
            <div className="flex flex-col items-center justify-center gap-3 w-full mt-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
               <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                 <Droplet className="w-4 h-4" /> লোগো বা সিগনেচারের জন্য (One-click):
               </span>
               <div className="flex flex-wrap items-center justify-center gap-3">
                 <button 
                   onClick={() => processLogoMode('white')} 
                   className="px-4 py-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 text-gray-700 dark:text-gray-200 font-bold rounded-lg shadow-sm transition-all"
                 >
                   সাদা ব্যাকগ্রাউন্ড মুছুন
                 </button>
                 <button 
                   onClick={() => processLogoMode('black')} 
                   className="px-4 py-2 bg-gray-900 dark:bg-black border-2 border-gray-700 hover:border-gray-500 text-white font-bold rounded-lg shadow-sm transition-all"
                 >
                   কালো ব্যাকগ্রাউন্ড মুছুন
                 </button>
               </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (originalUrl && !resultUrl && !isProcessing) {
    // Show preview if image was sent from HD Upscaler but not yet processed
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
        <div className="w-full glass-panel p-8 rounded-[2rem] flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            ছবি প্রস্তুত!
          </h2>
          <div className="relative w-full max-w-lg max-h-[60vh] flex justify-center rounded-2xl overflow-hidden shadow-xl mb-8 checkerboard border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-white/5 p-4">
            <img src={originalUrl} className="w-auto h-auto max-w-full max-h-[55vh] object-contain" alt="Preview" />
          </div>
          <div className="flex gap-4">
            <button 
              onClick={startProcessingFromUrl}
              className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ✂️ ব্যাকগ্রাউন্ড রিমুভ শুরু করুন
            </button>
            <button 
              onClick={reset}
              className="flex items-center gap-2 px-4 py-3.5 glass-button text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-12 fade-in duration-1000">
      
      {errorMsg && (
        <div className="mb-6 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl font-medium animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <div 
        className={`relative w-full aspect-auto min-h-[420px] sm:min-h-0 sm:aspect-square max-w-[min(24rem,90vw)] sm:max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center py-10 px-4 sm:p-8 group cursor-pointer overflow-hidden shadow-2xl
          ${isDragging 
            ? 'border-pink-500 bg-pink-500/10 scale-[1.02] shadow-[0_0_80px_rgba(236,72,153,0.3)]' 
            : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-pink-500/70 hover:bg-pink-500/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(236,72,153,0.15)]'
          }
        `}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files?.[0]) handleFile(e.target.files[0]);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />
        
        {/* Background glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

        {/* Decorative Orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-pink-500/30 to-purple-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-rose-500/30 to-pink-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />

        {/* Premium Icon Container */}
        <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
          ${isDragging ? 'scale-110 -translate-y-2 bg-pink-500/20 shadow-[0_10px_40px_rgba(236,72,153,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(236,72,153,0.2)]'}`}>
          
          {/* Pulsing rings inside icon container */}
          <div className="absolute inset-0 rounded-[2rem] border border-pink-500/40 animate-[ping_3s_ease-in-out_infinite]" />
          
          <UploadCloud className="w-12 h-12 text-pink-500 animate-[bounce_3s_ease-in-out_infinite]" />
        </div>

        <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
          ছবি আপলোড করুন
        </h3>
        
        <p className="relative z-10 text-lg font-bold text-pink-500 group-hover:text-pink-400 mb-6 text-center cursor-pointer transition-colors duration-500">
          ব্রাউজ করতে ক্লিক করুন
        </p>

        {/* Mode Toggle */}
        <div className="relative z-20 flex items-center justify-center gap-2 mb-8 bg-white/80 dark:bg-gray-900/80 p-1.5 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 backdrop-blur-md" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setBgRemoverMode('local')}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
              bgRemoverMode === 'local' 
                ? 'bg-pink-500 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Fast Mode (Free)
          </button>
          <button
            onClick={() => {
              setBgRemoverMode('cloud');
              if (!photoroomApiKey) {
                setSettingsOpen(true);
              }
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1 transition-all ${
              bgRemoverMode === 'cloud' 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Sparkles size={14} /> Ultra Quality
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
            <ImageIcon className="w-5 h-5 text-pink-500" />
            <span>সাপোর্টেড ফরম্যাট</span>
          </div>
          <span className="opacity-80 font-medium">JPG, PNG, WEBP • ১৫ MB</span>
        </div>
      </div>
    </div>
  );
}
