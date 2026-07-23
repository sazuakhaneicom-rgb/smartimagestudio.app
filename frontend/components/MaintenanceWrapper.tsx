'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Wrench } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function MaintenanceWrapper({ children }: { children: React.ReactNode }) {
  const { siteSettings } = useAppStore();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  // Admin bypasses maintenance mode to be able to turn it off
  if (pathname?.startsWith('/admin')) {
    return <>{children}</>;
  }

  if (siteSettings?.maintenanceMode) {
    return (
      <div className="min-h-screen bg-[#0F0A1A] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1128] border border-purple-500/20 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Wrench className="w-10 h-10 text-purple-400 animate-bounce" />
            </div>
            
            <h1 className="text-2xl font-black text-white mb-3 tracking-tight">System Under Maintenance</h1>
            
            <p className="text-gray-400 text-sm leading-relaxed font-bold">
              {siteSettings.maintenanceMessage || "আমাদের সিস্টেমে বর্তমানে আপডেট চলছে। দয়া করে কিছুক্ষণ পর আবার চেষ্টা করুন।"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
