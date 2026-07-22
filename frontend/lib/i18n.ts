import { useAppStore } from '@/store/useAppStore';
import { bn, TranslationKeys } from '../locales/bn';
import { en } from '../locales/en';

type Translations = {
  bn: TranslationKeys;
  en: TranslationKeys;
};

const translations: Translations = { bn, en };

export function getTranslation(locale: 'bn' | 'en', key: string, params?: Record<string, string>): string {
  const keys = key.split('.');
  let current: any = translations[locale];
  
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return key; // Fallback to key if not found
    }
  }
  
  let result = typeof current === 'string' ? current : key;
  
  if (params && typeof result === 'string') {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{${k}}`, 'g'), v);
    });
  }
  
  return result;
}

export function useTranslation() {
  const { locale, setLocale } = useAppStore();
  
  const t = (key: string, params?: Record<string, string>) => {
    return getTranslation(locale, key, params);
  };
  
  return { t, locale, setLocale };
}
