'use client';

import React, { useEffect, useState } from 'react';
import { sendClientHeartbeat, listenToRemoteRefresh } from '@/lib/adminAnalytics';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function ClientRefreshListener() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // 1. Send initial heartbeat and schedule every 30 seconds
    sendClientHeartbeat();
    const heartbeatInterval = setInterval(() => {
      sendClientHeartbeat();
    }, 30000);

    // 2. Listen for Admin Force Refresh Signal
    const unsubscribe = listenToRemoteRefresh(() => {
      console.log('🔄 Admin triggered Remote Refresh. Triggering animated reload...');
      setIsRefreshing(true);
      
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Unregister any active service worker caches if present
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
              registrations.forEach(r => r.unregister());
            });
          }
          
          // Perform hard reload
          window.location.reload();
        }
      }, 1200);
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
    };
  }, []);

  if (!isRefreshing) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#0F0A1A]/90 backdrop-blur-2xl flex items-center justify-center p-4 font-sans animate-in fade-in duration-300">
      <div className="bg-[#1A1128] border border-pink-500/40 p-8 rounded-3xl shadow-2xl max-w-md w-full text-center flex flex-col items-center relative overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Glow Effects */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-pink-500/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-purple-500/30 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center shadow-xl shadow-pink-500/30 mb-6 relative">
          <RefreshCw className="w-10 h-10 text-white animate-spin" />
          <Sparkles className="w-5 h-5 text-amber-300 absolute -top-2 -right-2 animate-bounce" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">লাইভ আপডেট সিগন্যাল পাওয়া গেছে!</h3>
        <p className="text-xs text-gray-300 font-medium mt-2 leading-relaxed">
          এডমিন কর্তৃক নতুন আপডেট ইস্যু করা হয়েছে। ১ সেকেন্ডের মধ্যে ব্রাউজার রিসেট ও রিফ্রেশ সম্পন্ন হচ্ছে...
        </p>

        <div className="mt-6 w-full bg-gray-800/80 rounded-full h-2 overflow-hidden p-0.5 border border-purple-500/20">
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 h-full rounded-full animate-[pulse_1s_infinite] w-full" />
        </div>
      </div>
    </div>
  );
}
