'use client';

// Real-time Analytics & Client Remote Force-Refresh Service
// Project: smart-image-73059

export type Category = 'bg_remover' | 'image_hd' | 'logo_bw' | 'photo_resizer' | 'layer_extractor' | 'text_extractor';

export interface AnalyticsSummary {
  activeUsers: number;
  totalGenerations: number;
  breakdown: {
    bg_remover: number;
    image_hd: number;
    logo_bw: number;
    photo_resizer: number;
    layer_extractor: number;
    text_extractor: number;
  };
  lastRemoteRefresh: number;
}

export interface UserSession {
  sessionId: string;
  lastSeen: number;
  userAgent: string;
  deviceType: string;
}

const FIREBASE_DB_URL = "https://smart-image-73059-default-rtdb.firebaseio.com";
const LOCAL_STORAGE_KEY = "smart_image_analytics_v1";
const LAST_REFRESH_KEY = "smart_image_last_refresh_timestamp";

// Removed global flag to decouple API endpoints

// Create client session ID
const CLIENT_SESSION_ID = typeof window !== 'undefined' 
  ? (sessionStorage.getItem('client_session_id') || (() => {
      const id = 'sess_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('client_session_id', id);
      return id;
    })())
  : 'server';

const defaultBreakdown = {
  bg_remover: 0,
  image_hd: 0,
  logo_bw: 0,
  photo_resizer: 0,
  layer_extractor: 0,
  text_extractor: 0
};

// Local storage fallback helper
const getLocalData = (): AnalyticsSummary => {
  if (typeof window === 'undefined') return { activeUsers: 1, totalGenerations: 0, breakdown: { ...defaultBreakdown }, lastRemoteRefresh: 0 };
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  return { activeUsers: 1, totalGenerations: 0, breakdown: { ...defaultBreakdown }, lastRemoteRefresh: 0 };
};

const saveLocalData = (data: AnalyticsSummary) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
};

// --- API Functions ---

// 1. Track image generation
export const trackGeneration = async (category: Category) => {
  // Update local storage
  const current = getLocalData();
  current.totalGenerations += 1;
  current.breakdown[category] = (current.breakdown[category] || 0) + 1;
  saveLocalData(current);

  // Broadcast to other local tabs
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('smart_studio_analytics');
      bc.postMessage({ type: 'GENERATION_ADDED', category });
      bc.close();
    } catch (e) {}
  }

  // Push to Firebase RTDB REST API
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/analytics/generations.json`);
    const data = (await res.json()) || {};
    const updatedCount = (data[category] || 0) + 1;
    const totalCount = (data.total || 0) + 1;

    await fetch(`${FIREBASE_DB_URL}/analytics/generations.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: totalCount,
        [category]: updatedCount,
        lastUpdated: Date.now()
      })
    });
  } catch (e) {
    // Silent fallback
  }
};

// 2. Send Heartbeat (Active User Tracking)
export const sendClientHeartbeat = async () => {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  let deviceType = 'Desktop';
  if (/Mobi|Android/i.test(navigator.userAgent)) deviceType = 'Mobile';
  else if (/Tablet|iPad/i.test(navigator.userAgent)) deviceType = 'Tablet';

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/sessions/${CLIENT_SESSION_ID}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: CLIENT_SESSION_ID,
        lastSeen: now,
        userAgent: navigator.userAgent,
        deviceType
      })
    });
  } catch (e) {}
};

// Listen to blocked status
export const checkIsSessionBlocked = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/blockedSessions/${CLIENT_SESSION_ID}.json`);
    if (res.ok) {
      const data = await res.json();
      return data?.blocked === true;
    }
  } catch (e) {}
  return false;
};

// 3. Listen to Remote Refresh Signal
export const listenToRemoteRefresh = (onRefreshSignal: () => void) => {
  if (typeof window === 'undefined') return () => {};

  let isMounted = true;
  const initialRefreshTime = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);

  const checkSignal = async () => {
    try {
      const res = await fetch(`${FIREBASE_DB_URL}/system/forceRefreshTimestamp.json?t=${Date.now()}`);
      if (res.ok) {
        const serverTimestamp = await res.json();
        
        if (typeof serverTimestamp === 'number' && serverTimestamp > 0) {
          const storedTimestamp = Number(localStorage.getItem(LAST_REFRESH_KEY) || 0);
          if (storedTimestamp > 0 && serverTimestamp > storedTimestamp) {
            localStorage.setItem(LAST_REFRESH_KEY, String(serverTimestamp));
            onRefreshSignal();
          } else if (storedTimestamp === 0) {
            localStorage.setItem(LAST_REFRESH_KEY, String(serverTimestamp));
          }
        }
      }
    } catch (e) {}
  };

  // Check immediately
  checkSignal();

  // Poll every 3 seconds for instant remote refresh detection
  const interval = setInterval(() => {
    if (isMounted) checkSignal();
  }, 3000);

  // BroadcastChannel for cross-tab instant reload
  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('smart_studio_refresh');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'FORCE_REFRESH') {
          onRefreshSignal();
        }
      };
    } catch (e) {}
  }

  return () => {
    isMounted = false;
    clearInterval(interval);
    if (bc) bc.close();
  };
};

// 4. Trigger Remote Refresh All Clients (Admin Action)
export const triggerRemoteRefreshAllClients = async (): Promise<boolean> => {
  const newTimestamp = Date.now();
  if (typeof window !== 'undefined') {
    localStorage.setItem(LAST_REFRESH_KEY, String(newTimestamp));
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('smart_studio_refresh');
        bc.postMessage({ type: 'FORCE_REFRESH', timestamp: newTimestamp });
        bc.close();
      } catch (e) {}
    }
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/system/forceRefreshTimestamp.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTimestamp)
    });
    return res.ok;
  } catch (e) {
    console.error('Failed to update remote refresh timestamp', e);
    return false;
  }
};

// 5. Fetch Summary Metrics for Admin Dashboard
export const getAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const local = getLocalData();
  const now = Date.now();

  try {
    const [genRes, sessRes, refreshRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/analytics/generations.json`),
      fetch(`${FIREBASE_DB_URL}/sessions.json`),
      fetch(`${FIREBASE_DB_URL}/system/forceRefreshTimestamp.json`)
    ]);

    const genData = await genRes.json() || {};
    const sessData = await sessRes.json() || {};
    const refreshData = await refreshRes.json() || 0;

    // Count active sessions in last 2 minutes
    let activeCount = 0;
    if (sessData && typeof sessData === 'object') {
      Object.values(sessData).forEach((sess: any) => {
        if (sess?.lastSeen && (now - sess.lastSeen) < 2 * 60 * 1000) {
          activeCount++;
        }
      });
    }

    const total = genData.total || 0;
    const breakdown = {
      bg_remover: genData.bg_remover || 0,
      image_hd: genData.image_hd || 0,
      logo_bw: genData.logo_bw || 0,
      photo_resizer: genData.photo_resizer || 0,
      layer_extractor: genData.layer_extractor || 0,
      text_extractor: genData.text_extractor || 0
    };

    return {
      activeUsers: Math.max(1, activeCount),
      totalGenerations: total,
      breakdown,
      lastRemoteRefresh: typeof refreshData === 'number' ? refreshData : 0
    };
  } catch (e) {
    // Fallback to local
    return {
      activeUsers: 1,
      totalGenerations: local.totalGenerations,
      breakdown: local.breakdown,
      lastRemoteRefresh: 0
    };
  }
};

export const getActiveSessions = async (): Promise<UserSession[]> => {
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/sessions.json`);
    if (!res.ok) return [];
    const sessData = await res.json();
    if (!sessData || typeof sessData !== 'object') return [];

    const now = Date.now();
    const active: UserSession[] = [];
    Object.values(sessData).forEach((sess: any) => {
      // 5 minutes window for active users display in admin panel
      if (sess?.lastSeen && (now - sess.lastSeen) < 5 * 60 * 1000) {
        active.push({
          sessionId: sess.sessionId || 'unknown',
          lastSeen: sess.lastSeen,
          userAgent: sess.userAgent || 'Unknown Browser',
          deviceType: sess.deviceType || 'Desktop'
        });
      }
    });
    return active.sort((a, b) => b.lastSeen - a.lastSeen);
  } catch (e) {
    return [];
  }
};

export const blockSession = async (sessionId: string, unblock = false) => {
  try {
    if (unblock) {
      await fetch(`${FIREBASE_DB_URL}/blockedSessions/${sessionId}.json`, { method: 'DELETE' });
    } else {
      await fetch(`${FIREBASE_DB_URL}/blockedSessions/${sessionId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: true, blockedAt: Date.now() })
      });
    }
  } catch (e) {}
};

// 6. Reset Analytics Data (Admin Action)
export const resetAnalyticsData = async () => {
  const emptyBreakdown = { ...defaultBreakdown };
  saveLocalData({ activeUsers: 1, totalGenerations: 0, breakdown: emptyBreakdown, lastRemoteRefresh: 0 });

  try {
    await fetch(`${FIREBASE_DB_URL}/analytics/generations.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: 0,
        ...emptyBreakdown,
        lastUpdated: Date.now()
      })
    });
  } catch (e) {}
};

// --- Feature Flags (Agent Activation Controls) ---

export interface FeatureFlags {
  bg_remover: boolean;
  image_hd: boolean;
  logo_bw: boolean;
  photo_resizer: boolean;
  layer_extractor: boolean;
  text_extractor: boolean;
  offline_scanner: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
  bg_remover: true,
  image_hd: true,
  logo_bw: true,
  photo_resizer: true,
  layer_extractor: true,
  text_extractor: true,
  offline_scanner: true
};

const FEATURE_FLAGS_KEY = "smart_image_feature_flags";

export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  if (typeof window === 'undefined') return defaultFeatureFlags;

  let localFlags: FeatureFlags | null = null;
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (raw) localFlags = JSON.parse(raw);
  } catch (e) {}

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/system/featureFlags.json?t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data !== null && typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length > 0) {
        const merged = { ...defaultFeatureFlags, ...data };
        localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {}

  return localFlags ? { ...defaultFeatureFlags, ...localFlags } : defaultFeatureFlags;
};

export const saveAllFeatureFlags = async (flags: FeatureFlags): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('smart_studio_flags');
        bc.postMessage({ type: 'FEATURE_FLAGS_UPDATED', flags });
        bc.close();
      } catch (e) {}
    }
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/system/featureFlags.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(flags)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
};

export const updateFeatureFlag = async (feature: keyof FeatureFlags, enabled: boolean): Promise<boolean> => {
  const current = await getFeatureFlags();
  const updated = { ...current, [feature]: enabled };
  return saveAllFeatureFlags(updated);
};

export const listenToFeatureFlags = (onChange: (flags: FeatureFlags) => void) => {
  if (typeof window === 'undefined') return () => {};

  let isMounted = true;

  const check = async () => {
    const flags = await getFeatureFlags();
    if (isMounted) onChange(flags);
  };

  check();
  // Poll every 3 seconds for instant flag updates across devices
  const interval = setInterval(check, 3000);

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('smart_studio_flags');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'FEATURE_FLAGS_UPDATED') {
          onChange(msg.data.flags);
        }
      };
    } catch (e) {}
  }

  return () => {
    isMounted = false;
    clearInterval(interval);
    if (bc) bc.close();
  };
};
