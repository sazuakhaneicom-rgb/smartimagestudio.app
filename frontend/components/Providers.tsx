'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { listenToAppLinks } from '@/lib/adminAnalytics';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { theme, locale, setTheme, setLocale, setAppLinks } = useAppStore();

  useEffect(() => {
    // Rehydrate state from localStorage on mount if needed, 
    // or just rely on Zustand persist. Here we handle DOM effects.
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const storedLocale = localStorage.getItem('locale') as 'bn' | 'en' | null;

    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    }

    if (storedLocale) {
      setLocale(storedLocale);
    }
    
    setMounted(true);
  }, [setTheme, setLocale]);

  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    document.body.setAttribute('data-lang', locale);
    document.documentElement.lang = locale;
    localStorage.setItem('locale', locale);
  }, [locale, mounted]);

  // Listen for dynamic external API Links from Admin Panel
  useEffect(() => {
    if (!mounted) return;
    const unsub = listenToAppLinks((links) => {
      setAppLinks(links);
    });
    return () => unsub();
  }, [mounted, setAppLinks]);

  // Prevent hydration mismatch rendering
  if (!mounted) {
    return <div className="min-h-screen bg-transparent" />;
  }

  return <>{children}</>;
}
