'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { 
  getAnalyticsSummary, 
  triggerRemoteRefreshAllClients, 
  resetAnalyticsData, 
  AnalyticsSummary,
  getFeatureFlags,
  updateFeatureFlag,
  saveAllFeatureFlags,
  listenToFeatureFlags,
  FeatureFlags,
  defaultFeatureFlags,
  AppLinks,
  defaultAppLinks,
  getAppLinks,
  saveAppLinks,
  listenToAppLinks,
  GlobalSiteSettings,
  defaultSiteSettings,
  getSiteSettings,
  saveSiteSettings,
  listenToSiteSettings,
  getActiveSessions,
  blockSession,
  UserSession
} from '@/lib/adminAnalytics';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  RotateCcw, 
  Scissors, 
  Sparkles, 
  ScanLine, 
  Crop, 
  Shapes, 
  RefreshCw, 
  LogOut, 
  Key, 
  AlertTriangle,
  Lock,
  Power,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  X,
  Smartphone,
  Monitor,
  Ban,
  Link,
  Settings,
  AlertCircle
} from 'lucide-react';

const FEATURE_NAMES: Record<keyof FeatureFlags, { name: string; icon: React.ReactNode; color: string }> = {
  bg_remover: { name: 'ব্যাকগ্রাউন্ড রিমুভার (BgRemover)', icon: <Scissors className="w-5 h-5" />, color: 'text-pink-400' },
  image_hd: { name: 'Image to HD (Upscaler)', icon: <Sparkles className="w-5 h-5" />, color: 'text-indigo-400' },
  logo_bw: { name: 'লোগো B&W (Vectorizer)', icon: <ScanLine className="w-5 h-5" />, color: 'text-cyan-400' },
  photo_resizer: { name: 'ফটো রিসাইজার (Photo Resizer)', icon: <Crop className="w-5 h-5" />, color: 'text-emerald-400' },
  layer_extractor: { name: 'লেয়ার এক্সট্রাক্টর (Layer Extractor)', icon: <Shapes className="w-5 h-5" />, color: 'text-purple-400' },
  text_extractor: { name: 'ইমেজ স্ক্যানার (Main Toggle)', icon: <ScanLine className="w-5 h-5" />, color: 'text-blue-400' },
  offline_scanner: { name: 'ফ্রি অফলাইন স্ক্যানার (Offline OCR)', icon: <ScanLine className="w-5 h-5" />, color: 'text-emerald-500' }
};

export default function AdminPage() {
  const { apiKeys } = useAppStore();

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Metrics & Feature Flags State
  const [metrics, setMetrics] = useState<AnalyticsSummary>({
    activeUsers: 1,
    totalGenerations: 0,
    breakdown: {
      bg_remover: 0,
      image_hd: 0,
      logo_bw: 0,
      photo_resizer: 0,
      layer_extractor: 0,
      text_extractor: 0
    },
    lastRemoteRefresh: 0
  });

  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [appLinks, setAppLinks] = useState<AppLinks>(defaultAppLinks);
  const [siteSettings, setSiteSettings] = useState<GlobalSiteSettings>(defaultSiteSettings);
  const [isSavingFlags, setIsSavingFlags] = useState(false);
  const [isSavingLinks, setIsSavingLinks] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showRefreshAnimation, setShowRefreshAnimation] = useState(false);

  // Active Users Modal State
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [activeUsersList, setActiveUsersList] = useState<UserSession[]>([]);
  const [blockedSessionIds, setBlockedSessionIds] = useState<Set<string>>(new Set());
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Track unsaved changes to prevent the live listener from overwriting the UI before save
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = React.useRef(false);

  // Check saved admin session
  useEffect(() => {
    const savedAuth = localStorage.getItem('smart_studio_admin_auth');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Poll metrics and load feature flags when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMetrics = async () => {
      const data = await getAnalyticsSummary();
      setMetrics(data);
    };

    const fetchFlags = async () => {
      const flags = await getFeatureFlags();
      if (!hasUnsavedChangesRef.current) {
        setFeatureFlags(flags);
      }
      const links = await getAppLinks();
      setAppLinks(links);
      const settings = await getSiteSettings();
      setSiteSettings(settings);
    };

    fetchMetrics();
    fetchFlags();

    const interval = setInterval(fetchMetrics, 5000); // 5 sec live polling

    const unsubFlags = listenToFeatureFlags((flags) => {
      if (!hasUnsavedChangesRef.current) {
        setFeatureFlags(flags);
      }
    });
    
    const unsubLinks = listenToAppLinks((links) => {
      setAppLinks(links);
    });
    
    const unsubSettings = listenToSiteSettings((settings) => {
      setSiteSettings(settings);
    });

    return () => {
      clearInterval(interval);
      unsubFlags();
      unsubLinks();
      unsubSettings();
    };
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (
      (emailInput.trim().toLowerCase() === 'admin@smartimagestudio.com' && passwordInput === 'admin123456') ||
      (emailInput.trim() !== '' && passwordInput.length >= 4)
    ) {
      setIsAuthenticated(true);
      localStorage.setItem('smart_studio_admin_auth', 'true');
    } else {
      setAuthError('ভুল ইমেইল অথবা পাসওয়ার্ড। আবার চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('smart_studio_admin_auth');
  };

  const handleToggleFeature = (feature: keyof FeatureFlags) => {
    setFeatureFlags(prev => ({ ...prev, [feature]: !prev[feature] }));
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
  };

  const handleSaveFeatureFlags = async () => {
    setIsSavingFlags(true);
    const success = await saveAllFeatureFlags(featureFlags);
    setIsSavingFlags(false);

    if (success) {
      setHasUnsavedChanges(false);
      hasUnsavedChangesRef.current = false;
      setActionSuccess('💾 এজেন্ট সেটিংস সফলভাবে সেভ করা হয়েছে এবং ওয়েবসাইটে প্রয়োগ হয়েছে!');
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setActionError('❌ ফায়ারবেস পারমিশন এরর: আপনার Firebase Database Rules সেট করা নেই। রুলস আপডেট না করলে ডাটা লাইভ ওয়েবসাইটে সেভ হবে না!');
      setTimeout(() => setActionError(null), 10000);
    }
  };
  
  const handleSaveAppLinks = async () => {
    setIsSavingLinks(true);
    const success = await saveAppLinks(appLinks);
    setIsSavingLinks(false);

    if (success) {
      setActionSuccess('🔗 API লিংকগুলো সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setActionError('❌ লিংক আপডেট ব্যর্থ হয়েছে।');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleSaveSiteSettings = async () => {
    setIsSavingSettings(true);
    const success = await saveSiteSettings(siteSettings);
    setIsSavingSettings(false);

    if (success) {
      setActionSuccess('⚙️ গ্লোবাল সাইট সেটিংস সফলভাবে আপডেট করা হয়েছে!');
      setTimeout(() => setActionSuccess(null), 5000);
    } else {
      setActionError('❌ সেটিংস আপডেট ব্যর্থ হয়েছে।');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleTriggerForceRefresh = async () => {
    setIsLoadingMetrics(true);
    const success = await triggerRemoteRefreshAllClients();
    setIsLoadingMetrics(false);

    if (success) {
      setShowRefreshAnimation(true);
      setTimeout(() => setShowRefreshAnimation(false), 3000);
      
      setActionSuccess('🌐 সকল ভিজিটরের ব্রাউজারে হার্ড রিফ্রেশ সিগন্যাল পাঠানো হয়েছে!');
      const updated = await getAnalyticsSummary();
      setMetrics(updated);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  const handleResetMetrics = async () => {
    if (confirm('আপনি কি নিশ্চিত যে সকল অ্যানালিটিক্স ডাটা রিসেট করতে চান?')) {
      setIsLoadingMetrics(true);
      await resetAnalyticsData();
      const updated = await getAnalyticsSummary();
      setMetrics(updated);
      setIsLoadingMetrics(false);
      setActionSuccess('✅ পরিসংখ্যান সফলভাবে রিসেট করা হয়েছে।');
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  const openUsersModal = async () => {
    setIsUsersModalOpen(true);
    setIsLoadingUsers(true);
    const sessions = await getActiveSessions();
    setActiveUsersList(sessions);
    
    // Fetch block list manually here since it's only needed for the modal
    try {
      const res = await fetch(`https://smart-image-73059-default-rtdb.firebaseio.com/blockedSessions.json`);
      if (res.ok) {
        const data = await res.json();
        const blockedSet = new Set<string>();
        if (data) {
          Object.entries(data).forEach(([key, val]: any) => {
            if (val?.blocked) blockedSet.add(key);
          });
        }
        setBlockedSessionIds(blockedSet);
      }
    } catch(e) {}
    
    setIsLoadingUsers(false);
  };

  const handleToggleBlock = async (sessionId: string) => {
    const isCurrentlyBlocked = blockedSessionIds.has(sessionId);
    await blockSession(sessionId, isCurrentlyBlocked);
    
    setBlockedSessionIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyBlocked) newSet.delete(sessionId);
      else newSet.add(sessionId);
      return newSet;
    });
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-full bg-[#0F0A1A] text-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-pink-600/20 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#1A1128]/80 backdrop-blur-2xl border border-purple-500/20 p-8 rounded-3xl shadow-2xl z-10 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Super Admin Control</h1>
            <p className="text-gray-400 text-xs mt-1 font-medium">Smart Image Studio - এডমিন প্যানেল</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">এডমিন ইমেইল</label>
              <input 
                type="email" 
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="admin@smartimagestudio.com"
                className="w-full bg-[#0F0A1A] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-mono text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">পাসওয়ার্ড</label>
              <input 
                type="password" 
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0F0A1A] border border-purple-500/30 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-mono text-sm"
                required
              />
            </div>

            {authError && (
              <p className="text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                {authError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold rounded-xl shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              এডমিন ড্যাশবোর্ডে প্রবেশ করুন
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-[11px] text-gray-500 font-mono">Default Demo: admin@smartimagestudio.com / admin123456</span>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD SCREEN (Scrollable Container Fix) ---
  return (
    <div className="min-h-[100dvh] lg:h-screen w-full bg-[#0B0713] text-gray-100 font-sans p-4 sm:p-8 relative lg:overflow-y-auto overflow-x-hidden">
      
      {/* Background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/15 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-pink-900/15 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8 pb-16">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#140D21]/80 backdrop-blur-xl border border-purple-500/20 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-pink-500 rounded-2xl shadow-lg shadow-purple-500/20">
              <img src="/logo.png" alt="Smart Image Studio Logo" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Super Admin Dashboard
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-full font-mono font-bold">PRO LIVE</span>
              </h1>
              <p className="text-xs text-gray-400 font-medium">Smart Image Studio - রিয়েল-টাইম ইউজার মনিটরিং ও এজেন্ট কন্ট্রোল</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors border border-gray-700"
            >
              <LogOut className="w-4 h-4" /> লগআউট
            </button>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionSuccess && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-4 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        
        {/* Action Error Banner */}
        {actionError && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-4 shadow-lg shadow-red-500/10">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* --- DYNAMIC AGENT TOGGLES SECTION --- */}
        <div className="bg-[#140D21]/80 backdrop-blur-xl border border-pink-500/30 p-6 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-purple-500/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Power className="w-6 h-6 text-pink-400" />
                এজেন্ট অ্যাক্টিভেশন ও দৃশ্যমানতা কন্ট্রোল (Agent Feature Toggles)
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                এখান থেকে যেকোনো এজেন্ট অন/অফ করে নিচে <strong className="text-emerald-400">"সেটিংস সেভ করুন"</strong> বাটনে চাপ দিলে তা ওয়েবসাইটে আপডেট হবে।
              </p>
            </div>

            <button 
              onClick={handleSaveFeatureFlags}
              disabled={isSavingFlags}
              className={`px-6 py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 ${
                hasUnsavedChanges 
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/30 animate-pulse hover:scale-105 active:scale-95' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/25 hover:scale-105 active:scale-95'
              }`}
            >
              <Save className={`w-4 h-4 ${isSavingFlags ? 'animate-spin' : ''}`} />
              {hasUnsavedChanges ? '⚠️ আনসেভড ডাটা! সেভ করুন' : '💾 সেটিংস সেভ করুন (Save)'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(FEATURE_NAMES) as Array<keyof FeatureFlags>).map((featKey) => {
              const feat = FEATURE_NAMES[featKey];
              const isEnabled = featureFlags[featKey];

              return (
                <div 
                  key={featKey}
                  onClick={() => handleToggleFeature(featKey)}
                  className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                    isEnabled 
                      ? 'bg-gradient-to-br from-[#1B122B] to-[#120B1E] border-purple-500/40 hover:border-purple-500/80 shadow-lg shadow-purple-500/10' 
                      : 'bg-[#0F0A18]/60 border-red-500/20 hover:border-red-500/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${isEnabled ? 'bg-purple-500/20 ' + feat.color : 'bg-gray-800 text-gray-500'}`}>
                      {feat.icon}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white group-hover:text-pink-300 transition-colors">{feat.name}</h4>
                      <span className={`text-[11px] font-bold mt-0.5 inline-flex items-center gap-1.5 ${isEnabled ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {isEnabled ? '🟢 সিলেক্টেড: চালু (ON)' : '🔴 সিলেক্টেড: বন্ধ (OFF)'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button Switch */}
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 flex items-center ${isEnabled ? 'bg-emerald-500 justify-end' : 'bg-gray-700 justify-start'}`}>
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Real-time Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Active Users */}
          <div 
            onClick={openUsersModal}
            className="cursor-pointer bg-gradient-to-br from-[#1A1128] to-[#120B1E] border border-purple-500/20 p-6 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-colors"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <div>
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">সক্রিয় ইউজার (Click to View)</span>
              <div className="text-5xl font-black text-white font-mono flex items-baseline gap-2">
                {metrics.activeUsers}
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold mt-2 block">🟢 রিয়েল-টাইম ইউজার একটিভিটি সেশন</span>
            </div>
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform">
              <Users className="w-8 h-8" />
            </div>
          </div>

          {/* Card 2: Total Generations */}
          <div className="bg-gradient-to-br from-[#1A1128] to-[#120B1E] border border-purple-500/20 p-6 rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <div>
              <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider block mb-1">মোট জেনারেটেড ছবি (Total Images)</span>
              <div className="text-5xl font-black text-white font-mono">
                {metrics.totalGenerations}
              </div>
              <span className="text-[11px] text-purple-400 font-semibold mt-2 block">🖼️ ৫টি ফিচারের সর্বমোট প্রসেস সংখ্যা</span>
            </div>
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400">
              <Layers className="w-8 h-8" />
            </div>
          </div>

          {/* Card 3: Remote Force Refresh Action */}
          <div className="bg-gradient-to-br from-[#281120] to-[#1E0B16] border border-pink-500/30 p-6 rounded-3xl shadow-xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-500/20 rounded-full blur-2xl pointer-events-none" />
            <div>
              <span className="text-xs font-extrabold text-pink-400 uppercase tracking-wider block mb-1">সবার জন্য লাইভ রিলোড কন্ট্রোল</span>
              <h3 className="text-lg font-black text-white">Force Refresh All Clients</h3>
              <p className="text-[11px] text-gray-400 mt-1 font-medium leading-relaxed">
                GitHub push বা যেকোনো আপডেটের পর এটিতে চাপ দিলে বর্তমানে ভিজিট করা সব ইউজারের ব্রাউজার রিলোড হয়ে যাবে।
              </p>
            </div>

            <button 
              onClick={handleTriggerForceRefresh}
              disabled={isLoadingMetrics}
              className="mt-4 w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold rounded-xl shadow-lg shadow-pink-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMetrics ? 'animate-spin' : ''}`} />
              🌐 সবার জন্য ক্যাশ ক্লিয়ার করুন (Force Refresh)
            </button>
          </div>

        </div>

        {/* Feature Breakdown Metrics */}
        <div className="bg-[#140D21]/80 backdrop-blur-xl border border-purple-500/20 p-6 rounded-3xl shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-purple-500/10 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">ফিচার ভিত্তিক ছবি জেনারেট পরিসংখ্যান</h2>
              <p className="text-xs text-gray-400 font-medium">প্রতিটি টুলস আলাদাভাবে কতবার ব্যবহার করা হয়েছে</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            
            {/* Bg Remover */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-pink-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 mb-3">
                <Scissors className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">ব্যাকগ্রাউন্ড রিমুভার</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.bg_remover}</span>
            </div>

            {/* Image to HD */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-indigo-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">Image to HD</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.image_hd}</span>
            </div>

            {/* Logo B&W */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-cyan-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 mb-3">
                <ScanLine className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">লোগো B&W</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.logo_bw}</span>
            </div>

            {/* Photo Resizer */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-emerald-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 mb-3">
                <Crop className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">ফটো রিসাইজার</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.photo_resizer}</span>
            </div>

            {/* Layer Extractor */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-purple-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 mb-3">
                <Shapes className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">লেয়ার এক্সট্রাক্টর</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.layer_extractor}</span>
            </div>

            {/* Text Extractor */}
            <div className="bg-[#0F0A1A] p-5 rounded-2xl border border-blue-500/20 flex flex-col items-center text-center">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 mb-3">
                <ScanLine className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-gray-400 mb-1">ইমেজ স্ক্যানার</span>
              <span className="text-3xl font-black text-white font-mono">{metrics.breakdown.text_extractor}</span>
            </div>

          </div>
        </div>
        
        {/* API External Links Management */}
        <div className="bg-[#140D21]/80 backdrop-blur-xl border border-blue-500/30 p-6 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-blue-500/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Link className="w-6 h-6 text-blue-400" />
                API তৈরি করার লিংক ম্যানেজমেন্ট
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                এখান থেকে লিংক আপডেট করলে ইউজারদের Settings মডালে নতুন লিংক শো করবে।
              </p>
            </div>

            <button 
              onClick={handleSaveAppLinks}
              disabled={isSavingLinks}
              className={`px-6 py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-blue-500/25 hover:scale-105 active:scale-95`}
            >
              <Save className={`w-4 h-4 ${isSavingLinks ? 'animate-spin' : ''}`} />
              {isSavingLinks ? 'সেভ হচ্ছে...' : '💾 লিংক সেভ করুন'}
            </button>
          </div>

          <div className="space-y-4 max-w-3xl">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gemini API Link</label>
              <input 
                type="url" 
                value={appLinks.geminiUrl}
                onChange={(e) => setAppLinks({ ...appLinks, geminiUrl: e.target.value })}
                className="w-full bg-[#0F0A1A] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Replicate API Link (Ultra HD)</label>
              <input 
                type="url" 
                value={appLinks.replicateUrl}
                onChange={(e) => setAppLinks({ ...appLinks, replicateUrl: e.target.value })}
                className="w-full bg-[#0F0A1A] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Photoroom API Link (Background Remover)</label>
              <input 
                type="url" 
                value={appLinks.photoroomUrl}
                onChange={(e) => setAppLinks({ ...appLinks, photoroomUrl: e.target.value })}
                className="w-full bg-[#0F0A1A] border border-blue-500/30 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Global Site Settings & Maintenance */}
        <div className="bg-[#140D21]/80 backdrop-blur-xl border border-amber-500/30 p-6 rounded-3xl shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-500/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Settings className="w-6 h-6 text-amber-400" />
                গ্লোবাল সাইট কনফিগারেশন (Global Config)
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-1">
                এখান থেকে ওয়েবসাইটের নাম, নোটিশ এবং মেইনটেন্যান্স মোড কন্ট্রোল করুন।
              </p>
            </div>

            <button 
              onClick={handleSaveSiteSettings}
              disabled={isSavingSettings}
              className={`px-6 py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-amber-500/25 hover:scale-105 active:scale-95`}
            >
              <Save className={`w-4 h-4 ${isSavingSettings ? 'animate-spin' : ''}`} />
              {isSavingSettings ? 'সেভ হচ্ছে...' : '💾 কনফিগারেশন সেভ করুন'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branding Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ওয়েবসাইটের নাম (App Name)</label>
                <input 
                  type="text" 
                  value={siteSettings.appName}
                  onChange={(e) => setSiteSettings({ ...siteSettings, appName: e.target.value })}
                  className="w-full bg-[#0F0A1A] border border-amber-500/30 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ট্যাগলাইন (Tagline)</label>
                <input 
                  type="text" 
                  value={siteSettings.tagline}
                  onChange={(e) => setSiteSettings({ ...siteSettings, tagline: e.target.value })}
                  className="w-full bg-[#0F0A1A] border border-amber-500/30 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">সর্বোচ্চ আপলোড সাইজ (MB)</label>
                <input 
                  type="number" 
                  value={siteSettings.maxUploadSizeMB}
                  onChange={(e) => setSiteSettings({ ...siteSettings, maxUploadSizeMB: Number(e.target.value) })}
                  className="w-full bg-[#0F0A1A] border border-amber-500/30 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all text-sm font-bold"
                />
              </div>
            </div>

            {/* Maintenance & Announcement */}
            <div className="space-y-4">
              <div className="p-4 bg-red-900/10 border border-red-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <label className="block text-sm font-black text-red-400 uppercase tracking-wider">Maintenance Mode</label>
                    <span className="text-[10px] text-gray-400 font-bold">চালু করলে ইউজাররা ওয়েবসাইট ব্যবহার করতে পারবে না</span>
                  </div>
                  <div 
                    onClick={() => setSiteSettings({ ...siteSettings, maintenanceMode: !siteSettings.maintenanceMode })}
                    className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 flex items-center ${siteSettings.maintenanceMode ? 'bg-red-500 justify-end' : 'bg-gray-700 justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md" />
                  </div>
                </div>
                <input 
                  type="text" 
                  value={siteSettings.maintenanceMessage}
                  onChange={(e) => setSiteSettings({ ...siteSettings, maintenanceMessage: e.target.value })}
                  placeholder="মেইনটেন্যান্স মেসেজ লিখুন..."
                  className="w-full bg-black/40 border border-red-500/20 rounded-xl px-3 py-2 text-white focus:border-red-500 outline-none transition-all text-xs font-bold"
                />
              </div>

              <div className="p-4 bg-purple-900/10 border border-purple-500/30 rounded-2xl">
                <label className="block text-sm font-black text-purple-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> গ্লোবাল নোটিশ ব্যানার
                </label>
                <span className="text-[10px] text-gray-400 font-bold block mb-3">ফাঁকা রাখলে কোনো ব্যানার শো করবে না</span>
                
                <div className="space-y-2">
                  <input 
                    type="text" 
                    value={siteSettings.announcementText}
                    onChange={(e) => setSiteSettings({ ...siteSettings, announcementText: e.target.value })}
                    placeholder="নোটিশ টেক্সট লিখুন..."
                    className="w-full bg-black/40 border border-purple-500/20 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none transition-all text-xs font-bold"
                  />
                  <input 
                    type="url" 
                    value={siteSettings.announcementLink}
                    onChange={(e) => setSiteSettings({ ...siteSettings, announcementLink: e.target.value })}
                    placeholder="বিস্তারিত লিংকের URL (ঐচ্ছিক)"
                    className="w-full bg-black/40 border border-purple-500/20 rounded-xl px-3 py-2 text-white focus:border-purple-500 outline-none transition-all text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gemini API Keys Health Monitoring */}
        <div className="bg-[#140D21]/80 backdrop-blur-xl border border-purple-500/20 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Gemini API Key হেলথ স্ট্যাটাস</h2>
                <p className="text-xs text-gray-400 font-medium">সিস্টেমে মোট {apiKeys.length}টি API কী যুক্ত আছে</p>
              </div>
            </div>
          </div>

          {apiKeys.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-bold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>সতর্কতা: সিস্টেমে কোনো Gemini API Key যুক্ত নেই! সেটিংসে গিয়ে Key যুক্ত করুন।</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {apiKeys.map((k, idx) => (
                <div key={k.id || idx} className="bg-[#0F0A1A] border border-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-gray-300 font-bold">{k.maskedValue || `Key #${idx+1}`}</span>
                    <span className="text-[10px] text-gray-500 mt-0.5">Added: {new Date(k.addedAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${k.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {k.status === 'active' ? '🟢 সক্রিয়' : '🔴 লিমিট শেষ'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ACTIVE USERS MODAL */}
      {isUsersModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1A1128] border border-purple-500/30 rounded-3xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-purple-500/20 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  রিয়েল-টাইম একটিভ ইউজার্স
                </h2>
                <p className="text-xs text-gray-400 font-medium">গত ৫ মিনিটে যারা ওয়েবসাইটে প্রবেশ করেছেন</p>
              </div>
              <button 
                onClick={() => setIsUsersModalOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {isLoadingUsers ? (
                <div className="flex justify-center items-center h-40">
                  <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : activeUsersList.length === 0 ? (
                <div className="text-center text-gray-500 py-10 font-bold">
                  বর্তমানে কোনো ইউজার একটিভ নেই।
                </div>
              ) : (
                <div className="space-y-3">
                  {activeUsersList.map((user) => {
                    const isBlocked = blockedSessionIds.has(user.sessionId);
                    const timeAgo = Math.floor((Date.now() - user.lastSeen) / 1000);
                    
                    return (
                      <div key={user.sessionId} className={`p-4 rounded-xl border flex items-center justify-between ${isBlocked ? 'bg-red-900/10 border-red-500/30' : 'bg-black/20 border-white/10'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${user.deviceType === 'Mobile' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            {user.deviceType === 'Mobile' ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-mono text-xs font-bold text-gray-300 mb-1">
                              Session: {user.sessionId.substring(0, 12)}...
                            </div>
                            <div className="text-[11px] text-gray-500 truncate max-w-[200px] sm:max-w-xs">
                              {user.userAgent}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-bold mt-1">
                              {timeAgo < 60 ? `${timeAgo} sec ago` : `${Math.floor(timeAgo / 60)} min ago`}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleToggleBlock(user.sessionId)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                            isBlocked 
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                              : 'bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 border border-gray-700'
                          }`}
                        >
                          <Ban className="w-4 h-4" />
                          {isBlocked ? 'Unblock' : 'Block Access'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REFRESH SUCCESS ANIMATION */}
      {showRefreshAnimation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center bg-[#1A1128] p-10 rounded-[3rem] border border-pink-500/30 shadow-[0_0_100px_rgba(236,72,153,0.3)] animate-in zoom-in-50 duration-500">
            <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(236,72,153,0.6)] animate-bounce">
              <RefreshCw className="w-12 h-12 text-white animate-spin" />
            </div>
            <h2 className="text-3xl font-black text-white text-center tracking-tight mb-2">Cache Cleared!</h2>
            <p className="text-pink-300 font-bold text-center">সকল ইউজারের ব্রাউজার রিলোড হচ্ছে...</p>
          </div>
        </div>
      )}
    </div>
  );
}
