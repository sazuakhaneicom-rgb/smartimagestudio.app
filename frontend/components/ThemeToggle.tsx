'use client';

import { useAppStore } from '@/store/useAppStore';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <button
      onClick={() => {
        toggleTheme();
        localStorage.setItem('theme', theme === 'light' ? 'dark' : 'light');
        if (theme === 'light') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }}
      className="p-2 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-300 text-[var(--color-primary)] dark:text-purple-400 group relative"
      aria-label="Toggle Theme"
    >
      <div className="relative w-6 h-6 overflow-hidden flex items-center justify-center">
        <Sun className={`absolute transition-all duration-500 ${theme === 'dark' ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
        <Moon className={`absolute transition-all duration-500 ${theme === 'light' ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
      </div>
    </button>
  );
}
