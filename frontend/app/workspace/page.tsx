'use client';

import React, { useEffect } from 'react';
import Header from '@/components/Header';
import CanvasPreview from '@/components/CanvasPreview';
import LayerPanel from '@/components/LayerPanel';
import SettingsModal from '@/components/SettingsModal';
import NotificationToast from '@/components/NotificationToast';
import AllKeysExhaustedModal from '@/components/AllKeysExhaustedModal';
import ProcessingStatus from '@/components/ProcessingStatus';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { ArrowLeft, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function WorkspacePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    layers,
    processingStep,
    isSettingsOpen,
    apiKeys,
  } = useAppStore();

  const isAllKeysExhausted = apiKeys.length > 0 && apiKeys.every(k => k.status === 'exhausted');

  const handleDownloadAll = async () => {
    // Assuming simple download action for now
    if (layers.length === 0) return;
    // Download logic here using JSZip or similar
    alert(t('downloadingAll'));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row p-4 pt-24 lg:pt-4 gap-4 max-h-none lg:max-h-[calc(100vh-72px)] overflow-y-auto lg:overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[50vh] lg:min-h-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-[#7C3AED] transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="font-medium">{t('newImage')}</span>
            </button>
            <div className="lg:hidden">
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Download size={16} />
                {t('downloadAll')}
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 bg-gray-50/50 flex items-center justify-center overflow-hidden">
            <CanvasPreview />
          </div>
        </div>

        <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 min-h-[50vh] lg:min-h-0">
          <LayerPanel />
        </div>
      </main>

      {isSettingsOpen && <SettingsModal />}
      {processingStep !== 'idle' && <ProcessingStatus />}
      {isAllKeysExhausted && <AllKeysExhaustedModal />}
      <NotificationToast />
    </div>
  );
}
