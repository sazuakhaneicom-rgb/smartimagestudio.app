import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, Eraser, Brush, Undo2, RotateCcw, MousePointer2 } from 'lucide-react';

interface ManualMaskEditorProps {
  originalUrl: string;
  maskUrl: string;
  onSave: (newUrl: string) => void;
  onCancel: () => void;
}

type Tool = 'erase' | 'restore' | 'pan';

export default function ManualMaskEditor({ originalUrl, maskUrl, onSave, onCancel }: ManualMaskEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [tool, setTool] = useState<Tool>('erase');
  const [brushSize, setBrushSize] = useState(40);
  
  // Pan and Zoom states
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Load images and initialize canvas
  useEffect(() => {
    const loadImages = async () => {
      const origImg = new Image();
      const maskImg = new Image();
      
      await Promise.all([
        new Promise((resolve) => { origImg.onload = resolve; origImg.src = originalUrl; }),
        new Promise((resolve) => { maskImg.onload = resolve; maskImg.src = maskUrl; })
      ]);

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Set canvas to actual image resolution
      canvas.width = origImg.width;
      canvas.height = origImg.height;

      // Draw initial mask
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(maskImg, 0, 0);

      // Save initial state to history
      setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);

      // Create offscreen canvas for restore pattern
      const pCanvas = document.createElement('canvas');
      pCanvas.width = origImg.width;
      pCanvas.height = origImg.height;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.drawImage(origImg, 0, 0);
        patternCanvasRef.current = pCanvas;
      }

      // Initial fit to screen
      if (containerRef.current) {
        const container = containerRef.current.getBoundingClientRect();
        const scaleX = (container.width * 0.9) / origImg.width;
        const scaleY = (container.height * 0.9) / origImg.height;
        const initialScale = Math.min(scaleX, scaleY, 1);
        setScale(initialScale);
      }

      setIsLoaded(true);
    };

    loadImages();
  }, [originalUrl, maskUrl]);

  // Handle Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * Math.exp(delta);
    
    // Limits
    newScale = Math.max(0.1, Math.min(newScale, 10));
    setScale(newScale);
  }, [scale]);

  // Coordinate conversion
  const getCanvasPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Save history state (called on pointer up after drawing)
  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => {
      const newHistory = [...prev, currentState];
      // Keep last 10 states to save memory
      if (newHistory.length > 10) return newHistory.slice(newHistory.length - 10);
      return newHistory;
    });
  };

  const undo = () => {
    if (history.length <= 1) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    // Remove current state
    const newHistory = [...history];
    newHistory.pop();
    
    // Restore previous state
    const prevState = newHistory[newHistory.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setHistory(newHistory);
  };

  // Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    // If middle mouse button, or space pressed (handled later if needed), force pan
    if (e.button === 1 || tool === 'pan') {
      setIsDraggingPan(true);
      panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      return;
    }

    if (e.button !== 0) return; // Only left click for drawing

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const pos = getCanvasPos(e);
    lastPosRef.current = pos;
    draw(pos, pos);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingPan) {
      setPosition({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (!isDrawing) return;
    const currentPos = getCanvasPos(e);
    if (lastPosRef.current) {
      draw(lastPosRef.current, currentPos);
    }
    lastPosRef.current = currentPos;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingPan) {
      setIsDraggingPan(false);
    }
    
    if (isDrawing) {
      setIsDrawing(false);
      lastPosRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      saveHistoryState(); // Save after stroke is complete
    }
  };

  const draw = (start: { x: number, y: number }, end: { x: number, y: number }) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);

    if (tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.stroke();
    } else if (tool === 'restore' && patternCanvasRef.current) {
      ctx.globalCompositeOperation = 'source-over';
      const pattern = ctx.createPattern(patternCanvasRef.current, 'no-repeat');
      if (pattern) {
        ctx.strokeStyle = pattern;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const newUrl = canvas.toDataURL('image/png');
    onSave(newUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95 backdrop-blur-md">
      {/* Toolbar */}
      <div className="flex-none bg-gray-900 border-b border-gray-700 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl relative z-10">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTool('erase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${tool === 'erase' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
          >
            <Eraser className="w-5 h-5" /> মুছুন (Erase)
          </button>
          <button 
            onClick={() => setTool('restore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${tool === 'restore' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
          >
            <Brush className="w-5 h-5" /> ফিরিয়ে আনুন (Restore)
          </button>
          <button 
            onClick={() => setTool('pan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${tool === 'pan' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'}`}
            title="Pan Image (or middle click/drag)"
          >
            <MousePointer2 className="w-5 h-5" /> সরান (Pan)
          </button>
          <div className="w-[1px] h-8 bg-gray-700 mx-2" />
          <button 
            onClick={undo}
            disabled={history.length <= 1}
            className={`p-2 rounded-lg transition-all ${history.length <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            title="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              if (history.length > 0) {
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx) {
                  ctx.putImageData(history[0], 0, 0);
                  setHistory([history[0]]);
                }
              }
            }}
            disabled={history.length <= 1}
            className={`p-2 rounded-lg transition-all ${history.length <= 1 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
            title="Reset All"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 bg-gray-800 px-4 py-2 rounded-xl border border-gray-700">
          <span className="text-gray-400 text-sm font-bold">ব্রাশ সাইজ:</span>
          <input 
            type="range" 
            min="5" 
            max="200" 
            value={brushSize} 
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-32 accent-pink-500"
          />
          <div 
            className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center border border-white/40"
          >
            <div className="bg-white rounded-full" style={{ width: Math.min(24, Math.max(4, brushSize / 5)), height: Math.min(24, Math.max(4, brushSize / 5)) }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setScale(s => Math.max(0.1, s * 0.8))}
            className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-gray-300 font-mono text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
          <button 
            onClick={() => setScale(s => Math.min(10, s * 1.2))}
            className="p-2 bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="w-[1px] h-8 bg-gray-700 mx-2" />
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white font-bold"
          >
            বাতিল
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/25 transition-all"
          >
            ✅ সেইভ করুন
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden checkerboard flex items-center justify-center cursor-crosshair touch-none"
        onWheel={handleWheel}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
            <div className="text-white font-bold animate-pulse">লোডিং...</div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`shadow-[0_0_50px_rgba(0,0,0,0.5)] touch-none ${tool === 'pan' || isDraggingPan ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center',
            imageRendering: 'pixelated'
          }}
        />

        {/* Floating help text */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-gray-300 text-sm font-medium flex items-center gap-4 pointer-events-none">
          <span>🖱️ স্ক্রল: জুম ইন/আউট</span>
          <span className="w-1 h-1 rounded-full bg-gray-500" />
          <span>🖱️ মিডল ক্লিক: প্যান (সরানো)</span>
          <span className="w-1 h-1 rounded-full bg-gray-500" />
          <span>👆 ড্র্যাগ: ব্রাশ</span>
        </div>
      </div>
    </div>
  );
}
