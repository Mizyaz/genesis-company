import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import turkish from '../content/tr.json';

export type Language = 'en' | 'tr';
type Translate = (text: string, values?: Record<string, string | number>) => string;
const translations: Record<string, string> = turkish;
const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: Translate } | null>(null);
const storageKey = 'genesis.company.language';

export function translate(text: string, language: Language, values: Record<string, string | number> = {}) {
  const message = language === 'tr' && Object.prototype.hasOwnProperty.call(translations, text) ? translations[text] : text;
  return message.replace(/\{(\w+)\}/g, (token, key) => Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : token);
}

/** Site-only preference. No services, DOM text replacement or product state. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem(storageKey) === 'tr' ? 'tr' : 'en'; } catch { return 'en'; }
  });
  const t = useCallback<Translate>((text, values) => translate(text, language, values), [language]);
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem(storageKey, language); } catch { /* Optional device-local preference. */ }
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const language = useContext(LanguageContext);
  if (!language) throw new Error('LanguageProvider is required.');
  return language;
}

const identityKeys = new Set(['id', 'name', 'icon', 'src', 'href', 'url', 'image', 'scholar', 'email', 'band', 'number', 'fit']);
/** Localize presentation content only. IDs, URLs and technical values are unchanged. */
export function translateContent<T>(content: T, t: Translate): T {
  const visit = (value: unknown): unknown => typeof value === 'string' ? t(value)
    : Array.isArray(value) ? value.map(visit)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, identityKeys.has(key) ? item : visit(item)])) : value;
  return visit(content) as T;
}

export function useTranslatedContent<T>(content: T): T {
  const { t } = useLanguage();
  return useMemo(() => translateContent(content, t), [content, t]);
}
