import { useState, useCallback } from 'react';

export interface EditorSnapshot {
  brightness: number;
  contrast: number;
  exposure: number;
  highlights: number;
  shadows: number;
  whites: number;
  blacks: number;
  gamma: number;
  temperature: number;
  tint: number;
  saturation: number;
  vibrance: number;
  hue: number;
  sharpness: number;
  structure: number;
  texture: number;
  clarity: number;
  opacity: number;
  redBalance: number;
  greenBalance: number;
  blueBalance: number;
  faceProtection: boolean;
  textProtection: boolean;
  bgColor: string | null;
  isBlurBg: boolean;
  photoSize: string;
  zoomLevel: number;
  exportFormat: string;
  transform: {
    rotation: number;
    flipH: boolean;
    flipV: boolean;
    skewX: number;
    skewY: number;
  };
  activeTab: string;
}

const MAX_HISTORY = 50;

export function useUndoRedo(initialState: EditorSnapshot) {
  const [history, setHistory] = useState<EditorSnapshot[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const pushState = useCallback((snapshot: EditorSnapshot) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [currentIndex]);

  const undo = useCallback((): EditorSnapshot | null => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback((): EditorSnapshot | null => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      return history[newIndex];
    }
    return null;
  }, [currentIndex, history]);

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    pushState,
    undo,
    redo,
    historyLength: history.length,
    currentIndex,
  };
}
