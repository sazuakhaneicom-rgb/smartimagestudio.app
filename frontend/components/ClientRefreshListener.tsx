'use client';

import React, { useEffect, useState } from 'react';
import { sendClientHeartbeat, listenToRemoteRefresh, checkIfSessionBlocked } from '@/lib/adminAnalytics';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function ClientRefreshListener() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // 1. Send initial heartbeat and schedule every 30 seconds
    sendClientHeartbeat();
    const heartbeatInterval = setInterval(() => {
      sendClientHeartbeat();
    }, 30000);

    // 2. Check if current session is blocked by Admin
    const checkBlockedStatus = async () => {
      const blocked = await checkIfSessionBlocked();
      setIsBlocked(blocked);
    };

    checkBlockedStatus();
    const blockInterval = setInterval(checkBlockedStatus, 3000);

    // 3. Listen for Admin Force Refresh Signal (Silent Reload)
    const unsubscribe = listenToRemoteRefresh(() => {
      console.log('🔄 Admin triggered Remote Refresh. Performing silent reload...');
      if (typeof window !== 'undefined') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(r => r.unregister());
          });
        }
        window.location.reload();
      }
    });

    // 4. Listen to local custom event for admin panel local trigger
    const handleLocalTrigger = () => {
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('trigger_refresh_animation', handleLocalTrigger);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(blockInterval);
      unsubscribe();
      window.removeEventListener('trigger_refresh_animation', handleLocalTrigger);
    };
  }, []);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[999999] bg-[#0A0512] text-white flex items-center justify-center p-6 font-sans animate-in fade-in duration-500">
        <div className="max-w-md w-full bg-[#180E29] border border-red-500/40 p-8 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-3xl mx-auto flex items-center justify-center border border-red-500/30 shadow-lg shadow-red-500/20">
            <span className="text-4xl">🚫</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">এক্সেস স্থগিত করা হয়েছে</h2>
            <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Access Denied by Admin</p>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-medium bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
            এডমিন কর্তৃক আপনার ডিভাইস বা সেশনের এক্সেস সাময়িকভাবে বন্ধ করা হয়েছে। কোনো প্রশ্ন থাকলে এডমিনের সাথে যোগাযোগ করুন।
          </p>
        </div>
      </div>
    );
  }

  return null;
}
