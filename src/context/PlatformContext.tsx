import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_SITE_SETTINGS, DEFAULT_TEMPLATES } from '../data/defaultTemplates';
import { DEFAULT_TEXT_ENTRIES, buildDefaultTextsMap } from '../data/defaultTexts';
import type {
  Promotion,
  ResumeTemplate,
  SiteSettings,
  SiteTextEntry,
  User,
} from '../types';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface PlatformContextValue {
  loading: boolean;
  hasAdmin: boolean;
  settings: SiteSettings;
  texts: Record<string, string>;
  textCatalog: SiteTextEntry[];
  templates: ResumeTemplate[];
  promotions: Promotion[];
  user: User | null;
  token: string | null;
  unlockedTemplateIds: string[];
  toasts: ToastMessage[];
  t: (key: string, fallback?: string) => string;
  notify: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  apiFetch: <T = any>(path: string, options?: RequestInit) => Promise<T>;
  refreshBootstrap: () => Promise<void>;
  setAuthSession: (token: string, user: User, unlockedIds?: string[]) => void;
  logout: () => void;
  isTemplateUnlocked: (template: ResumeTemplate) => boolean;
  updateLocalSettings: (next: SiteSettings) => void;
  updateLocalTexts: (next: Record<string, string>) => void;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

const TOKEN_STORAGE_KEY = 'aurumcv_session_token';

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [texts, setTexts] = useState<Record<string, string>>(() => buildDefaultTextsMap());
  const [textCatalog, setTextCatalog] = useState<SiteTextEntry[]>(DEFAULT_TEXT_ENTRIES);
  const [templates, setTemplates] = useState<ResumeTemplate[]>(DEFAULT_TEMPLATES);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<User | null>(null);
  const [unlockedTemplateIds, setUnlockedTemplateIds] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  const apiFetch = useCallback(
    async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json');
      }
      const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      const res = await fetch(path, { ...options, headers });
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : await res.text();
      if (!res.ok) {
        const errMsg =
          typeof payload === 'object' && payload && 'error' in payload
            ? String((payload as any).error)
            : 'Ocorreu um erro ao processar o pedido.';
        throw new Error(errMsg);
      }
      return payload as T;
    },
    []
  );

  const refreshBootstrap = useCallback(async () => {
    try {
      const res = await apiFetch<{
        hasAdmin: boolean;
        settings: SiteSettings;
        texts: Record<string, string>;
        textCatalog: SiteTextEntry[];
        templates: ResumeTemplate[];
        promotions: Promotion[];
        user: User | null;
        unlockedTemplateIds: string[];
      }>('/api/bootstrap');

      setHasAdmin(res.hasAdmin);
      setSettings(res.settings);
      setTexts(res.texts);
      if (Array.isArray(res.textCatalog)) setTextCatalog(res.textCatalog);
      setTemplates(res.templates);
      setPromotions(res.promotions);
      setUser(res.user);
      setUnlockedTemplateIds(res.unlockedTemplateIds || []);
      if (!res.user && localStorage.getItem(TOKEN_STORAGE_KEY)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  // Apply institutional colors and page title dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', settings.primaryColor || '#0B192C');
    root.style.setProperty('--brand-accent', settings.accentColor || '#C59B27');
    if (settings.platformName) {
      document.title = `${settings.platformName} — Plataforma Profissional de Currículos`;
    }
  }, [settings.primaryColor, settings.accentColor, settings.platformName]);

  const setAuthSession = useCallback(
    (newToken: string, nextUser: User, unlockedIds: string[] = []) => {
      localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
      setToken(newToken);
      setUser(nextUser);
      setUnlockedTemplateIds(unlockedIds);
      refreshBootstrap();
    },
    [refreshBootstrap]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setUnlockedTemplateIds([]);
    notify('Sessão terminada com segurança.', 'info');
  }, [notify]);

  const isTemplateUnlocked = useCallback(
    (template: ResumeTemplate): boolean => {
      if (template.tier === 'free') return true;
      return unlockedTemplateIds.includes(template.id);
    },
    [unlockedTemplateIds]
  );

  const t = useCallback(
    (key: string, fallback?: string): string => {
      if (texts[key] !== undefined && texts[key] !== '') return texts[key];
      return fallback ?? key;
    },
    [texts]
  );

  const value = useMemo<PlatformContextValue>(
    () => ({
      loading,
      hasAdmin,
      settings,
      texts,
      textCatalog,
      templates,
      promotions,
      user,
      token,
      unlockedTemplateIds,
      toasts,
      t,
      notify,
      dismissToast,
      apiFetch,
      refreshBootstrap,
      setAuthSession,
      logout,
      isTemplateUnlocked,
      updateLocalSettings: setSettings,
      updateLocalTexts: setTexts,
    }),
    [
      loading,
      hasAdmin,
      settings,
      texts,
      textCatalog,
      templates,
      promotions,
      user,
      token,
      unlockedTemplateIds,
      toasts,
      t,
      notify,
      dismissToast,
      apiFetch,
      refreshBootstrap,
      setAuthSession,
      logout,
      isTemplateUnlocked,
    ]
  );

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used inside PlatformProvider');
  return ctx;
}
