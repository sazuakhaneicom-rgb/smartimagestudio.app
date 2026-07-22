'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { UploadCloud, Search, Layers, Paintbrush, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ProcessingStatus() {
  const { t } = useTranslation();
  const router = useRouter();
  const processingStep = useAppStore((state) => state.processingStep);
  // Assume processingStep can be: 'idle', 'uploading', 'analyzing', 'separating', 'inpainting', 'done', 'error'
  
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (processingStep !== 'idle') {
      setShow(true);
    }
    
    if (processingStep === 'done') {
      const timer = setTimeout(() => {
        router.push('/workspace');
        useAppStore.setState({ processingStep: 'idle' });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [processingStep, router]);

  if (!show || processingStep === 'idle') return null;

  const steps = [
    { id: 'uploading', icon: UploadCloud, label: t('stepUploading') || 'আপলোড হচ্ছে' },
    { id: 'analyzing', icon: Search, label: t('stepAnalyzing') || 'বিশ্লেষণ করা হচ্ছে' },
    { id: 'separating', icon: Layers, label: t('stepSeparating') || 'আলাদা করা হচ্ছে' },
    { id: 'inpainting', icon: Paintbrush, label: t('stepInpainting') || 'ইনপেইন্টিং' },
    { id: 'done', icon: CheckCircle2, label: t('stepDone') || 'সম্পন্ন' },
  ];

  const currentIndex = steps.findIndex(s => s.id === processingStep) === -1 
    ? (processingStep === 'error' ? -1 : 0) 
    : steps.findIndex(s => s.id === processingStep);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_0_50px_rgba(124,58,237,0.15)] max-w-sm w-full mx-4 border border-white/50 dark:border-gray-700/50 animate-in zoom-in-95 duration-500">
        
        {processingStep === 'error' ? (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('errorOccurred') || 'একটি সমস্যা হয়েছে'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('processErrorDesc') || 'প্রসেসিং করার সময় একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'}
            </p>
            <button 
              onClick={() => useAppStore.setState({ processingStep: 'idle' })}
              className="mt-4 px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
            >
              {t('close') || 'বন্ধ করুন'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {/* Premium Loading Header */}
            <div className="relative w-28 h-28 mx-auto mb-2 mt-2">
              <div className="absolute inset-0 rounded-full border border-indigo-500/30 animate-[ping_2.5s_ease-in-out_infinite]" />
              <div className="absolute inset-2 rounded-full border border-[#7C3AED]/40 animate-[ping_1.5s_ease-in-out_infinite_0.5s]" />
              <div className="absolute inset-4 rounded-full border-2 border-dashed border-indigo-500/50 animate-[spin_3s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full border-2 border-transparent border-t-[#7C3AED] border-r-pink-500 animate-[spin_1.5s_ease-in-out_infinite]" />
              <div className="absolute inset-6 rounded-full bg-gradient-to-tr from-[#7C3AED] to-pink-500 shadow-[0_0_30px_rgba(124,58,237,0.5)] flex items-center justify-center animate-pulse">
                <Layers className="w-8 h-8 text-white animate-bounce" />
              </div>
            </div>

            <h3 className="text-2xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-pink-500 mb-6 drop-shadow-sm">
              {t('processingImage') || 'AI ম্যাজিক চলছে...'}
            </h3>
            
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-[1.15rem] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-700 z-0"></div>
              
              <div className="space-y-6 relative z-10">
                {steps.map((step, index) => {
                  const isActive = index === currentIndex;
                  const isPast = index < currentIndex || processingStep === 'done';
                  const Icon = step.icon;
                  
                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-500 bg-white dark:bg-gray-900 ${
                        isActive 
                          ? 'border-[#7C3AED] text-[#7C3AED] shadow-[0_0_15px_rgba(124,58,237,0.3)]' 
                          : isPast 
                            ? 'border-green-500 text-green-500' 
                            : 'border-gray-200 dark:border-gray-700 text-gray-400'
                      }`}>
                        <Icon size={18} />
                        {isActive && (
                          <span className="absolute inset-0 rounded-full border-2 border-[#7C3AED] animate-ping opacity-25"></span>
                        )}
                      </div>
                      <span className={`font-medium transition-colors duration-300 ${
                        isActive 
                          ? 'text-[#7C3AED] dark:text-[#A78BFA]' 
                          : isPast 
                            ? 'text-gray-800 dark:text-gray-200' 
                            : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
