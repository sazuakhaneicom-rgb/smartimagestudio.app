import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProcessingStep = 'idle' | 'uploading' | 'analyzing' | 'separating' | 'inpainting' | 'done' | 'error';
export type LayerType = 'background' | 'object' | 'text' | 'clean_bg';

export interface Layer {
  id: string;
  type: LayerType;
  label: string;
  imageData: string; // base64
  visible: boolean;
}

export interface ApiKeyEntry {
  id: string;
  maskedValue: string; // e.g. 'AIza...xxxx'
  encryptedData: string; // JSON string of encrypted payload
  status: 'active' | 'standby' | 'exhausted';
  addedAt: number;
  exhaustedAt: number | null;
  lastUsedAt: number | null;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  autoDismiss?: boolean;
}

interface AppState {
  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Language
  locale: 'bn' | 'en';
  setLocale: (locale: 'bn' | 'en') => void;
  
  // Image
  originalImage: string | null;
  originalFileName: string | null;
  setOriginalImage: (data: string | null, name?: string) => void;
  
  // Image to Upscale (sent from BG Remover)
  imageToUpscale: string | null;
  setImageToUpscale: (data: string | null) => void;
  
  // Image to BG Remove (sent from HD Upscaler)
  imageToBgRemove: string | null;
  setImageToBgRemove: (data: string | null) => void;
  
  // Layers
  layers: Layer[];
  setLayers: (layers: Layer[]) => void;
  toggleLayerVisibility: (layerId: string) => void;
  
  // Processing
  isProcessing: boolean;
  processingStep: ProcessingStep;
  setProcessingStep: (step: ProcessingStep) => void;
  
  // API Keys
  apiKeys: ApiKeyEntry[];
  activeKeyIndex: number;
  addApiKey: (key: ApiKeyEntry) => void;
  removeApiKey: (id: string) => void;
  setActiveKeyIndex: (index: number) => void;
  markKeyExhausted: (id: string) => void;
  markKeyRecovered: (id: string) => void;
  
  // Third Party APIs
  deepAiApiKey: string | null;
  setDeepAiApiKey: (key: string | null) => void;
  
  // Settings Modal
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  isAllKeysExhausted: boolean;
  setAllKeysExhausted: (exhausted: boolean) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  
  // View
  currentView: 'upload' | 'processing' | 'workspace';
  setCurrentView: (view: 'upload' | 'processing' | 'workspace') => void;
  
  // App Mode
  appMode: 'layer-extractor' | 'bg-remover' | 'image-upscaler' | 'logo-bw' | 'photo-resizer';
  setAppMode: (mode: 'layer-extractor' | 'bg-remover' | 'image-upscaler' | 'logo-bw' | 'photo-resizer') => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Theme
  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  // Language
  locale: 'bn',
  setLocale: (locale) => set({ locale }),
  
  // Image
  originalImage: null,
  originalFileName: null,
  setOriginalImage: (data, name) => set({ 
    originalImage: data, 
    originalFileName: name || null,
    currentView: data ? 'workspace' : 'upload'
  }),
  
  imageToUpscale: null,
  setImageToUpscale: (data) => set({ imageToUpscale: data }),
  
  imageToBgRemove: null,
  setImageToBgRemove: (data) => set({ imageToBgRemove: data }),
  
  // Layers
  layers: [],
  setLayers: (layers) => set({ layers }),
  toggleLayerVisibility: (layerId) => set((state) => ({
    layers: state.layers.map((layer) => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    )
  })),
  
  // Processing
  isProcessing: false,
  processingStep: 'idle',
  setProcessingStep: (step) => set({ 
    processingStep: step,
    isProcessing: step !== 'idle' && step !== 'done' && step !== 'error',
    ...(step === 'uploading' || step === 'analyzing' || step === 'separating' || step === 'inpainting' ? { currentView: 'processing' } : {})
  }),
  
  // API Keys
  apiKeys: [],
  activeKeyIndex: 0,
  addApiKey: (key) => set((state) => ({ 
    apiKeys: [...state.apiKeys, key] 
  })),
  removeApiKey: (id) => set((state) => ({ 
    apiKeys: state.apiKeys.filter((key) => key.id !== id),
    activeKeyIndex: 0
  })),
  setActiveKeyIndex: (index) => set({ activeKeyIndex: index }),
  markKeyExhausted: (id) => set((state) => ({
    apiKeys: state.apiKeys.map((key) => 
      key.id === id ? { ...key, status: 'exhausted', exhaustedAt: Date.now() } : key
    )
  })),
  markKeyRecovered: (id) => set((state) => ({
    apiKeys: state.apiKeys.map((key) => 
      key.id === id ? { ...key, status: 'standby', exhaustedAt: null } : key
    )
  })),
  
  // Third Party APIs
  deepAiApiKey: null,
  setDeepAiApiKey: (key) => set({ deepAiApiKey: key }),
  
  // Settings Modal
  isSettingsOpen: false,
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  isAllKeysExhausted: false,
  setAllKeysExhausted: (exhausted) => set({ isAllKeysExhausted: exhausted }),
  
  // Notifications
  notifications: [],
  addNotification: (notif) => set((state) => {
    const id = crypto.randomUUID();
    return {
      notifications: [...state.notifications, { ...notif, id }]
    };
  }),
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),
  
  // View
  currentView: 'upload',
  setCurrentView: (view) => set({ currentView: view }),
  
  // App Mode
  appMode: 'bg-remover',
  setAppMode: (mode) => set({ appMode: mode })
    }),
    {
      name: 'smart-image-api-keys',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        activeKeyIndex: state.activeKeyIndex,
        deepAiApiKey: state.deepAiApiKey
      }),
    }
  )
);
