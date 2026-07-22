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

    // 2. Listen for Admin Force Refresh Signal (Silent Reload)
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

    // 3. Listen to local custom event for admin panel local trigger
    const handleLocalTrigger = () => {
      if (typeof window !== 'undefined') window.location.reload();
    };
    window.addEventListener('trigger_refresh_animation', handleLocalTrigger);

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribe();
      window.removeEventListener('trigger_refresh_animation', handleLocalTrigger);
    };
  }, []);

  return null;
}
