/**
 * Thin React hooks wrapping the API client.
 */
import { useEffect, useState, useCallback } from 'react';
import type { ImportListItem, ImportSummary, ArrTimeseries, ReviewQueue, ReviewStats } from './api';
import * as api from './api';
import { useArrSettings } from './settings';

// Generic async-state hook
function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
): { data: T | null; loading: boolean; error: string | null; refetch: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fn()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message ?? 'Unknown error'); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, loading, error, refetch };
}

export function useImportList() {
  const { tenantId } = useArrSettings();
  return useAsync<ImportListItem[]>(() => api.listImports(), [tenantId]);
}

export function useImportSummary(importId: string) {
  const { tenantId } = useArrSettings();
  return useAsync<ImportSummary>(() => api.getImportSummary(importId), [tenantId, importId]);
}

export function useArrTimeseries(importId: string, from?: string | null, to?: string | null) {
  const { tenantId } = useArrSettings();
  return useAsync<ArrTimeseries>(
    () => api.getArrTimeseries(importId, from ?? undefined, to ?? undefined),
    [tenantId, importId, from, to],
  );
}

export function useReviewQueue(importId: string, status?: string) {
  const { tenantId } = useArrSettings();
  return useAsync<ReviewQueue>(() => api.getReviewQueue(importId, status), [tenantId, importId, status]);
}

export function useReviewStats(importId: string) {
  const { tenantId } = useArrSettings();
  return useAsync<ReviewStats>(() => api.getReviewStats(importId), [tenantId, importId]);
}

export function useArrMovements(importId: string, from?: string | null, to?: string | null) {
  const { tenantId } = useArrSettings();
  return useAsync<import('./api').ArrMovementsResult>(
    () => api.getArrMovements(importId, from ?? undefined, to ?? undefined),
    [tenantId, importId, from, to],
  );
}
