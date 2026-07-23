'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AlertCircle, ArrowRight } from 'lucide-react';

export default function AnnouncementBanner() {
  const { siteSettings } = useAppStore();

  if (!siteSettings?.announcementText) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2.5 text-center shadow-md relative z-50 animate-in slide-in-from-top-4">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-7xl mx-auto">
        <span className="flex items-center gap-2 text-sm font-bold">
          <AlertCircle size={16} className="animate-pulse" />
          {siteSettings.announcementText}
        </span>
        {siteSettings.announcementLink && (
          <a 
            href={siteSettings.announcementLink} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-extrabold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors ml-2"
          >
            বিস্তারিত দেখুন <ArrowRight size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
