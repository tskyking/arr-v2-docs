import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'arr-v2.settings';
const EVENT_NAME = 'arr-v2-settings-changed';

export interface ArrSettings {
  tenantId: string;
  userEmail: string;
  displayName: string;
  isLoggedIn: boolean;
}

const DEFAULT_SETTINGS: ArrSettings = {
  tenantId: 'default',
  userEmail: 'user@arr.local',
  displayName: 'Demo User',
  isLoggedIn: false,
};

export function isStaticDemoEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.search.includes('demo=1');
}

export function normalizeTenantId(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  const normalized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
  return normalized || DEFAULT_SETTINGS.tenantId;
}

function normalizeUserEmail(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? '';
  return trimmed || DEFAULT_SETTINGS.userEmail;
}

function normalizeDisplayName(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  return trimmed || DEFAULT_SETTINGS.displayName;
}

export function getArrSettings(): ArrSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  if (isStaticDemoEnvironment()) {
    return {
      tenantId: 'aurora-capital',
      userEmail: 'analyst@auroracap.com',
      displayName: 'Demo Analyst',
      isLoggedIn: true,
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ArrSettings>;
    return {
      tenantId: normalizeTenantId(parsed.tenantId),
      userEmail: normalizeUserEmail(parsed.userEmail),
      displayName: normalizeDisplayName(parsed.displayName),
      isLoggedIn: Boolean(parsed.isLoggedIn),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveArrSettings(next: Partial<ArrSettings>): ArrSettings {
  if (isStaticDemoEnvironment()) {
    return getArrSettings();
  }

  const merged = {
    ...getArrSettings(),
    ...next,
  };
  const normalized: ArrSettings = {
    tenantId: normalizeTenantId(merged.tenantId),
    userEmail: normalizeUserEmail(merged.userEmail),
    displayName: normalizeDisplayName(merged.displayName),
    isLoggedIn: Boolean(merged.isLoggedIn),
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }

  return normalized;
}

function normalizePrefix(prefix: string | undefined): string {
  const trimmed = prefix?.trim() ?? '';
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

export function buildApiPath(path: string, tenantId = getArrSettings().tenantId): string {
  const tenantPath = `/tenants/${encodeURIComponent(tenantId)}`;
  const resourcePath = path.startsWith('/') ? path : `/${path}`;
  return `${buildApiBase()}${tenantPath}${resourcePath}`;
}

export function buildAdminApiPath(path: string): string {
  const resourcePath = path.startsWith('/') ? path : `/${path}`;
  return `${buildApiBase()}/admin${resourcePath}`;
}

function buildApiBase(): string {
  const apiOrigin = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/g, '');
  const apiPrefix = normalizePrefix(import.meta.env.VITE_API_BASE_PATH as string | undefined) || '/api';
  return apiOrigin ?? apiPrefix;
}

export function useArrSettings() {
  const [settings, setSettings] = useState<ArrSettings>(() => getArrSettings());

  useEffect(() => {
    function handleChange() {
      setSettings(getArrSettings());
    }

    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  const updateSettings = useCallback((next: Partial<ArrSettings>) => {
    setSettings(saveArrSettings(next));
  }, []);

  const login = useCallback((next: Pick<ArrSettings, 'tenantId' | 'userEmail'> & Partial<Pick<ArrSettings, 'displayName'>>) => {
    setSettings(saveArrSettings({ ...next, isLoggedIn: true }));
  }, []);

  const logout = useCallback(() => {
    setSettings(saveArrSettings({ isLoggedIn: false }));
  }, []);

  return useMemo(() => ({ ...settings, updateSettings, login, logout }), [settings, updateSettings, login, logout]);
}
