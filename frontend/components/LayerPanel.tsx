'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { Download, Layers, Loader2 } from 'lucide-react';
import LayerCard from './LayerCard';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function LayerPanel() {
  const { t } = useTranslation();
  const layers = useAppStore((state) => state.layers) || [];

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAll = async () => {
    if (layers.length === 0) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      
      const promises = layers.map(async (layer, index) => {
        const response = await fetch(layer.imageData);
        const blob = await response.blob();
        const safeName = layer.label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `${layer.type}_${safeName}_${index}.png`;
        zip.file(filename, blob);
      });
      
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'smart_image_layers.zip');
    } catch (error) {
      console.error('Error creating ZIP:', error);
      alert('Failed to download layers as ZIP.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <Layers size={18} className="text-[#7C3AED]" />
          {t('layers') || 'লেয়ার সমূহ'}
        </h2>
        <span className="bg-[#7C3AED]/10 text-[#7C3AED] px-2.5 py-0.5 rounded-full text-xs font-semibold">
          {layers.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
            <Layers size={40} className="text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-center">{t('noLayers') || 'কোন লেয়ার নেই'}</p>
          </div>
        ) : (
          layers.map((layer) => (
            <LayerCard key={layer.id} layer={layer} />
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
        <button
          onClick={handleDownloadAll}
          disabled={layers.length === 0 || isDownloading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA] hover:from-[#6D28D9] hover:to-[#8B5CF6] disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg disabled:shadow-none"
        >
          {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isDownloading ? 'ডাউনলোড হচ্ছে...' : (t('downloadAllZip') || 'সব ডাউনলোড করুন (ZIP)')}
        </button>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e5e7eb;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #374151;
        }
      `}</style>
    </div>
  );
}
