'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { X, Plus, ExternalLink, Sparkles } from 'lucide-react';
import ApiKeyCard from './ApiKeyCard';
import { addKeyToStore } from '@/lib/apiKeyManager';

export default function SettingsModal() {
  const { t } = useTranslation();
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const apiKeys = useAppStore((state) => state.apiKeys) || [];
  const addApiKey = useAppStore((state) => state.addApiKey);
  const replicateApiKey = useAppStore((state) => state.replicateApiKey);
  const setReplicateApiKey = useAppStore((state) => state.setReplicateApiKey);
  const photoroomApiKey = useAppStore((state) => state.photoroomApiKey);
  const setPhotoroomApiKey = useAppStore((state) => state.setPhotoroomApiKey);
  
  const [newKey, setNewKey] = useState('');

  const handleAddKey = async () => {
    if (newKey.trim().length > 10) {
      try {
        await addKeyToStore(newKey.trim());
        setNewKey('');
      } catch (e) {
        console.error('Failed to add key', e);
      }
    }
  };

  const handleClose = () => {
    if (setSettingsOpen) setSettingsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-8 duration-500 border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('settings') || 'সেটিংস'}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {t('geminiApiKeys') || 'জেমিনি API কী সমূহ'}
          </h3>

          <div className="space-y-3">
            {apiKeys.map((entry) => (
              <ApiKeyCard key={entry.id} keyEntry={entry} />
            ))}

            {apiKeys.length < 4 && (
              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder={t('enterNewApiKey') || 'নতুন API কী প্রবেশ করুন...'}
                  className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50 focus:border-[#7C3AED] transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKey()}
                />
                <button
                  onClick={handleAddKey}
                  disabled={newKey.trim().length < 10}
                  className="bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:dark:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">{t('add') || 'যোগ করুন'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3">
            <div className="mt-0.5">
              <ExternalLink size={16} />
            </div>
            <div>
              <p className="mb-1 font-medium">একাধিক কী কেন প্রয়োজন?</p>
              <p className="opacity-90 leading-relaxed text-xs">
                মডেলের রেট লিমিট এড়াতে আপনি ৪টি পর্যন্ত API কী যোগ করতে পারেন। সিস্টেম স্বয়ংক্রিয়ভাবে একটি কী লিমিট শেষ হলে অন্যটিতে সুইচ করবে। <br/>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold underline hover:text-blue-600 dark:hover:text-blue-400 mt-1 inline-block"
                >
                  নতুন API কী পান
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
            <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={16} />
              Premium Cloud APIs (Ultra Quality)
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Replicate API Key (For Remini-level Face Restoration)</label>
                <input
                  type="password"
                  value={replicateApiKey || ''}
                  onChange={(e) => setReplicateApiKey(e.target.value || null)}
                  placeholder="r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">Photoroom API Key (For Remove.bg-level BG Removal)</label>
                <input
                  type="password"
                  value={photoroomApiKey || ''}
                  onChange={(e) => setPhotoroomApiKey(e.target.value || null)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] hover:from-[#6D28D9] hover:to-[#8B5CF6] text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg"
          >
            {t('saveSettings') || 'সেটিংস সেভ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
}
