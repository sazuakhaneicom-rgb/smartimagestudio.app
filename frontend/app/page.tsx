'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { useAppStore } from '@/store/useAppStore';
import Header from '@/components/Header';
import UploadDropzone from '@/components/UploadDropzone';
import BgRemoverView from '@/components/BgRemoverView';
import ImageToHdView from '@/components/ImageToHdView';
import LogoBwView from '@/components/LogoBwView';
import PhotoResizerView from '@/components/PhotoResizerView';
import { listenToFeatureFlags, FeatureFlags, defaultFeatureFlags } from '@/lib/adminAnalytics';
import { X, Loader2, CheckCircle, AlertCircle, Info, Scissors, Sparkles, ScanLine, Shapes, Crop } from 'lucide-react';

import SettingsModal from '@/components/SettingsModal';

function NotificationToast() {
  const { notifications, removeNotification } = useAppStore();
  
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {notifications.map(notif => (
        <div 
          key={notif.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-300 min-w-[320px] max-w-md
            ${notif.type === 'error' ? 'bg-red-50/95 dark:bg-red-950/95 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-200' :
              notif.type === 'success' ? 'bg-green-50/95 dark:bg-green-950/95 border-green-200 dark:border-green-900/50 text-green-800 dark:text-green-200' :
              notif.type === 'warning' ? 'bg-orange-50/95 dark:bg-orange-950/95 border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-200' :
              'bg-blue-50/95 dark:bg-blue-950/95 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-200'
            }`}
        >
          <div className="mt-0.5">
            {notif.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notif.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notif.type === 'warning' && <AlertCircle className="w-5 h-5" />}
            {notif.type === 'info' && <Info className="w-5 h-5" />}
          </div>
          
          <p className="text-sm font-medium flex-1 leading-snug">{notif.message}</p>
          
          <button 
            onClick={() => removeNotification(notif.id)}
            className="p-1 opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ProcessingStatus() {
  const { processingStep, setCurrentView, setProcessingStep } = useAppStore();

  const stepLabels: Record<string, string> = {
    uploading: 'আপলোড হচ্ছে...',
    analyzing: 'ছবি বিশ্লেষণ হচ্ছে...',
    separating: 'লেয়ার আলাদা হচ্ছে...',
    inpainting: 'প্রসেসিং চলছে...',
    done: 'সম্পন্ন! ✓',
  };

  const isError = processingStep === 'error';

  const handleRetry = () => {
    setProcessingStep('idle');
    setCurrentView('upload');
  };

  return (
    <div className="flex flex-col items-center justify-center animate-in zoom-in-95 fade-in duration-700 gap-6">
      {/* Icon circle */}
      <div className="relative w-36 h-36">
        <div className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-gray-800" />
        {isError ? (
          <div className="absolute inset-0 rounded-full border-4 border-red-400 dark:border-red-500 flex items-center justify-center bg-red-50/50 dark:bg-red-950/30 m-0">
            <AlertCircle className="w-14 h-14 text-red-500 dark:text-red-400" />
          </div>
        ) : (
          <>
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[var(--color-primary)] border-r-purple-500 animate-[spin_1.5s_linear_infinite]" />
            <div className="absolute inset-3 rounded-full border-[3px] border-transparent border-l-purple-500 border-b-[var(--color-primary)] animate-[spin_2s_linear_infinite_reverse]" />
            <div className="absolute inset-6 rounded-full border-[3px] border-transparent border-t-purple-400 border-l-[var(--color-primary)] animate-[spin_1s_linear_infinite]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-[var(--color-primary)] shadow-[0_0_15px_#a855f7] animate-ping" />
            </div>
          </>
        )}
      </div>

      {/* Status text */}
      <div className="text-center space-y-3">
        <h2 className={`text-3xl font-extrabold tracking-tight ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'}`}>
          {isError ? 'প্রসেসিং ব্যর্থ হয়েছে' : (stepLabels[processingStep] ?? 'প্রসেসিং হচ্ছে...')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center max-w-md text-base leading-relaxed">
          {isError
            ? 'একটি সমস্যা হয়েছে। নিচে notification দেখুন এবং আবার চেষ্টা করুন।'
            : 'অনুগ্রহ করে অপেক্ষা করুন। AI আপনার ছবির লেয়ার আলাদা করছে।'}
        </p>
      </div>

      {/* Retry button on error */}
      {isError && (
        <button
          onClick={handleRetry}
          className="mt-2 px-8 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-semibold rounded-xl shadow-lg shadow-purple-500/20 transition-all duration-200 active:scale-95"
        >
          ↩ আবার চেষ্টা করুন
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { 
    currentView, 
    setCurrentView,
    appMode,
    setAppMode,
    setOriginalImage,
    setLayers,
    setProcessingStep,
    isSettingsOpen
  } = useAppStore();

  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);

  useEffect(() => {
    const unsub = listenToFeatureFlags((newFlags) => {
      setFlags(newFlags);
    });
    return () => unsub();
  }, []);

  // Auto fallback if active mode is disabled by admin
  useEffect(() => {
    const modeFlagMap: Record<string, keyof FeatureFlags> = {
      'bg-remover': 'bg_remover',
      'image-upscaler': 'image_hd',
      'logo-bw': 'logo_bw',
      'layer-extractor': 'layer_extractor',
      'photo-resizer': 'photo_resizer'
    };

    const currentFlagKey = modeFlagMap[appMode];
    if (currentFlagKey && flags[currentFlagKey] === false) {
      const modes: Array<{ mode: typeof appMode; key: keyof FeatureFlags }> = [
        { mode: 'bg-remover', key: 'bg_remover' },
        { mode: 'image-upscaler', key: 'image_hd' },
        { mode: 'logo-bw', key: 'logo_bw' },
        { mode: 'layer-extractor', key: 'layer_extractor' },
        { mode: 'photo-resizer', key: 'photo_resizer' }
      ];

      const fallback = modes.find(m => flags[m.key] === true);
      if (fallback) {
        setAppMode(fallback.mode);
      }
    }
  }, [appMode, flags, setAppMode]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentView === 'workspace') {
      router.push('/workspace');
    }
  }, [currentView, router]);

  if (!mounted) return null;

  return (
    <div className="h-full flex flex-col transition-colors duration-500 relative font-sans">
      
      {/* Premium Animated Background (Mesh Gradient / Glowing Orbs) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/20 dark:bg-purple-900/20 blur-[120px] mix-blend-screen dark:mix-blend-lighten animate-float" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/20 dark:bg-indigo-900/20 blur-[100px] mix-blend-screen dark:mix-blend-lighten animate-float-delayed" />
        <div className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-pink-500/10 dark:bg-pink-900/10 blur-[150px] mix-blend-screen dark:mix-blend-lighten animate-pulse-slow" />
        
        {/* Noise overlay for texture */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <Header />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-4 pt-24 sm:pt-28 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-6xl mx-auto">
            
            {/* Premium Mode Switcher */}
            {currentView === 'upload' && (
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 bg-white/50 dark:bg-black/40 backdrop-blur-xl p-2 rounded-2xl mb-8 sm:mb-12 shadow-lg border border-white/20 dark:border-white/10 animate-in slide-in-from-top-4 fade-in duration-700 w-full sm:w-auto">
                {flags.bg_remover && (
                  <button
                    onClick={() => {
                      setAppMode('bg-remover');
                      setOriginalImage(null);
                      setLayers([]);
                      setProcessingStep('idle');
                      setCurrentView('upload');
                    }}
                    className={`flex-1 sm:flex-none flex items-center justify-center min-w-0 sm:min-w-[140px] gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                      appMode === 'bg-remover' 
                        ? 'bg-pink-500 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Scissors className="w-5 h-5" />
                    ব্যাকগ্রাউন্ড রিমুভার
                  </button>
                )}

                {flags.image_hd && (
                  <button
                    onClick={() => {
                      setAppMode('image-upscaler');
                      setOriginalImage(null);
                      setLayers([]);
                      setProcessingStep('idle');
                      setCurrentView('upload');
                    }}
                    className={`flex-1 sm:flex-none flex items-center justify-center min-w-0 sm:min-w-[140px] gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                      appMode === 'image-upscaler' 
                        ? 'bg-indigo-500 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Image to HD
                  </button>
                )}

                {flags.logo_bw && (
                  <button
                    onClick={() => {
                      setAppMode('logo-bw');
                      setOriginalImage(null);
                      setLayers([]);
                      setProcessingStep('idle');
                      setCurrentView('upload');
                    }}
                    className={`flex-1 sm:flex-none flex items-center justify-center min-w-0 sm:min-w-[140px] gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                      appMode === 'logo-bw'
                        ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-900 shadow-md'
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <ScanLine className="w-5 h-5" />
                    লোগো B&W
                  </button>
                )}

                {flags.layer_extractor && (
                  <button
                    onClick={() => {
                      setAppMode('layer-extractor');
                      setOriginalImage(null);
                      setLayers([]);
                      setProcessingStep('idle');
                      setCurrentView('upload');
                    }}
                    className={`flex-1 sm:flex-none flex items-center justify-center min-w-0 sm:min-w-[140px] gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                      appMode === 'layer-extractor' 
                        ? 'bg-[var(--color-primary)] text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Shapes className="w-5 h-5" />
                    লেয়ার এক্সট্রাক্টর
                  </button>
                )}

                {flags.photo_resizer && (
                  <button
                    onClick={() => {
                      setAppMode('photo-resizer');
                      setOriginalImage(null);
                      setLayers([]);
                      setProcessingStep('idle');
                      setCurrentView('upload');
                    }}
                    className={`col-span-2 sm:col-span-1 flex-1 sm:flex-none flex items-center justify-center min-w-0 sm:min-w-[140px] gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 ${
                      appMode === 'photo-resizer' 
                        ? 'bg-emerald-500 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <Crop className="w-5 h-5" />
                    ফটো রিসাইজার
                  </button>
                )}
              </div>
            )}

            {currentView === 'upload' && appMode === 'layer-extractor' && (
              <div className="w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-12 fade-in duration-1000">
                <div className="w-full max-w-md">
                  <UploadDropzone />
                </div>
              </div>
            )}

            {currentView === 'upload' && appMode === 'bg-remover' && (
              <BgRemoverView />
            )}

            {currentView === 'upload' && appMode === 'image-upscaler' && (
              <ImageToHdView />
            )}

            {currentView === 'upload' && appMode === 'logo-bw' && (
              <LogoBwView />
            )}

            {currentView === 'upload' && appMode === 'photo-resizer' && (
              <PhotoResizerView />
            )}

            {currentView === 'processing' && <ProcessingStatus />}
          </div>
        </main>
      </div>

      {isSettingsOpen && <SettingsModal />}
      <NotificationToast />
    </div>
  );
}
