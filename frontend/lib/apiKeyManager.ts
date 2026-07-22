import { useAppStore, ApiKeyEntry } from '@/store/useAppStore';
import { encryptApiKey, decryptApiKey } from './crypto';

export class AllKeysExhaustedError extends Error {
  constructor() {
    super('All API keys have been exhausted.');
    this.name = 'AllKeysExhaustedError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function addKeyToStore(rawKey: string): Promise<void> {
  const encryptedData = await encryptApiKey(rawKey);
  const maskedValue = rawKey.substring(0, 6) + '...' + rawKey.substring(rawKey.length - 4);
  
  const newKey: ApiKeyEntry = {
    id: crypto.randomUUID(),
    maskedValue,
    encryptedData: JSON.stringify(encryptedData),
    status: 'active',
    addedAt: Date.now(),
    exhaustedAt: null,
    lastUsedAt: null,
  };
  
  useAppStore.getState().addApiKey(newKey);
}

export function rotateToNextKey(): boolean {
  const store = useAppStore.getState();
  const keys = store.apiKeys;
  const currentIdx = store.activeKeyIndex;
  
  for (let i = 1; i <= keys.length; i++) {
    const nextIdx = (currentIdx + i) % keys.length;
    if (keys[nextIdx].status !== 'exhausted') {
      store.setActiveKeyIndex(nextIdx);
      return true;
    }
  }
  return false;
}

export async function getActiveRawKey(): Promise<string> {
  const store = useAppStore.getState();
  const keys = store.apiKeys;
  const currentIdx = store.activeKeyIndex;
  
  if (keys.length === 0) throw new Error('No API keys configured. Please add a Gemini API key in settings.');
  
  const activeKey = keys[currentIdx];
  if (activeKey.status === 'exhausted') {
    if (!rotateToNextKey()) {
      throw new AllKeysExhaustedError();
    }
  }
  
  const newActiveKey = keys[useAppStore.getState().activeKeyIndex];
  try {
    const encryptedPayload = JSON.parse(newActiveKey.encryptedData);
    return await decryptApiKey(encryptedPayload);
  } catch {
    // Corrupted key format — remove it and try next
    useAppStore.getState().removeApiKey(newActiveKey.id);
    const remaining = useAppStore.getState().apiKeys;
    if (remaining.length === 0) throw new AllKeysExhaustedError();
    return getActiveRawKey();
  }
}

export async function callWithRotation(
  apiCall: (key: string) => Promise<Response>
): Promise<Response> {
  const store = useAppStore.getState();
  const totalKeys = store.apiKeys.length;
  let attempts = 0;

  while (attempts < Math.max(totalKeys, 1)) {
    const rawKey = await getActiveRawKey();
    const currentStore = useAppStore.getState();
    const activeKeyEntry = currentStore.apiKeys[currentStore.activeKeyIndex];

    try {
      const response = await apiCall(rawKey);

      if (response.status === 401 || response.status === 402) {
        // 401 = invalid key, 402 = daily quota exhausted
        // Both mean this key is done for now — exhaust it and try next
        const reason = response.status === 402
          ? `키 ${activeKeyEntry.maskedValue} 의 일일 한도 소진됨`
          : `키 ${activeKeyEntry.maskedValue} 가 유효하지 않음`;
        currentStore.markKeyExhausted(activeKeyEntry.id);

        const bodyText = await response.text().catch(() => '');
        const isDailyQuota = bodyText.includes('DAILY_QUOTA_EXHAUSTED');

        const notifMsg = isDailyQuota
          ? `🔑 API Key ${activeKeyEntry.maskedValue} এর দৈনিক সীমা শেষ। পরের Key-তে যাচ্ছে...`
          : `🔑 API Key ${activeKeyEntry.maskedValue} অকার্যকর। পরের Key-তে যাচ্ছে...`;

        currentStore.addNotification({ type: 'warning', message: notifMsg, autoDismiss: true });

        const hasNext = rotateToNextKey();
        if (!hasNext) {
          currentStore.addNotification({
            type: 'error',
            message: '🔑 সব API Key শেষ বা অকার্যকর। Settings থেকে নতুন Key যোগ করুন।',
            autoDismiss: false
          });
          throw new AllKeysExhaustedError();
        }
        attempts++;
        continue;
      }

      if (response.status === 429) {
        const bodyText = await response.text().catch(() => '');
        console.error('🚨 Gemini 429 Rate Limit Error:', bodyText); // Debugging info
        const isDaily = bodyText.toLowerCase().includes('per day') || bodyText.toLowerCase().includes('exhausted') || bodyText.toLowerCase().includes('quota');
        
        if (isDaily) {
          currentStore.markKeyExhausted(activeKeyEntry.id);
          currentStore.addNotification({ type: 'warning', message: `🔑 API Key ${activeKeyEntry.maskedValue} এর লিমিট শেষ। পরের Key-তে যাচ্ছে...`, autoDismiss: true });
        } else {
          currentStore.addNotification({ type: 'info', message: `🔑 API Key ${activeKeyEntry.maskedValue} রেট লিমিটে পৌঁছেছে। পরের Key-তে যাচ্ছে...`, autoDismiss: true });
        }

        const hasNext = rotateToNextKey();
        if (!hasNext) {
          throw new RateLimitError(
            'আপনার API Key-এর ব্যবহারের সীমা (Quota) শেষ হয়ে গেছে। দয়া করে Settings থেকে নতুন একটি Gemini API Key যুক্ত করুন।'
          );
        }
        attempts++;
        continue;
      }

      return response;

    } catch (error) {
      if (error instanceof AllKeysExhaustedError) throw error;
      if (error instanceof RateLimitError) throw error;
      throw error;
    }
  }

  throw new AllKeysExhaustedError();
}
