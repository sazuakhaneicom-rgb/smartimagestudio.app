'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed it
    const isDismissed = localStorage.getItem('pwa_banner_dismissed');
    
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      localStorage.setItem('pwa_banner_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed top-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-[26rem] z-[100] animate-in slide-in-from-top-10 fade-in duration-500">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-2 border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 relative overflow-hidden">
        
        {/* Glow Effect */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 blur-[30px] rounded-full pointer-events-none" />
        
        <button 
          onClick={handleDismiss} 
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10 p-1 bg-gray-100 dark:bg-gray-800 rounded-full"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="flex items-start gap-4 mt-1 relative z-10 pr-6">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-purple-500/30 shrink-0">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 dark:text-gray-100 text-base leading-tight">
              অ্যাপ হিসেবে ইনস্টল করুন
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 leading-snug font-medium">
              Smart Image Studio আপনার ডিভাইসে ইনস্টল করে রাখুন। এতে এক ক্লিকেই দ্রুত কাজ করা যাবে!
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-2 relative z-10">
          <button 
            onClick={handleDismiss}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            পরে করবো
          </button>
          <button 
            onClick={handleInstall}
            className="flex-[1.5] py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-md shadow-pink-500/25 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> ইনস্টল করুন
          </button>
        </div>
      </div>
    </div>
  );
}
