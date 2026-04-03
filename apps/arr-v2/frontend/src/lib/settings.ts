import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'arr-v2.settings';
const EVENT_NAME = 'arr-v2-settings-changed';

export interface ArrSettings {
  tenantId: string;
  userEmail: string;
}

const DEFAULT_SETTINGS: ArrSettings = {
  tenantId: 'default',
  userEmail: 'user@arr.local',
};

export function isStaticDemoEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.search.includes('demo=1');
}

function normalizeTenantId(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  const normalized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-');
  return normalized || DEFAULT_SETTINGS.tenantId;
}

function normalizeUserEmail(value: string | undefined): string {
  const trimmed = value?.trim().toLowerCase() ?? '';
  return trimmed || DEFAULT_SETTINGS.userEmail;
}

export function getArrSettings(): ArrSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;

  if (isStaticDemoEnvironment()) {
    return {
      tenantId: 'aurora-capital',
      userEmail: 'analyst@auroracap.com',
    };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ArrSettings>;
    return {
      tenantId: normalizeTenantId(parsed.tenantId),
      userEmail: normalizeUserEmail(parsed.userEmail),
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
  };

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }));
  }

  return normalized;
}

export function buildApiPath(path: string, tenantId = getArrSettings().tenantId): string {
  const base = `/api/tenants/${encodeURIComponent(tenantId)}`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
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

  return useMemo(() => ({ ...settings, updateSettings }), [settings, updateSettings]);
}
