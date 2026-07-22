'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Info, AlertTriangle, XCircle, CheckCircle, X } from 'lucide-react';

export default function NotificationToast() {
  const notifications = useAppStore((state) => state.notifications) || [];
  const removeNotification = useAppStore((state) => state.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((toast) => {
        const getStyles = () => {
          switch (toast.type) {
            case 'success': return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500', icon: <CheckCircle className="text-green-500" size={20} /> };
            case 'error': return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', icon: <XCircle className="text-red-500" size={20} /> };
            case 'warning': return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-500', icon: <AlertTriangle className="text-amber-500" size={20} /> };
            case 'info': default: return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500', icon: <Info className="text-blue-500" size={20} /> };
          }
        };

        const styles = getStyles();

        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border-l-4 ${styles.border} bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 animate-in slide-in-from-right-8 fade-in duration-300`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification && removeNotification(toast.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={18} />
            </button>
            {/* Auto dismiss logic ideally handled in store or via a small wrapper component, but assuming it's managed externally or we can set timeout here */}
          </div>
        );
      })}
    </div>
  );
}
