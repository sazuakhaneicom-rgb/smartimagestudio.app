'use client';

import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { processImage } from '@/lib/apiClient';
import { RateLimitError, AllKeysExhaustedError } from '@/lib/apiKeyManager';
import { trackGeneration } from '@/lib/adminAnalytics';

export default function UploadDropzone() {
  const { t } = useTranslation();
  const { setOriginalImage, setCurrentView, setProcessingStep, addNotification, setLayers } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      addNotification({ type: 'error', message: t('errors.invalidFormat'), autoDismiss: true });
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      addNotification({ type: 'error', message: t('errors.tooLarge'), autoDismiss: true });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        setOriginalImage(e.target.result as string, file.name);
        setCurrentView('processing');
        setProcessingStep('uploading');

        try {
          const response = await processImage(file);
          const mappedLayers = response.layers.map((layer, index) => ({
            id: `layer-${Date.now()}-${index}`,
            type: (layer as any).type || 'object',
            label: layer.label,
            imageData: layer.base64.startsWith('data:') ? layer.base64 : `data:image/png;base64,${layer.base64}`,
            visible: true
          }));
          setLayers(mappedLayers);
          setProcessingStep('done');
          trackGeneration('layer_extractor');
        } catch (error: any) {
          console.error(error);
          setProcessingStep('error');

          if (error instanceof RateLimitError) {
            addNotification({ type: 'warning', message: '⏱️ রেট লিমিট হয়েছে। ১ মিনিট পর আবার চেষ্টা করুন।', autoDismiss: false });
          } else if (error instanceof AllKeysExhaustedError) {
            addNotification({ type: 'error', message: '🔑 সব API Key অকার্যকর। Settings থেকে নতুন Key যোগ করুন।', autoDismiss: false });
          } else if (error?.message?.includes('No API keys')) {
            addNotification({ type: 'error', message: '🔑 প্রথমে Settings থেকে Gemini API Key যোগ করুন।', autoDismiss: false });
          } else {
            const msg = error?.message || 'Processing failed';
            addNotification({ type: 'error', message: msg, autoDismiss: true });
          }
        }
      }
    };
    reader.readAsDataURL(file);
  }, [addNotification, setCurrentView, setOriginalImage, setProcessingStep, setLayers, t]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div 
      className={`relative w-full aspect-square max-w-[min(28rem,60vh)] rounded-[2.5rem] border-4 border-dashed transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col items-center justify-center p-8 group cursor-pointer overflow-hidden shadow-2xl
        ${isDragging 
          ? 'border-[#7C3AED] bg-[#7C3AED]/10 scale-[1.02] shadow-[0_0_80px_rgba(124,58,237,0.3)]' 
          : 'border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-black/40 hover:border-[#7C3AED]/70 hover:bg-[#7C3AED]/5 hover:scale-[1.01] hover:shadow-[0_0_50px_rgba(124,58,237,0.15)]'
        }
      `}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) handleFile(e.target.files[0]);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />
      
      {/* Background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

      {/* Decorative Orbs */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-br from-[#7C3AED]/30 to-purple-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-gradient-to-tr from-pink-500/30 to-rose-500/30 rounded-full blur-[80px] group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />

      {/* Premium Icon Container */}
      <div className={`relative z-10 w-28 h-28 rounded-[2rem] mb-8 flex items-center justify-center transition-all duration-700 
        ${isDragging ? 'scale-110 -translate-y-2 bg-[#7C3AED]/20 shadow-[0_10px_40px_rgba(124,58,237,0.4)]' : 'group-hover:scale-110 group-hover:-translate-y-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl shadow-xl border border-white/50 dark:border-gray-700/50 group-hover:shadow-[0_10px_40px_rgba(124,58,237,0.2)]'}`}>
        
        {/* Pulsing rings inside icon container */}
        <div className="absolute inset-0 rounded-[2rem] border border-[#7C3AED]/40 animate-[ping_3s_ease-in-out_infinite]" />
        
        <UploadCloud className="w-12 h-12 text-[#7C3AED] dark:text-[#A78BFA] animate-[bounce_3s_ease-in-out_infinite]" />
      </div>

      <h3 className="relative z-10 text-3xl font-extrabold text-gray-900 dark:text-white mb-3 text-center transition-colors tracking-tight">
        {t('upload.dragDrop')}
      </h3>
      
      <p className="relative z-10 text-lg font-bold text-[#7C3AED] dark:text-[#A78BFA] group-hover:text-pink-500 mb-10 text-center cursor-pointer transition-colors duration-500">
        {t('upload.orClick')}
      </p>

      <div className="relative z-10 flex flex-col items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md px-6 py-4 rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 text-center w-full max-w-[240px] group-hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
          <ImageIcon className="w-5 h-5 text-[#7C3AED]" />
          <span>{t('upload.formats')}</span>
        </div>
        <span className="opacity-80 font-medium">{t('upload.maxSize')}</span>
        <span className="text-xs text-[#7C3AED] dark:text-[#A78BFA] font-bold mt-1">📋 অথবা Ctrl + V চেপে ছবি পেস্ট করুন</span>
      </div>
    </div>
  );
}
