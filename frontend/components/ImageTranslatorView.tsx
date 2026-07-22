'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { callWithRotation } from '@/lib/apiKeyManager';
import { Download, X, ImageIcon, Copy, CheckCircle2, ScanLine, FileText, Zap, WifiOff } from 'lucide-react';
import { trackGeneration, listenToFeatureFlags, FeatureFlags, defaultFeatureFlags } from '@/lib/adminAnalytics';
import { createWorker } from 'tesseract.js';

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b'
];

async function extractTextWithGemini(base64: string, apiKey: string): Promise<Response> {
  const mimeMatch = base64.match(/^data:(image\/[a-zA-Z]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

  const body = {
    contents: [
      {
        parts: [
          {
            text: `You are an expert OCR and text extraction AI.
Extract all the text from this image exactly as it is written, preserving paragraphs, lists, and formatting perfectly.
Do NOT translate the text. Just extract the exact original text.
Return ONLY a valid JSON object in this exact format (no markdown, just JSON):
{"extractedText": "..."}`,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64.split(',')[1] ?? base64,
            },
          },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  };

  let lastResponse: Response | null = null;
  let rateLimitResponse: Response | null = null;

  for (const model of FALLBACK_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      lastResponse = response;

      if (response.ok) return response;
      
      if (response.status === 429) {
        rateLimitResponse = response;
        continue;
      }
      
      if (response.status === 404 || response.status === 503) {
        continue;
      }
      return response;
    } catch (e) {
      console.warn(`Fetch failed for model ${model}:`, e);
    }
  }

  if (rateLimitResponse) return rateLimitResponse;
  if (lastResponse) return lastResponse;
  throw new Error('Failed to connect to Gemini API');
}

// Utility to clean and format raw OCR text from Tesseract
function formatOcrText(text: string): string {
  if (!text) return '';
  
  // 1. Remove excessive newlines (more than 2)
  let clean = text.replace(/\n{3,}/g, '\n\n');
  
  // 2. Fix broken single lines (join lines if they don't end with punctuation)
  // Bengali danda (।) or English punctuation (. ! ?)
  clean = clean.replace(/([^.!?।\n:-])\n(?!\n)/g, '$1 ');
  
  // 3. Remove excessive spaces between words
  clean = clean.replace(/[ \t]{2,}/g, ' ');
  
  // 4. Ensure paragraphs are properly spaced
  clean = clean.replace(/\n\s*\n/g, '\n\n');
  
  return clean.trim();
}

async function getResizedBase64(dataUrl: string, maxWidth = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxWidth && img.height <= maxWidth) {
        resolve(dataUrl);
        return;
      }
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      const canvas = document.createElement('canvas');
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = dataUrl;
  });
}

export default function ImageTranslatorView() {
  const { apiKeys, activeKeyIndex } = useAppStore();

  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [engine, setEngine] = useState<'ai' | 'offline'>('offline');
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = listenToFeatureFlags((newFlags) => {
      setFlags(newFlags);
      if (!newFlags.offline_scanner && engine === 'offline') {
        setEngine('ai');
      }
    });
    return () => unsub();
  }, [engine]);

  // Results State
  const [extractedText, setExtractedText] = useState('');
  const [copied, setCopied] = useState(false);

  // Automatically switch to offline engine if no API keys exist
  useEffect(() => {
    if ((!apiKeys || apiKeys.length === 0) && engine === 'ai') {
      setEngine('offline');
    }
  }, [apiKeys, engine]);

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
      setExtractedText('');
      setErrorMsg(null);
      setStatusMsg('');
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

  const processWithOfflineEngine = async () => {
    if (!originalUrl) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusMsg('ছবি থেকে হুবহু টেক্সট বের করা হচ্ছে...');
    
    try {
      const worker = await createWorker('ben+eng', 1, {
        workerPath: '/tesseract/worker.min.js',
        corePath: '/tesseract/tesseract-core.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      });
      
      const result = await worker.recognize(originalUrl);
      const nicelyFormattedText = formatOcrText(result.data.text);
      setExtractedText(nicelyFormattedText || 'কোনো টেক্সট পাওয়া যায়নি।');
      await worker.terminate();
      
      trackGeneration('text_extractor_offline');
    } catch (e: any) {
      console.error('Tesseract Error:', e);
      setErrorMsg('অফলাইন স্ক্যানিং ব্যর্থ হয়েছে: ' + (typeof e === 'string' ? e : (e.message || JSON.stringify(e))));
    } finally {
      setIsProcessing(false);
    }
  };

  const processWithGemini = async () => {
    if (!originalUrl) return;
    const activeKey = apiKeys?.[activeKeyIndex];
    if (!activeKey) {
      setErrorMsg('অনুগ্রহ করে সেটিংস থেকে API Key যোগ করুন অথবা "ফ্রি অফলাইন স্ক্যানার" ব্যবহার করুন।');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusMsg('🔍 ছবি স্ক্যান করে টেক্সট বের করা হচ্ছে...');
    
    try {
      const optimizedBase64 = await getResizedBase64(originalUrl);
      const response = await callWithRotation(async (key) => {
        return extractTextWithGemini(optimizedBase64, key);
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
      const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      try {
        const parsed = JSON.parse(jsonStr);
        setExtractedText(parsed.extractedText || 'কোনো টেক্সট পাওয়া যায়নি।');
        trackGeneration('text_extractor');
      } catch (e) {
        throw new Error('ডেটা প্রসেস করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'অজানা সমস্যা হয়েছে');
    } finally {
      setIsProcessing(false);
    }
  };

  const processImage = () => {
    if (engine === 'ai') {
      processWithGemini();
    } else {
      processWithOfflineEngine();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Extracted-Text-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setOriginalUrl(null);
    setExtractedText('');
    setErrorMsg(null);
    setStatusMsg('');
  };

  // ---- Upload State ----
  if (!originalUrl) {
    return (
      <div className="w-full flex flex-col items-center animate-in slide-in-from-bottom-12 fade-in duration-1000">
        <div 
          className={`relative w-full aspect-square max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center p-8 group cursor-pointer overflow-hidden shadow-2xl
            ${isDragging 
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02] shadow-[0_0_80px_rgba(59,130,246,0.3)]' 
              : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-blue-500/70 hover:bg-blue-500/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(59,130,246,0.15)]'
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
          
          <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
            ${isDragging ? 'scale-110 -translate-y-2 bg-blue-500/20 shadow-[0_10px_40px_rgba(59,130,246,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(59,130,246,0.2)]'}`}>
            <div className="absolute inset-0 rounded-[2rem] border border-blue-500/40 animate-[ping_3s_ease-in-out_infinite]" />
            <FileText className="w-12 h-12 text-blue-500 animate-[bounce_3s_ease-in-out_infinite]" />
          </div>

          <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
            যেকোনো লেখা স্ক্যান করুন
          </h3>
          <p className="relative z-10 text-lg font-bold text-blue-500 group-hover:text-blue-400 mb-10 text-center cursor-pointer transition-colors duration-500">
            ব্রাউজ করতে ক্লিক করুন
          </p>

          <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
              <ImageIcon className="w-5 h-5 text-blue-500" />
              <span>বাংলা, ইংরেজি সহ যেকোনো ভাষা</span>
            </div>
            <span className="opacity-80 font-medium">JPG, PNG, WEBP</span>
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
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center p-12 glass-panel rounded-[2rem] animate-in zoom-in-95 duration-500 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
          <div className="w-full h-1 bg-blue-500 shadow-[0_0_20px_10px_rgba(59,130,246,0.6)] animate-[scan_2s_linear_infinite]" />
        </div>
        <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-xl border-[3px] border-blue-500/30 animate-pulse" />
          <ScanLine className="w-12 h-12 text-blue-500 animate-bounce" />
        </div>
        <h2 className="text-xl font-black text-gray-800 dark:text-gray-100 mb-2">এনালাইসিস চলছে...</h2>
        <p className="text-center font-bold text-blue-500 text-sm">{statusMsg || 'ছবি থেকে হুবহু টেক্সট বের করা হচ্ছে...'}</p>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scan {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(500px); }
          }
        `}} />
      </div>
    );
  }

  // ---- Result State ----
  if (extractedText) {
    return (
      <div className="w-full max-w-6xl mx-auto animate-in fade-in duration-700 space-y-6">
        <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-blue-600 dark:text-blue-400">স্ক্যান সম্পন্ন হয়েছে!</h2>
          <div className="flex gap-3">
            <button onClick={downloadText} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-sm">
              <Download className="w-4 h-4" /> টেক্সট সেভ করুন
            </button>
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 glass-button text-gray-500 hover:text-red-500 font-semibold rounded-xl transition-all text-sm">
              <X className="w-4 h-4" /> নতুন ছবি
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 glass-panel rounded-2xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> মূল ছবি
            </h3>
            <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 flex items-center justify-center min-h-[300px]">
              <img src={originalUrl} className="max-w-full max-h-[500px] object-contain drop-shadow-md" alt="Source" />
            </div>
          </div>

          <div className="lg:col-span-2 glass-panel rounded-2xl p-5 flex flex-col gap-3 relative group border-blue-500/30 bg-blue-50/10 dark:bg-blue-900/5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-blue-500 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" /> এক্সট্রাক্ট করা টেক্সট
              </h3>
              <button 
                onClick={copyToClipboard}
                className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-500 rounded-lg transition-colors flex items-center gap-2"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span className="text-sm font-bold">{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
              </button>
            </div>
            <div className="flex-1 bg-white/80 dark:bg-black/40 rounded-xl p-6 border border-blue-200 dark:border-blue-800 overflow-y-auto max-h-[500px] custom-scrollbar text-base whitespace-pre-wrap font-medium text-gray-900 dark:text-gray-100 leading-relaxed shadow-inner">
              {extractedText}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Preview + Action ----
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-in fade-in duration-700">
      <div className="w-full glass-panel p-8 rounded-[2rem] flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">ছবি প্রস্তুত!</h2>
        <p className="text-sm text-gray-500 mb-6">ছবি থেকে হুবহু লেখাগুলো স্ক্যান করে বের করুন</p>

        <div className="relative w-full max-w-sm flex justify-center items-center rounded-2xl overflow-hidden shadow-xl mb-6 border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 min-h-[250px]">
          <img src={originalUrl} className="max-h-60 w-auto object-contain" alt="Preview" />
        </div>
        
        {/* Engine Selection Toggle */}
        <div className="w-full max-w-md bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl flex mb-6">
          {flags.offline_scanner && (
            <button 
              onClick={() => setEngine('offline')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${engine === 'offline' ? 'bg-white dark:bg-gray-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <WifiOff className="w-4 h-4" /> ফ্রি অফলাইন স্ক্যানার
            </button>
          )}
          <button 
            onClick={() => setEngine('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${engine === 'ai' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Zap className="w-4 h-4" /> এআই স্ক্যানার (API Key)
          </button>
        </div>

        {errorMsg && (
          <p className="mb-4 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg w-full text-center">{errorMsg}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={processImage}
            className={`flex items-center gap-2 px-8 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95 ${engine === 'offline' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-blue-600 to-cyan-600 shadow-blue-500/30'}`}
          >
            <ScanLine className="w-5 h-5" /> {engine === 'offline' ? 'ফ্রি স্ক্যান শুরু করুন' : 'এআই স্ক্যান শুরু করুন'}
          </button>
          <button onClick={reset} className="flex items-center gap-2 px-4 py-3.5 glass-button text-gray-500 font-semibold rounded-xl hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
