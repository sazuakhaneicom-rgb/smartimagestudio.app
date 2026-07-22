'use client';

import React, { useState } from 'react';
import { useAppStore, type ApiKeyEntry } from '@/store/useAppStore';
import { Trash2 } from 'lucide-react';

export default function ApiKeyCard({ keyEntry }: { keyEntry: ApiKeyEntry }) {
  const removeApiKey = useAppStore((state) => state.removeApiKey);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400';
      case 'standby': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400';
      case 'exhausted': return 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400';
      default: return 'border-gray-500 bg-gray-50 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '🟢 সক্রিয়';
      case 'standby': return '⏸️ অপেক্ষমান';
      case 'exhausted': return '🔴 সীমা শেষ';
      default: return 'অজানা';
    }
  };

  const displayKey = keyEntry.maskedValue;

  const handleDelete = () => {
    if (confirm('Are you sure you want to remove this API key?')) {
      if (removeApiKey) removeApiKey(keyEntry.id);
    }
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 border-l-[4px] ${getStatusColor(keyEntry.status).split(' ')[0]}`}>
      <div className="flex-1 min-w-0 pr-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {getStatusText(keyEntry.status)}
          </span>
        </div>
        <div className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate">
          {displayKey}
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Remove key"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
