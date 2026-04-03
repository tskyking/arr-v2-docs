/**
 * Thin React hooks wrapping the API client.
 */
import { useEffect, useState, useCallback } from 'react';
import type {
  ImportListItem,
  ImportSummary,
  ArrTimeseries,
  ReviewQueue,
  ReviewStats,
  CustomerListResult,
  CustomerDetail,
} from './api';
import * as api from './api';
import { useArrSettings } from './settings';

interface UseAsyncOptions {
  pollMs?: number;
}

// Generic async-state hook
function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  options?: UseAsyncOptions,
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

  useEffect(() => {
    if (!options?.pollMs || options.pollMs <= 0) return undefined;
    const id = window.setInterval(() => {
      setTick(t => t + 1);
    }, options.pollMs);
    return () => window.clearInterval(id);
  }, [options?.pollMs]);

  return { data, loading, error, refetch };
}

export function useImportList() {
  const { tenantId } = useArrSettings();
  return useAsync<ImportListItem[]>(() => api.listImports(), [tenantId]);
}

export function useImportSummary(importId: string, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<ImportSummary>(() => api.getImportSummary(importId), [tenantId, importId], options);
}

export function useArrTimeseries(importId: string, from?: string | null, to?: string | null, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<ArrTimeseries>(
    () => api.getArrTimeseries(importId, from ?? undefined, to ?? undefined),
    [tenantId, importId, from, to],
    options,
  );
}

export function useReviewQueue(importId: string, status?: string) {
  const { tenantId } = useArrSettings();
  return useAsync<ReviewQueue>(() => api.getReviewQueue(importId, status), [tenantId, importId, status]);
}

export function useReviewStats(importId: string, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<ReviewStats>(() => api.getReviewStats(importId), [tenantId, importId], options);
}

export function useArrMovements(importId: string, from?: string | null, to?: string | null, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<import('./api').ArrMovementsResult>(
    () => api.getArrMovements(importId, from ?? undefined, to ?? undefined),
    [tenantId, importId, from, to],
    options,
  );
}

export function useCustomerList(importId: string, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<CustomerListResult>(() => api.getCustomerList(importId), [tenantId, importId], options);
}

export function useCustomerDetail(importId: string, customerName: string, options?: UseAsyncOptions) {
  const { tenantId } = useArrSettings();
  return useAsync<CustomerDetail>(
    () => api.getCustomerDetail(importId, customerName),
    [tenantId, importId, customerName],
    options,
  );
}
