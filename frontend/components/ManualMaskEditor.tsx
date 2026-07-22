'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Undo2, Redo2, MousePointer2, Plus, Minus, Eraser, Brush } from 'lucide-react';

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
  const [brushHardness, setBrushHardness] = useState(100);
  const [showOriginalBg, setShowOriginalBg] = useState(false);
  
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

      canvas.width = origImg.width;
      canvas.height = origImg.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(maskImg, 0, 0);

      const initialState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack([initialState]);
      setRedoStack([]);

      const pCanvas = document.createElement('canvas');
      pCanvas.width = origImg.width;
      pCanvas.height = origImg.height;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.drawImage(origImg, 0, 0);
        patternCanvasRef.current = pCanvas;
      }

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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const zoomSensitivity = 0.0015;
    const delta = -e.deltaY * zoomSensitivity;
    let newScale = scale * Math.exp(delta);
    newScale = Math.max(0.1, Math.min(newScale, 10));
    setScale(newScale);
  }, [scale]);

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

  const saveHistoryState = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => {
      const next = [...prev, currentState];
      if (next.length > 20) return next.slice(next.length - 20);
      return next;
    });
    setRedoStack([]);
  };

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === 'pan') {
      setIsDraggingPan(true);
      panStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      return;
    }
    if (e.button !== 0) return;

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
    if (isDraggingPan) setIsDraggingPan(false);
    if (isDrawing) {
      setIsDrawing(false);
      lastPosRef.current = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      saveHistoryState();
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
    
    if (brushHardness < 100) {
      ctx.shadowBlur = (100 - brushHardness) * (brushSize / 50);
      ctx.shadowColor = 'black'; 
    }

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
    <div className="fixed inset-0 z-50 flex bg-[#f8f9fa] dark:bg-gray-950 select-none font-sans">
      
      {/* Dynamic Circular Cursor Overlay */}
      {isHoveringWorkspace && cursorPos && (tool === 'erase' || tool === 'restore') && (
        <div
          className="fixed pointer-events-none rounded-full transform -translate-x-1/2 -translate-y-1/2 z-50 transition-[width,height] duration-75 ease-out"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            width: `${brushSize * scale}px`,
            height: `${brushSize * scale}px`,
            border: '2px solid rgba(0,0,0,0.5)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.5)',
            backgroundColor: 'transparent'
          }}
        />
      )}

      {/* Workspace Left Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden checkerboard flex flex-col items-center justify-center touch-none cursor-crosshair"
        onWheel={handleWheel}
        onMouseEnter={() => setIsHoveringWorkspace(true)}
        onMouseLeave={() => setIsHoveringWorkspace(false)}
      >
        {/* Top left cancel button */}
        <button 
          onClick={onCancel}
          className="absolute top-6 left-6 z-30 w-10 h-10 bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 backdrop-blur-md z-20">
            <div className="text-gray-500 font-bold animate-pulse">Loading editor...</div>
          </div>
        )}

        <div
          className="relative transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          {showOriginalBg && originalUrl && (
            <img 
              src={originalUrl} 
              alt="Original Reference" 
              className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none opacity-40 select-none"
            />
          )}

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className={`shadow-sm touch-none relative z-10 ${
              tool === 'pan' || isDraggingPan ? 'cursor-grab active:cursor-grabbing' : 'cursor-none'
            }`}
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Floating Bottom Toolbar (Undo/Redo/Zoom/Pan) */}
        <div className="absolute bottom-8 z-30 flex items-center gap-1 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-2xl">
          <button onClick={undo} disabled={undoStack.length <= 1} className="p-2 text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={redoStack.length === 0} className="p-2 text-gray-500 hover:text-black dark:hover:text-white disabled:opacity-30 transition-colors">
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-800 mx-2" />
          
          <button onClick={() => setScale(s => Math.max(0.1, s * 0.8))} className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-12 text-center select-none">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => setScale(s => Math.min(10, s * 1.2))} className="p-2 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          
          <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-800 mx-2" />
          
          <button onClick={() => setTool(tool === 'pan' ? 'erase' : 'pan')} className={`p-2 rounded-xl transition-all ${tool === 'pan' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}>
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Sidebar Area */}
      <div className="w-[320px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col z-40 border-l border-gray-200 dark:border-gray-800">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 mt-2">
          
          {/* Tool Selection */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mb-3">Select a brush type</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setTool('erase')} 
                className={`flex flex-col items-center justify-center py-4 rounded-[1.25rem] border-2 transition-all ${tool === 'erase' ? 'border-gray-900 bg-gray-50 dark:border-gray-300 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}
              >
                <div className="relative w-12 h-12 mb-2 bg-gray-100 dark:bg-gray-800 rounded-[0.8rem] flex items-center justify-center">
                  <Eraser className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-white dark:bg-gray-900 rounded-full p-[3px] border border-gray-300 dark:border-gray-600 shadow-sm">
                    <Minus className="w-3 h-3 text-gray-800 dark:text-gray-200" strokeWidth={3} />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Erase</span>
              </button>
              
              <button 
                onClick={() => setTool('restore')} 
                className={`flex flex-col items-center justify-center py-4 rounded-[1.25rem] border-2 transition-all ${tool === 'restore' ? 'border-gray-900 bg-gray-50 dark:border-gray-300 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'}`}
              >
                <div className="relative w-12 h-12 mb-2 bg-gray-100 dark:bg-gray-800 rounded-[0.8rem] flex items-center justify-center">
                  <Brush className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  <div className="absolute -bottom-1.5 -right-1.5 bg-[#4a85eb] rounded-full p-[3px] shadow-sm text-white border-2 border-white dark:border-gray-900">
                    <Plus className="w-3 h-3" strokeWidth={3} />
                  </div>
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400">Restore</span>
              </button>
            </div>
          </div>

          {/* Brush Size */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mb-3">Brush size</h3>
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 border-[2.5px] border-gray-700 dark:border-gray-300 rounded-full shrink-0" />
              <input 
                type="range" 
                min="1" 
                max="150" 
                value={brushSize} 
                onChange={(e)=>setBrushSize(Number(e.target.value))} 
                className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100" 
              />
            </div>
          </div>

          {/* Brush Hardness */}
          <div>
            <h3 className="text-[13px] font-bold text-gray-800 dark:text-gray-200 mb-3">Brush hardness</h3>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={brushHardness} 
                onChange={(e)=>setBrushHardness(Number(e.target.value))} 
                className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100" 
              />
              <div className="w-4 h-4 border-[3.5px] border-gray-700 dark:border-gray-300 rounded-full shrink-0" />
            </div>
          </div>

          {/* Show Original Background Toggle */}
          <div className="flex items-center gap-3 mt-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showOriginalBg} 
                onChange={(e) => setShowOriginalBg(e.target.checked)} 
              />
              <div className="w-9 h-[22px] bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#4a85eb]"></div>
            </label>
            <span className="text-[13px] font-semibold text-gray-600 dark:text-gray-400">Show original background</span>
          </div>

        </div>

        {/* Save Button */}
        <div className="p-6">
          <button 
            onClick={handleSave} 
            className="w-full bg-[#4a85eb] hover:bg-[#3d70cc] text-white font-bold py-3 rounded-full shadow-md transition-all active:scale-95"
          >
            Save
          </button>
        </div>
      </div>

    </div>
  );
}
