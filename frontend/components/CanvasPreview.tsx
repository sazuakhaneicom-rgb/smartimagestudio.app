'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useTranslation } from '@/lib/i18n';
import { Layers } from 'lucide-react';

export default function CanvasPreview() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layers = useAppStore((state) => state.layers) || [];
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const visibleLayers = layers.filter((layer) => layer.visible !== false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || visibleLayers.length === 0 || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We assume the first visible layer determines the aspect ratio for now
    // In a real app, this might come from the original image dimensions
    const loadImages = visibleLayers.map((layer) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.src = layer.imageData;
      });
    });

    Promise.all(loadImages).then((images) => {
      if (images.length === 0) return;

      const maxWidth = dimensions.width;
      const maxHeight = dimensions.height;
      const imgWidth = images[0].width;
      const imgHeight = images[0].height;

      const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
      const canvasWidth = imgWidth * scale;
      const canvasHeight = imgHeight * scale;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw checkerboard
      const size = 10;
      for (let i = 0; i < canvasWidth; i += size) {
        for (let j = 0; j < canvasHeight; j += size) {
          ctx.fillStyle = (i / size) % 2 === (j / size) % 2 ? '#e5e7eb' : '#f3f4f6';
          ctx.fillRect(i, j, size, size);
        }
      }

      images.forEach((img) => {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      });
    });
  }, [visibleLayers, dimensions]);

  if (layers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 gap-4 h-full">
        <Layers size={48} className="text-gray-300" />
        <p className="text-sm">{t('noLayersGenerated') || 'No layers generated yet.'}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative"
    >
      <div
        className="relative rounded-xl shadow-lg border border-purple-200/50 dark:border-purple-900/30 overflow-hidden transition-all duration-300"
        style={{
          boxShadow: '0 10px 40px -10px rgba(124, 58, 237, 0.15)',
        }}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain"
          style={{
            backgroundImage: 'repeating-conic-gradient(#e5e7eb 0% 25%, #f3f4f6 0% 50%)',
            backgroundSize: '20px 20px',
          }}
        />
      </div>
    </div>
  );
}
