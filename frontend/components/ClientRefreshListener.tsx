'use client';

import React, { useEffect, useState } from 'react';
import { sendClientHeartbeat, listenToRemoteRefresh, checkIsSessionBlocked } from '@/lib/adminAnalytics';
import { RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';

export default function ClientRefreshListener() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    // 1. Send initial heartbeat and schedule every 30 seconds
    sendClientHeartbeat();
    const heartbeatInterval = setInterval(() => {
      sendClientHeartbeat();
    }, 30000);

    // 1.5 Check block status periodically
    const checkBlock = async () => {
      const blocked = await checkIsSessionBlocked();
      if (blocked && !isBlocked) {
        setIsBlocked(true);
      } else if (!blocked && isBlocked) {
        setIsBlocked(false);
      }
    };
    checkBlock();
    const blockInterval = setInterval(checkBlock, 10000);

    // 2. Listen for Admin Force Refresh Signal (Silent Reload)
    const unsubscribe = listenToRemoteRefresh(() => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname.includes('/admin')) {
          console.log('🛡️ Admin page shielded from remote reload.');
          return;
        }
        console.log('🔄 Admin triggered Remote Refresh. Performing silent reload...');
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(r => r.unregister());
          });
        }
        window.location.reload();
      }
    });

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(blockInterval);
      unsubscribe();
    };
  }, [isBlocked]);

  if (isBlocked) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-6 backdrop-blur-xl">
        <ShieldAlert className="w-24 h-24 text-red-500 mb-6 animate-pulse" />
        <h1 className="text-4xl font-black text-white text-center mb-4 tracking-tight">Access Suspended</h1>
        <p className="text-lg text-gray-400 text-center max-w-md bg-white/5 p-6 rounded-2xl border border-white/10">
          Your access to Smart Image Studio has been temporarily suspended by the administrator. 
          Please contact support if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return null;
}
