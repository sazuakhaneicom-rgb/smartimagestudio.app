'use client';

import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { Layers, Settings, Download } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import LanguageToggle from './LanguageToggle';
import { useEffect, useState } from 'react';

export default function Header() {
  const { t } = useTranslation();
  const { apiKeys, setSettingsOpen } = useAppStore();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const noApiKeys = apiKeys.length === 0;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    }

    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between glass-panel rounded-2xl px-6 py-3 transition-all duration-300">
        <div className="flex items-center gap-3 text-[var(--color-primary)] dark:text-purple-400 group cursor-pointer">
          <div className="p-1 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-xl group-hover:scale-110 transition-transform duration-300 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <img src="/logo.png" alt="Smart Image Studio Logo" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-[var(--color-primary)] to-purple-600 dark:from-purple-400 dark:to-purple-200">
            {t('app.name')}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-bold rounded-lg shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              ইনস্টল অ্যাপ
            </button>
          )}

          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="sm:hidden p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md active:scale-95"
              aria-label="Install App"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <LanguageToggle />
          <ThemeToggle />
          
          <button
            onClick={() => setSettingsOpen(true)}
            className="relative p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300 text-[var(--color-primary)] dark:text-purple-400 group"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            {noApiKeys && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-sm border border-white dark:border-[#1A1128]"></span>
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
