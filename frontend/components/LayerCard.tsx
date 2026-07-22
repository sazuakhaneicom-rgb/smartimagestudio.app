'use client';

import React from 'react';
import { useAppStore, type Layer } from '@/store/useAppStore';
import { Eye, EyeOff, Download } from 'lucide-react';

export default function LayerCard({ layer }: { layer: Layer }) {
  const toggleLayerVisibility = useAppStore((state) => state.toggleLayerVisibility);
  
  const isVisible = layer.visible !== false;

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'text': return 'bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20';
      case 'object': return 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20';
      case 'background': return 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20';
      case 'clean_bg': return 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/20';
      default: return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    }
  };

  const typeColorClass = getTypeColor(layer.type);

  const handleDownload = async () => {
    try {
      const response = await fetch(layer.imageData);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SmartImageStudio-Layer-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed', error);
    }
  };

  return (
    <div 
      className={`group flex items-center p-2.5 rounded-xl border transition-all duration-300 hover:shadow-md ${
        isVisible 
          ? 'bg-white border-[#7C3AED]/20 border-l-[3px] border-l-[#7C3AED] dark:bg-gray-800 dark:border-gray-700' 
          : 'bg-gray-50 border-transparent border-l-[3px] border-l-transparent dark:bg-gray-800/50'
      }`}
    >
      <div 
        className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden border border-gray-200 dark:border-gray-700 relative"
        style={{
          backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%)',
          backgroundSize: '8px 8px',
        }}
      >
        <img 
          src={layer.imageData} 
          alt={layer.label}
          className={`w-full h-full object-contain transition-opacity ${isVisible ? 'opacity-100' : 'opacity-40'}`}
        />
      </div>

      <div className="ml-3 flex-1 min-w-0">
        <h4 className={`text-sm font-semibold truncate ${isVisible ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {layer.label}
        </h4>
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border mt-1 ${typeColorClass} ${!isVisible && 'opacity-60'}`}>
          {layer.type}
        </div>
      </div>

      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <button
          onClick={() => toggleLayerVisibility && toggleLayerVisibility(layer.id)}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-[#7C3AED] transition-colors"
          title={isVisible ? 'Hide layer' : 'Show layer'}
        >
          {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-[#7C3AED] transition-colors"
          title="Download layer"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
