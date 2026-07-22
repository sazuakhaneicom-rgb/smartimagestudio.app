'use client';

import { useAppStore } from '@/store/useAppStore';
import { useEffect, useState } from 'react';

export default function LanguageToggle() {
  const { locale, setLocale } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === 'bn' ? 'en' : 'bn';
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
    document.body.setAttribute('data-lang', newLocale);
  };

  if (!mounted) {
    return <div className="w-[4.5rem] h-9" />;
  }

  return (
    <div
      className="relative flex items-center p-1 bg-purple-50 dark:bg-black/30 rounded-full border border-purple-200/50 dark:border-purple-800/40 shadow-sm"
      aria-label="Toggle Language"
    >
      <div 
        className={`absolute inset-y-1 w-[46px] bg-white dark:bg-purple-600 rounded-full shadow-sm transition-transform duration-300 ease-out ${locale === 'bn' ? 'translate-x-0' : 'translate-x-[46px]'}`}
      />
      
      <button
        onClick={() => {
          if (locale !== 'bn') toggleLocale();
        }}
        className={`relative z-10 w-[46px] h-7 flex items-center justify-center text-sm font-semibold rounded-full transition-colors duration-300 ${
          locale === 'bn' ? 'text-[var(--color-primary)] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        বাং
      </button>
      
      <button
        onClick={() => {
          if (locale !== 'en') toggleLocale();
        }}
        className={`relative z-10 w-[46px] h-7 flex items-center justify-center text-sm font-semibold rounded-full transition-colors duration-300 ${
          locale === 'en' ? 'text-[var(--color-primary)] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
        }`}
      >
        EN
      </button>
    </div>
  );
}
