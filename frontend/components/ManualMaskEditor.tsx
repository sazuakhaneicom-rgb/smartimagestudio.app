'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Check, ZoomIn, ZoomOut, Eraser, Brush, Undo2, Redo2, RotateCcw, MousePointer2 } from 'lucide-react';

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

  // Undo / Redo Stacks
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);

  // Cursor overlay state
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isHoveringWorkspace, setIsHoveringWorkspace] = useState(false);

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

      // Save initial state to undo stack
      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack([initialState]);
      setRedoStack([]);

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
        const scaleX = (container.width * 0.85) / origImg.width;
        const scaleY = (container.height * 0.85) / origImg.height;
        const initialScale = Math.min(scaleX, scaleY, 1);
        setScale(initialScale);
      }

      setIsLoaded(true);
    };

    loadImages();
  }, [originalUrl, maskUrl]);

  // Handle Zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const zoomSensitivity = 0.0015;
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

  // Push history state after drawing stroke
  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => {
      const next = [...prev, currentState];
      if (next.length > 20) return next.slice(next.length - 20); // max 20 steps
      return next;
    });
    setRedoStack([]); // clear redo stack on new action
  };

  // Undo function
  const undo = useCallback(() => {
    if (undoStack.length <= 1) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const newUndoStack = [...undoStack];
    const currentState = newUndoStack.pop();
    if (!currentState) return;

    const previousState = newUndoStack[newUndoStack.length - 1];
    ctx.putImageData(previousState, 0, 0);

    setUndoStack(newUndoStack);
    setRedoStack(prev => [...prev, currentState]);
  }, [undoStack]);

  // Redo function
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const newRedoStack = [...redoStack];
    const stateToRestore = newRedoStack.pop();
    if (!stateToRestore) return;

    ctx.putImageData(stateToRestore, 0, 0);

    setUndoStack(prev => [...prev, stateToRestore]);
    setRedoStack(newRedoStack);
  }, [redoStack]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
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
    setCursorPos({ x: e.clientX, y: e.clientY });

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
      saveHistoryState(); // Save state after stroke completion
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

  const handleResetAll = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const initial = undoStack[0];
    ctx.putImageData(initial, 0, 0);
    setUndoStack([initial]);
    setRedoStack([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-xl select-none">
      
      {/* Dynamic Circular Cursor Overlay */}
      {isHoveringWorkspace && cursorPos && (tool === 'erase' || tool === 'restore') && (
        <div
          className="fixed pointer-events-none rounded-full transform -translate-x-1/2 -translate-y-1/2 z-50 border-2 transition-[width,height] duration-75 ease-out"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${brushSize * scale}px`,
            height: `${brushSize * scale}px`,
            borderColor: tool === 'erase' ? '#ec4899' : '#6366f1',
            backgroundColor: tool === 'erase' ? 'rgba(236,72,153,0.15)' : 'rgba(99,102,241,0.15)',
            boxShadow: tool === 'erase' 
              ? '0 0 15px rgba(236,72,153,0.6), inset 0 0 10px rgba(236,72,153,0.3)' 
              : '0 0 15px rgba(99,102,241,0.6), inset 0 0 10px rgba(99,102,241,0.3)'
          }}
        >
          <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex-none bg-[#12121A] border-b border-gray-800 p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl relative z-10">
        
        {/* Tool Selectors */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setTool('erase')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition-all duration-300 ${tool === 'erase' ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 scale-105' : 'bg-[#1D1D28] text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Eraser className="w-4 h-4" /> ইরেজার (Erase)
          </button>
          
          <button 
            onClick={() => setTool('restore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition-all duration-300 ${tool === 'restore' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105' : 'bg-[#1D1D28] text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <Brush className="w-4 h-4" /> রিস্টোর (Restore)
          </button>

          <button 
            onClick={() => setTool('pan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition-all duration-300 ${tool === 'pan' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-105' : 'bg-[#1D1D28] text-gray-400 hover:text-white hover:bg-gray-800'}`}
            title="Pan Image"
          >
            <MousePointer2 className="w-4 h-4" /> সরান (Pan)
          </button>

          <div className="w-[1px] h-8 bg-gray-800 mx-2" />

          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-1 bg-[#1A1A24] p-1 rounded-xl border border-gray-800">
            <button 
              onClick={undo}
              disabled={undoStack.length <= 1}
              className={`p-2 rounded-lg font-bold flex items-center gap-1 text-xs transition-all ${undoStack.length <= 1 ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-gray-200 hover:bg-gray-800 hover:text-white active:scale-95'}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4 text-emerald-400" />
              <span>আন্ডু</span>
            </button>

            <button 
              onClick={redo}
              disabled={redoStack.length === 0}
              className={`p-2 rounded-lg font-bold flex items-center gap-1 text-xs transition-all ${redoStack.length === 0 ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-gray-200 hover:bg-gray-800 hover:text-white active:scale-95'}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4 text-emerald-400" />
              <span>রিডু</span>
            </button>

            <button 
              onClick={handleResetAll}
              disabled={undoStack.length <= 1}
              className={`p-2 rounded-lg font-bold flex items-center gap-1 text-xs transition-all ${undoStack.length <= 1 ? 'text-gray-600 cursor-not-allowed opacity-50' : 'text-gray-400 hover:bg-gray-800 hover:text-red-400 active:scale-95'}`}
              title="Reset All Changes"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Brush Size Controller */}
        <div className="flex items-center gap-4 bg-[#1A1A24] px-5 py-2 rounded-2xl border border-gray-800 shadow-inner">
          <span className="text-gray-300 text-xs font-extrabold uppercase tracking-wider">ব্রাশ সাইজ:</span>
          <input 
            type="range" 
            min="5" 
            max="250" 
            value={brushSize} 
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-36 accent-pink-500 cursor-pointer"
          />
          <span className="text-pink-400 font-mono text-xs font-bold w-8">{brushSize}px</span>
        </div>

        {/* Zoom and Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#1A1A24] rounded-xl border border-gray-800 p-1">
            <button 
              onClick={() => setScale(s => Math.max(0.1, s * 0.8))}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-gray-300 font-mono text-xs px-2 font-bold">{Math.round(scale * 100)}%</span>
            <button 
              onClick={() => setScale(s => Math.min(10, s * 1.2))}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-[1px] h-8 bg-gray-800 mx-1" />

          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white font-bold text-sm transition-colors"
          >
            বাতিল
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> সেভ করুন
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas Workspace */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden checkerboard flex items-center justify-center touch-none cursor-none"
        onWheel={handleWheel}
        onMouseEnter={() => setIsHoveringWorkspace(true)}
        onMouseLeave={() => setIsHoveringWorkspace(false)}
      >
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 backdrop-blur-md z-20">
            <div className="text-emerald-400 font-extrabold animate-pulse text-lg">মাস্ক এডিটর লোডিং...</div>
          </div>
        )}

        <div
          className="relative transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          {/* Background original image for reference */}
          {originalUrl && (
            <img 
              src={originalUrl} 
              alt="Original Reference" 
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none opacity-40 select-none"
            />
          )}

          {/* Mask Editing Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`shadow-[0_0_80px_rgba(0,0,0,0.8)] touch-none rounded-lg relative z-10 ${
              tool === 'pan' || isDraggingPan ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'
            }`}
            style={{
              imageRendering: 'pixelated'
            }}
          />
        </div>

        {/* Floating Controls Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 text-gray-300 text-xs font-semibold flex items-center gap-5 shadow-2xl pointer-events-none z-20">
          <span className="flex items-center gap-1.5"><span className="text-pink-400 font-bold">🖱️ মাউস ড্র্যাগ:</span> ব্রাশ মুছুন/ফিরিয়ে আনুন</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">⌨️ Ctrl + Z:</span> আন্ডু</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold">⌨️ Ctrl + Y:</span> রিডু</span>
          <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          <span className="flex items-center gap-1.5"><span className="text-amber-400 font-bold">🖱️ হুইল:</span> জুম ইন/আউট</span>
        </div>
      </div>
    </div>
  );
}
