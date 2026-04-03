/**
 * API client — thin typed wrappers around the ARR V2 backend.
 * All requests go through /api proxy (Vite rewrites to :3001).
 */

import { buildApiPath, getArrSettings } from './settings';
import {
  demoCustomers,
  demoImports,
  demoMovements,
  demoReviewQueue,
  demoReviewStats,
  demoSummary,
  demoTimeseries,
  getDemoCustomerDetail,
  isDemoImportId,
  isStaticDemoEnvironment,
} from './demoData';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { userEmail } = getArrSettings();
  const res = await fetch(buildApiPath(path), {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': userEmail,
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Imports ──────────────────────────────────────────────────────────────────

export interface ImportListItem {
  importId: string;
  importedAt: string;
  totalRows: number;
}

export interface ImportUploadResult {
  importId: string;
  status: string;
  totalRows: number;
  reviewItems: number;
  segments: number;
}

export interface ImportSummary {
  importId: string;
  importedAt: string;
  totalRows: number;
  mappedRows: number;
  reviewItems: number;
  skippedRows: number;
  categoryBreakdown: Array<{ category: string; rowCount: number; totalAmount: number }>;
}

export async function listImports(): Promise<ImportListItem[]> {
  if (isStaticDemoEnvironment()) return demoImports;
  const data = await request<{ imports: ImportListItem[] }>('/imports');
  return data.imports;
}

export async function uploadImportFile(file: File): Promise<ImportUploadResult> {
  const { userEmail } = getArrSettings();
  const res = await fetch(buildApiPath('/imports'), {
    method: 'POST',
    body: file,
    headers: {
      'Content-Type': 'application/octet-stream',
      'X-User-Email': userEmail,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? res.statusText);
  }
  return res.json();
}

export async function uploadImportPath(filePath: string): Promise<ImportUploadResult> {
  return request<ImportUploadResult>('/imports', {
    method: 'POST',
    body: JSON.stringify({ filePath }),
  });
}

export async function getImportSummary(importId: string): Promise<ImportSummary> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return demoSummary[importId] ?? demoSummary['demo-q1-2026'];
  }
  return request<ImportSummary>(`/imports/${importId}/summary`);
}

// ─── ARR Timeseries ───────────────────────────────────────────────────────────

export interface ArrPeriod {
  period: string;
  asOf: string;
  totalArr: number;
  activeCustomers: number;
  byCategory: Array<{ category: string; arr: number }>;
  byCustomer: Array<{ customer: string; arr: number }>;
}

export interface ArrTimeseries {
  periods: ArrPeriod[];
  fromDate: string;
  toDate: string;
}

function buildQueryString(from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.size ? `?${params}` : '';
}

export async function getArrTimeseries(
  importId: string,
  from?: string,
  to?: string,
): Promise<ArrTimeseries> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return demoTimeseries[importId] ?? demoTimeseries['demo-q1-2026'];
  }
  return request<ArrTimeseries>(`/imports/${importId}/arr${buildQueryString(from, to)}`);
}

// ─── Review Queue ─────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  importId: string;
  sourceRowNumber: number;
  severity: 'warning' | 'error';
  reasonCode: string;
  message: string;
  customerName: string;
  productService: string;
  amount: number;
  invoiceDate: string;
  status: 'open' | 'resolved' | 'overridden';
  resolvedBy?: string;
  resolvedAt?: string;
  overrideNote?: string;
}

export interface ReviewQueue {
  items: ReviewItem[];
  total: number;
  openCount: number;
  resolvedCount: number;
}

export interface ReviewStats {
  importId: string;
  total: number;
  openCount: number;
  resolvedCount: number;
  overriddenCount: number;
  errorCount: number;
  warningCount: number;
  openByReasonCode: Array<{ reasonCode: string; count: number }>;
  openBySeverity: Array<{ severity: string; count: number }>;
  topCustomersWithIssues: Array<{ customerName: string; openCount: number }>;
  allResolved: boolean;
}

export async function getReviewQueue(
  importId: string,
  status?: string,
): Promise<ReviewQueue> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    const queue = demoReviewQueue[importId] ?? demoReviewQueue['demo-q1-2026'];
    if (!status || status === 'all') return queue;
    const items = queue.items.filter(item => item.status === status);
    return {
      items,
      total: items.length,
      openCount: items.filter(item => item.status === 'open').length,
      resolvedCount: items.filter(item => item.status !== 'open').length,
    };
  }
  const qs = status ? `?status=${status}` : '';
  return request<ReviewQueue>(`/imports/${importId}/review${qs}`);
}

export async function getReviewStats(importId: string): Promise<ReviewStats> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return demoReviewStats[importId] ?? demoReviewStats['demo-q1-2026'];
  }
  return request<ReviewStats>(`/imports/${importId}/review/stats`);
}

export async function resolveReviewItem(
  importId: string,
  itemId: string,
): Promise<ReviewItem> {
  return request<ReviewItem>(`/imports/${importId}/review/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'resolve' }),
  });
}

export async function overrideReviewItem(
  importId: string,
  itemId: string,
  note: string,
): Promise<ReviewItem> {
  return request<ReviewItem>(`/imports/${importId}/review/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'override', note }),
  });
}

export async function bulkResolveReviewItems(
  importId: string,
  itemIds?: string[],
): Promise<{ updatedCount: number; items: ReviewItem[] }> {
  return request<{ updatedCount: number; items: ReviewItem[] }>(`/imports/${importId}/review/bulk-resolve`, {
    method: 'POST',
    body: JSON.stringify({ action: 'resolve', itemIds }),
  });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; ts: string }> {
  return request('/health');
}

// ─── ARR Movements ────────────────────────────────────────────────────────────

export interface ArrMovement {
  period: string;
  openingArr: number;
  newArr: number;
  expansionArr: number;
  contractionArr: number;
  churnArr: number;
  closingArr: number;
  netMovement: number;
  newCustomers: number;
  churnedCustomers: number;
  expandedCustomers: number;
  contractedCustomers: number;
}

export interface ArrMovementsResult {
  movements: ArrMovement[];
  fromDate: string;
  toDate: string;
  totalNewArr: number;
  totalExpansionArr: number;
  totalContractionArr: number;
  totalChurnArr: number;
  totalNetMovement: number;
}

export async function getArrMovements(
  importId: string,
  from?: string,
  to?: string,
): Promise<ArrMovementsResult> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return demoMovements[importId] ?? demoMovements['demo-q1-2026'];
  }
  return request<ArrMovementsResult>(`/imports/${importId}/arr/movements${buildQueryString(from, to)}`);
}

async function downloadBlob(path: string, filename: string): Promise<void> {
  const { userEmail } = getArrSettings();
  const res = await fetch(buildApiPath(path), {
    headers: {
      'X-User-Email': userEmail,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, err.code ?? 'ERROR', err.message ?? res.statusText);
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export async function downloadArrCsv(importId: string, from?: string, to?: string): Promise<void> {
  await downloadBlob(`/imports/${importId}/arr/export.csv${buildQueryString(from, to)}`, `arr-${importId.slice(0, 8)}.csv`);
}

export async function downloadArrMovementsCsv(importId: string, from?: string, to?: string): Promise<void> {
  await downloadBlob(`/imports/${importId}/arr/movements/export.csv${buildQueryString(from, to)}`, `arr-movements-${importId.slice(0, 8)}.csv`);
}

// ─── Customers ───────────────────────────────────────────────────────────────

export interface CustomerSummary {
  name: string;
  currentArr: number;
  activeContracts: number;
  lastInvoiceDate: string;
  requiresReview: boolean;
}

export interface CustomerListResult {
  customers: CustomerSummary[];
  total: number;
}

export interface CustomerArrPeriod {
  period: string;
  arr: number;
}

export interface CustomerDetail {
  name: string;
  currentArr: number;
  peakArr: number;
  firstSeenPeriod: string;
  lastActivePeriod: string;
  arrHistory: CustomerArrPeriod[];
  requiresReview: boolean;
  openReviewCount: number;
}

export async function getCustomerList(importId: string): Promise<CustomerListResult> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return demoCustomers[importId] ?? demoCustomers['demo-q1-2026'];
  }
  return request<CustomerListResult>(`/imports/${importId}/customers`);
}

export async function getCustomerDetail(importId: string, customerName: string): Promise<CustomerDetail> {
  if (isStaticDemoEnvironment() || isDemoImportId(importId)) {
    return getDemoCustomerDetail(importId, customerName);
  }
  return request<CustomerDetail>(`/imports/${importId}/customers/${encodeURIComponent(customerName)}`);
}
