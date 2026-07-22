'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, Download, RefreshCw, UploadCloud, Image as ImageIcon, X, Scissors, Sparkles } from 'lucide-react';
import Upscaler from 'upscaler';
import esrganThick from '@upscalerjs/esrgan-thick/4x';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';
import { useIsMobile } from '@/lib/device';

export default function ImageToHdView() {
  const { imageToUpscale, setImageToUpscale, setAppMode, setImageToBgRemove, deepAiApiKey, setSettingsOpen } = useAppStore();
  const isMobile = useIsMobile();
  
  const [originalUrl, setOriginalUrl] = useState<string | null>(imageToUpscale || null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If the store's imageToUpscale changes (e.g. sent from BgRemover), load it
  useEffect(() => {
    if (imageToUpscale) {
      setOriginalUrl(imageToUpscale);
      setResultUrl(null);
    }
  }, [imageToUpscale]);

  const upscaleImage = async (imgUrl: string) => {
    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setProgress(0);

      // Create an image element to get its natural dimensions
      const img = new Image();
      img.src = imgUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Upscaler instance using esrgan-thick for extreme denoising and smoothing (vector-like)
      const upscaler = new Upscaler({ model: esrganThick });
      
      // Prevent extreme freezing on huge images by capping input size to 1080px before 2x upscale
      let sourceImage: HTMLImageElement | HTMLCanvasElement = img;
      const MAX_DIMENSION = 1080;
      if (img.width > MAX_DIMENSION || img.height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          sourceImage = canvas;
        }
      }

      const upscaledSrc = await upscaler.upscale(sourceImage, {
        output: 'base64',
        patchSize: isMobile ? 32 : 64, // Reduced patch size to prevent WebGL shader compilation errors on certain GPUs
        padding: 2,
        awaitNextFrame: true, // MANDATORY: Prevents browser freezing by yielding to the UI thread
        progress: (percent) => {
          setProgress(Math.round(percent * 100));
        }
      });

      // --- Alpha Masking Logic to Preserve Transparency ---
      const upscaledImg = new Image();
      upscaledImg.src = upscaledSrc;
      await new Promise((resolve, reject) => {
        upscaledImg.onload = resolve;
        upscaledImg.onerror = reject;
      });

      // Create a canvas for the final image
      const canvas = document.createElement('canvas');
      canvas.width = upscaledImg.width;
      canvas.height = upscaledImg.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context not available");

      // Draw the AI upscaled image (which lost transparency)
      ctx.drawImage(upscaledImg, 0, 0);
      const upscaledData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Create a canvas for the original image to scale it up (extracting the alpha mask)
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = canvas.width;
      alphaCanvas.height = canvas.height;
      const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
      if (alphaCtx) {
        // Draw original image scaled up
        alphaCtx.drawImage(img, 0, 0, alphaCanvas.width, alphaCanvas.height);
        const alphaData = alphaCtx.getImageData(0, 0, alphaCanvas.width, alphaCanvas.height);

        // Apply original alpha channel to upscaled image
        for (let i = 0; i < upscaledData.data.length; i += 4) {
          upscaledData.data[i + 3] = alphaData.data[i + 3]; // Copy alpha
        }
        
        // Put the modified data back
        ctx.putImageData(upscaledData, 0, 0);
        
        // Apply enhancement filter to make the AI result look fresh and clear
        const finalCtx = canvas.getContext('2d');
        if (finalCtx) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(upscaledData, 0, 0);
            finalCtx.clearRect(0, 0, canvas.width, canvas.height);
            finalCtx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
            finalCtx.drawImage(tempCanvas, 0, 0);
          }
        }
      } else {
        // If no transparency, just enhance the upscaled result directly
        const imgElement = new Image();
        imgElement.src = upscaledSrc;
        await new Promise((resolve) => { imgElement.onload = resolve; });
        
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
          ctx.drawImage(imgElement, 0, 0);
        }
      }

      const finalUrl = canvas.toDataURL('image/png');
      // --------------------------------------------------

      setResultUrl(finalUrl);
      // Clean up upscaler memory
      upscaler.dispose();

    } catch (err: any) {
      console.error('Upscale error:', err);
      setErrorMsg('HD করতে সমস্যা হয়েছে। মডেল লোড হতে ব্যর্থ বা মেমরি ফুল হয়ে গেছে।');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('সাপোর্টেড ফরম্যাট নয় (শুধুমাত্র JPG/PNG/WEBP)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('ফাইল সাইজ ১৫ MB এর বেশি হওয়া যাবে না');
      return;
    }
    const url = URL.createObjectURL(file);
    setOriginalUrl(url);
    setImageToUpscale(null); // disconnect from store
    setResultUrl(null);
  };

  const startUpscaling = async (mode: '2k' | '4k' | '8k' | '16k') => {
    if (!originalUrl) return;
    
    // Always use the local heavy AI Upscaler now, since fake canvas resizing doesn't enhance quality
    upscaleImage(originalUrl);
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

      // Calculate width maintaining aspect ratio
      const aspectRatio = img.width / img.height;
      const targetWidth = Math.round(targetHeight * aspectRatio);

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        
        const scaledUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = scaledUrl;
        a.download = `SmartImageStudio-HD-${Date.now()}.png`;
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
    setImageToUpscale(null);
  };

  if (isProcessing) {
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-12 glass-panel rounded-[2rem] animate-in zoom-in-95 duration-500">
        <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-100 dark:border-gray-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-indigo-500 border-r-[#7C3AED] animate-[spin_1.5s_linear_infinite]" />
          <div className="absolute inset-3 rounded-full border-[3px] border-transparent border-l-[#7C3AED] border-b-indigo-500 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-6 rounded-full border-[3px] border-transparent border-t-indigo-400 border-l-[#A78BFA] animate-[spin_1s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_15px_#6366f1] animate-ping" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-800 dark:text-gray-100 mb-3 text-center">
          ছবি HD করা হচ্ছে...
        </h2>
        <p className="text-amber-600 dark:text-amber-400 font-bold mb-6 text-center max-w-md bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
          ⚠️ ব্রাউজার ক্রাশ রোধ করতে অনুগ্রহ করে এই ট্যাবটি খোলা রাখুন। অন্য ট্যাবে গেলে কাজটি বন্ধ হয়ে যেতে পারে।
        </p>
        <div className="w-full max-w-xs bg-gray-200 dark:bg-gray-800 rounded-full h-3 mb-2 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.max(5, progress)}%` }}
          />
        </div>
        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</p>
      </div>
    );
  }

  if (resultUrl && originalUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
        <div className="w-full glass-panel rounded-[2rem] overflow-hidden p-3 sm:p-5 relative">
          
          {/* Compare Slider Container */}
          <div className="relative w-full flex justify-center max-h-[45vh] rounded-2xl overflow-hidden shadow-2xl border border-white/20 checkerboard bg-black/5 dark:bg-white/5">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={originalUrl} alt="Original" style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%', maxHeight: '45vh' }} />}
              itemTwo={<ReactCompareSliderImage src={resultUrl} alt="HD Upscaled" style={{ objectFit: 'contain', width: '100%', height: '100%', maxHeight: '45vh' }} />}
              className="w-full h-auto max-h-[45vh]"
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 items-center justify-center">
            
            <div className="flex flex-wrap items-center gap-4 bg-white/5 dark:bg-black/20 p-2 rounded-2xl border border-white/10">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400 px-2 flex items-center gap-1">
                <Download className="w-4 h-4" /> ডাউনলোড করুন:
              </span>
              <button 
                onClick={() => handleDownload(720, '720p')}
                className="px-5 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl border border-indigo-500/20 transition-all active:scale-95"
              >
                720p
              </button>
              <button 
                onClick={() => handleDownload(1080, '1080p')}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
              >
                1080p
              </button>
              <button 
                onClick={() => handleDownload(2160, '4K')}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-lg shadow-purple-600/25 transition-all active:scale-95"
              >
                4K
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button 
                onClick={() => {
                  setImageToBgRemove(resultUrl);
                  setAppMode('bg-remover');
                }}
                className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all duration-200 hover:scale-105 active:scale-95 group"
              >
                <Scissors className="w-5 h-5 group-hover:-rotate-12 transition-transform" />
                ✂️ ব্যাকগ্রাউন্ড রিমুভ করুন
              </button>

              <button 
                onClick={reset}
                className="flex items-center gap-2 px-6 py-3.5 glass-button text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                নতুন ছবি
              </button>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (originalUrl && !resultUrl && !isProcessing) {
    // Show preview and button to start
    return (
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
        <div className="w-full glass-panel p-8 rounded-[2rem] flex flex-col items-center">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            ছবি প্রস্তুত!
          </h2>
          <div className="relative w-full max-w-lg max-h-[60vh] flex justify-center rounded-2xl overflow-hidden shadow-xl mb-8 checkerboard border border-gray-200 dark:border-gray-800 bg-black/5 dark:bg-white/5 p-4">
            <img src={originalUrl} className="w-auto h-auto max-w-full max-h-[40vh] object-contain" alt="Preview" />
          </div>
          
          <h3 className="text-sm font-bold text-gray-500 mb-3">আপস্কেলিং কোয়ালিটি নির্বাচন করুন:</h3>
          
          <div className="flex flex-col gap-3 w-full max-w-md">
            <h4 className="text-center text-xs text-amber-500 font-bold bg-amber-500/10 p-2 rounded-lg mb-2">
              ⚠️ পিসি বা মোবাইলের পাওয়ার অনুযায়ী প্রসেস হতে কিছুটা সময় লাগতে পারে।
            </h4>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button onClick={() => startUpscaling('2k')} className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl transition-all border border-transparent hover:border-indigo-300 dark:hover:border-indigo-700">
                <span className="text-xl">HD 2K</span>
                <span className="text-xs text-gray-500 font-normal mt-1">ক্লিয়ার & শার্প</span>
              </button>
              <button onClick={() => startUpscaling('4k')} className="flex flex-col items-center justify-center p-4 bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold rounded-xl transition-all border border-transparent hover:border-purple-300 dark:hover:border-purple-700">
                <span className="text-xl">Ultra 4K</span>
                <span className="text-xs text-gray-500 font-normal mt-1">ম্যাক্সিমাম কোয়ালিটি</span>
              </button>
            </div>
          </div>
          
          <button 
            onClick={reset}
            className="mt-6 flex items-center gap-2 px-6 py-2 glass-button text-gray-500 hover:text-red-500 font-semibold rounded-full transition-all text-sm"
          >
            <X className="w-4 h-4" /> বাতিল করুন
          </button>
        </div>
      </div>
    );
  }

  // Upload state
  return (
    <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-12 fade-in duration-1000">
      {errorMsg && (
        <div className="mb-6 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-xl font-medium animate-in fade-in">
          {errorMsg}
        </div>
      )}

      <div 
        className={`relative w-full aspect-square max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center p-8 group cursor-pointer overflow-hidden shadow-2xl
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02] shadow-[0_0_80px_rgba(99,102,241,0.3)]' 
            : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-indigo-500/70 hover:bg-indigo-500/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(99,102,241,0.15)]'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-[#7C3AED]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

        {/* Decorative Orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-indigo-500/30 to-[#7C3AED]/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-purple-500/30 to-indigo-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />

        {/* Premium Icon Container */}
        <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
          ${isDragging ? 'scale-110 -translate-y-2 bg-indigo-500/20 shadow-[0_10px_40px_rgba(99,102,241,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(99,102,241,0.2)]'}`}>
          
          {/* Pulsing rings inside icon container */}
          <div className="absolute inset-0 rounded-[2rem] border border-indigo-500/40 animate-[ping_3s_ease-in-out_infinite]" />
          
          <UploadCloud className="w-12 h-12 text-indigo-500 animate-[bounce_3s_ease-in-out_infinite]" />
        </div>

        <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
          HD করার জন্য ছবি দিন
        </h3>
        
        <p className="relative z-10 text-lg font-bold text-indigo-500 group-hover:text-indigo-400 mb-10 text-center cursor-pointer transition-colors duration-500">
          ব্রাউজ করতে ক্লিক করুন
        </p>

        <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
            <ImageIcon className="w-5 h-5 text-indigo-500" />
            <span>সাপোর্টেড ফরম্যাট</span>
          </div>
          <span className="opacity-80 font-medium">JPG, PNG, WEBP • ১৫ MB</span>
        </div>
      </div>
    </div>
  );
}
