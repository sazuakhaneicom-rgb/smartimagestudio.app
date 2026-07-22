'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { AlertOctagon, Key, Clock } from 'lucide-react';

export default function AllKeysExhaustedModal() {
  const { t } = useTranslation();
  const setAllKeysExhausted = useAppStore((state) => state.setAllKeysExhausted);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);

  const handleOpenSettings = () => {
    if (setAllKeysExhausted) setAllKeysExhausted(false);
    if (setSettingsOpen) setSettingsOpen(true);
  };

  const handleClose = () => {
    if (setAllKeysExhausted) setAllKeysExhausted(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-red-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500 border border-red-100 dark:border-red-900/50">
        
        {/* Pulsing background effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-red-500/10 to-transparent dark:from-red-500/20 pointer-events-none"></div>

        <div className="relative p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-6 relative">
            <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-20"></span>
            <AlertOctagon size={40} className="relative z-10" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {t('allKeysExhausted') || 'সব API কী-এর সীমা শেষ হয়ে গেছে'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
            {t('allKeysExhaustedDesc') || 'আপনার যোগ করা সবগুলো জেমিনি API কী এর রেট লিমিট শেষ হয়ে গেছে। দয়া করে নতুন কী যোগ করুন অথবা কিছুক্ষণ অপেক্ষা করুন।'}
          </p>

          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 font-medium mb-8 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-lg">
            <Clock size={16} />
            <span>সাধারণত ১-২ ঘন্টা পর আবার চেষ্টা করা যায়</span>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-4 py-3.5 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-500/30 hover:shadow-red-500/40"
            >
              <Key size={18} />
              {t('addNewKey') || 'নতুন কী যোগ করুন'}
            </button>
            <button
              onClick={handleClose}
              className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-xl font-medium transition-colors"
            >
              {t('tryAgainLater') || 'কিছুক্ষণ পর আবার চেষ্টা করুন'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
