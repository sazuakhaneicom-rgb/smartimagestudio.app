'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { callWithRotation } from '@/lib/apiKeyManager';
import { UploadCloud, Download, RefreshCw, Loader2, X, ImageIcon } from 'lucide-react';
import { trackGeneration } from '@/lib/adminAnalytics';

// -------------------------------------------------------
// Gemini Vision: detect corners or deskew angle
// -------------------------------------------------------
async function analyzeImageWithGemini(base64: string, apiKey: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert graphic designer and geometry analyzer.
Look at the text or main logo in this image. It is currently tilted or rotated.
Your job is to determine exactly how many degrees it needs to be rotated to be perfectly horizontal and straight.
For example, if the right side is pointing up by 15 degrees, it needs to be rotated CLOCKWISE by 15 degrees (so output 15).
If the right side is pointing down, it needs to be rotated COUNTER-CLOCKWISE (so output -15).
Respond ONLY with a valid JSON object in this exact format:
{"rotation_degrees": 15}
Do not include markdown blocks, just the raw JSON.`,
          },
          {
            inline_data: {
              mime_type: 'image/png',
              data: base64.split(',')[1] ?? base64,
            },
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
  };

  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// -------------------------------------------------------
// Canvas utils
// -------------------------------------------------------
function rotateAndBinarizeCanvas(
  img: HTMLImageElement,
  angleDeg: number,
  threshold: number,
  forceInvert: boolean
): string {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  // New canvas size after rotation to avoid cropping
  const newW = Math.ceil(img.width * cos + img.height * sin);
  const newH = Math.ceil(img.width * sin + img.height * cos);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, newW, newH);

  // Rotate around center
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.resetTransform();

  // Binarize: pure black or pure white per pixel
  const imageData = ctx.getImageData(0, 0, newW, newH);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    // Treat near-transparent pixels as white
    if (alpha < 30) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
      continue;
    }
    // Luminance
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const bw = lum < threshold ? 0 : 255;
    data[i] = bw; data[i + 1] = bw; data[i + 2] = bw; data[i + 3] = 255;
  }

  // Auto-detect if background is black
  let blackBorderPixels = 0;
  let whiteBorderPixels = 0;
  
  for (let x = 0; x < newW; x++) {
    data[(0 * newW + x) * 4] === 0 ? blackBorderPixels++ : whiteBorderPixels++;
    data[((newH - 1) * newW + x) * 4] === 0 ? blackBorderPixels++ : whiteBorderPixels++;
  }
  for (let y = 0; y < newH; y++) {
    data[(y * newW + 0) * 4] === 0 ? blackBorderPixels++ : whiteBorderPixels++;
    data[(y * newW + (newW - 1)) * 4] === 0 ? blackBorderPixels++ : whiteBorderPixels++;
  }

  // If the border is mostly black (or user forced invert), invert the colors so background is ALWAYS white
  if (forceInvert || (!forceInvert && blackBorderPixels > whiteBorderPixels)) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL('image/png');
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------
export default function LogoBwView() {
  const { apiKeys, activeKeyIndex } = useAppStore();

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(128);
  const [manualAngle, setManualAngle] = useState<number>(0);
  const [forceInvert, setForceInvert] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [aiDidRun, setAiDidRun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setErrorMsg('শুধুমাত্র JPG, PNG, WEBP ফরম্যাট সাপোর্টেড');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('ফাইল সাইজ ১৫ MB এর বেশি হওয়া যাবে না');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalUrl(e.target?.result as string);
      setResultUrl(null);
      setErrorMsg(null);
      setStatusMsg('');
      setManualAngle(0);
      setForceInvert(false);
      setAiDidRun(false);
    };
    reader.readAsDataURL(file);
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

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const processImage = async () => {
    if (!originalUrl) return;

    // Check API key available
    const activeKey = apiKeys?.[activeKeyIndex];
    if (!activeKey) {
      setErrorMsg('অনুগ্রহ করে সেটিংস থেকে Gemini API Key যোগ করুন।');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setResultUrl(null);
    try {
      // Step 1: Ask Gemini for rotation angle IF not already run or modified
      if (!aiDidRun) {
        setStatusMsg('🔍 AI ছবি বিশ্লেষণ করে বাঁকা ঠিক করছে...');
        
        try {
          const response = await callWithRotation(async (key) => {
            return analyzeImageWithGemini(originalUrl, key);
          });
          
          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
          
          try {
            const parsed = JSON.parse(text.trim());
            const detectedAngle = parsed.rotation_degrees ?? 0;
            setManualAngle(detectedAngle);
            if (detectedAngle !== 0) {
              setStatusMsg(`✅ AI: ${detectedAngle}° ঘুরিয়ে সোজা করা হচ্ছে...`);
            } else {
              setStatusMsg('✅ AI: ছবি সোজা মনে হচ্ছে...');
            }
          } catch {
            // Failed to parse JSON
          }
          setAiDidRun(true);
        } catch (e) {
          setStatusMsg('⚠️ AI এনালাইসিস ব্যর্থ। আপনি ম্যানুয়ালি সোজা করতে পারেন...');
        }
      }

      // Step 2: Rotate + Binarize on canvas using manualAngle
      setStatusMsg('🎨 ছবি রূপান্তর করা হচ্ছে...');
      const img = new Image();
      img.src = originalUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('ছবি লোড হয়নি'));
      });

      // Pass the latest states directly (React state closure fix for multiple runs)
      const currentAngle = aiDidRun ? manualAngle : (manualAngle || 0);
      const output = rotateAndBinarizeCanvas(img, manualAngle, threshold, forceInvert);
      setResultUrl(output);
      setStatusMsg('✅ সম্পন্ন!');
      trackGeneration('logo_bw');
    } catch (err: any) {
      setErrorMsg(err.message ?? 'অজানা সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    a.download = `SmartImageStudio-LogoBW-${Date.now()}.png`;
    a.click();
  };

  const reset = () => {
    setOriginalUrl(null);
    setResultUrl(null);
    setErrorMsg(null);
    setStatusMsg('');
    setManualAngle(0);
    setForceInvert(false);
    setAiDidRun(false);
  };

  // ---- Upload State ----
  if (!originalUrl) {
    return (
      <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-12 fade-in duration-1000">
        {/* Dropzone */}
      <div 
        className={`relative w-full aspect-square max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center p-8 group cursor-pointer overflow-hidden shadow-2xl
          ${isDragging 
            ? 'border-cyan-500 bg-cyan-500/10 scale-[1.02] shadow-[0_0_80px_rgba(6,182,212,0.3)]' 
            : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-cyan-500/70 hover:bg-cyan-500/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(6,182,212,0.15)]'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
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
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

        {/* Decorative Orbs */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-cyan-500/30 to-blue-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-teal-500/30 to-cyan-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />

        {/* Premium Icon Container */}
        <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
          ${isDragging ? 'scale-110 -translate-y-2 bg-cyan-500/20 shadow-[0_10px_40px_rgba(6,182,212,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(6,182,212,0.2)]'}`}>
          
          {/* Pulsing rings inside icon container */}
          <div className="absolute inset-0 rounded-[2rem] border border-cyan-500/40 animate-[ping_3s_ease-in-out_infinite]" />
          
          <UploadCloud className="w-12 h-12 text-cyan-500 animate-[bounce_3s_ease-in-out_infinite]" />
        </div>

        <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
          লোগো আপলোড করুন
        </h3>
        
        <p className="relative z-10 text-lg font-bold text-cyan-500 group-hover:text-cyan-400 mb-10 text-center cursor-pointer transition-colors duration-500">
          ব্রাউজ করতে ক্লিক করুন
        </p>

        <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
            <ImageIcon className="w-5 h-5 text-cyan-500" />
            <span>সাপোর্টেড ফরম্যাট</span>
          </div>
          <span className="opacity-80 font-medium">JPG, PNG, WEBP • ১৫ MB</span>
        </div>
      </div>

      {errorMsg && (
        <p className="mt-4 text-red-500 text-sm font-medium bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">{errorMsg}</p>
      )}
    </div>
    );
  }

  // ---- Processing State ----
  if (isProcessing) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-12 glass-panel rounded-[2rem] animate-in zoom-in-95 duration-500">
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-800" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gray-800 dark:border-t-gray-200 border-r-gray-500 animate-[spin_1.5s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-[3px] border-transparent border-l-gray-500 border-b-gray-800 dark:border-b-gray-200 animate-[spin_2s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-gray-600 dark:border-t-gray-400 border-l-gray-400 animate-[spin_1s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-200 shadow-[0_0_10px_gray] animate-ping" />
          </div>
        </div>
        <p className="text-center font-bold text-gray-700 dark:text-gray-200 text-lg">{statusMsg || 'প্রসেস হচ্ছে...'}</p>
      </div>
    );
  }

  // ---- Result State ----
  if (resultUrl) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
        <div className="w-full glass-panel rounded-[2rem] p-4 sm:p-6">
          <h2 className="text-xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-4">
            ✅ রূপান্তর সম্পন্ন
          </h2>

          {/* Before / After */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">আগে (Original)</span>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md w-full flex justify-center relative items-center bg-gray-50 dark:bg-gray-900 p-4 min-h-[150px]">
                {/* Horizontal guide line */}
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/30 pointer-events-none z-10 border-t border-dashed border-red-500/30"></div>
                <img 
                  src={originalUrl} 
                  alt="Original" 
                  className="max-h-[30vh] w-auto object-contain transition-transform duration-75" 
                  style={{ 
                    imageRendering: 'pixelated',
                    transform: `rotate(${manualAngle}deg)`
                  }} 
                />
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">পরে (B&W Output)</span>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-md w-full flex justify-center bg-white p-4 min-h-[150px]">
                <img src={resultUrl} alt="B&W Result" className="max-h-[30vh] w-auto object-contain" />
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">
                কালো-সাদার সীমা (Threshold): <span className="text-gray-900 dark:text-white">{threshold}</span>
              </label>
              <input
                type="range" min={50} max={220} value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-gray-800"
              />
              <p className="text-[11px] text-gray-400 mt-1">কম মান = বেশি কালো | বেশি মান = বেশি সাদা</p>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 flex justify-between">
                <span>লোগো সোজা করুন (Rotation):</span>
                <span className="text-gray-900 dark:text-white">{manualAngle}°</span>
              </label>
              <input
                type="range" min={-45} max={45} value={manualAngle}
                onChange={(e) => setManualAngle(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <p className="text-[11px] text-gray-400 mt-1">AI ভুল করলে স্লাইডার দিয়ে পারফেক্টভাবে সোজা করুন</p>
            </div>
            
            <div className="md:col-span-2 flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200">সাদা/কালো রং উল্টে দিন (Invert)</span>
                <span className="text-[11px] text-gray-500">ব্যাকগ্রাউন্ড কালো হয়ে গেলে এটি টিক দিন</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={forceInvert} onChange={(e) => setForceInvert(e.target.checked)} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gray-800 dark:peer-checked:bg-gray-100"></div>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={processImage}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 dark:bg-gray-200 dark:hover:bg-white text-white dark:text-gray-900 font-bold rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" /> আবার রান করুন
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-100 dark:to-white text-white dark:text-gray-900 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <Download className="w-5 h-5" /> ডাউনলোড করুন
            </button>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-5 py-3 glass-button text-gray-500 hover:text-red-500 font-semibold rounded-xl transition-all"
            >
              <X className="w-4 h-4" /> নতুন ছবি
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Preview + Process ----
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
      <div className="w-full glass-panel p-8 rounded-[2rem] flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">ছবি প্রস্তুত!</h2>
        <p className="text-sm text-gray-500 mb-6">AI সোজা করে ব্ল্যাক & হোয়াইট করবে</p>

        <div className="relative w-full max-w-sm flex justify-center items-center rounded-2xl overflow-hidden shadow-xl mb-6 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 min-h-[250px]">
          {/* Horizontal guide line for alignment */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-red-500/50 pointer-events-none z-10 border-t border-dashed border-red-500/50"></div>
          
          <img 
            src={originalUrl} 
            className="max-h-60 w-auto object-contain transition-transform duration-75" 
            alt="Preview" 
            style={{ 
              imageRendering: 'pixelated',
              transform: `rotate(${manualAngle}deg)`
            }} 
          />
        </div>

        {/* Controls */}
        <div className="w-full mb-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2">
              কালো-সাদার সীমা (Threshold): <span className="text-gray-900 dark:text-white">{threshold}</span>
            </label>
            <input
              type="range" min={50} max={220} value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 flex justify-between">
              <span>লোগো সোজা করুন (Rotation):</span>
              <span className="text-gray-900 dark:text-white">{manualAngle}°</span>
            </label>
            <input
              type="range" min={-45} max={45} value={manualAngle}
              onChange={(e) => setManualAngle(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-xs text-gray-400 mt-1">AI নিজে থেকেই বাঁকা বুঝতে পারে। তবে আপনি চাইলে আগে থেকেই ঠিক করে দিতে পারেন।</p>
          </div>
        </div>

        {errorMsg && (
          <p className="mb-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg w-full text-center">{errorMsg}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={processImage}
            className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 text-white dark:text-gray-900 font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            🎨 ব্ল্যাক & হোয়াইটে রূপান্তর করুন
          </button>
          <button onClick={reset} className="flex items-center gap-2 px-4 py-3.5 glass-button text-gray-500 font-semibold rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
