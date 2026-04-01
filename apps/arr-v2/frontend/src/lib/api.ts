/**
 * API client — thin typed wrappers around the ARR V2 backend.
 * All requests go through /api proxy (Vite rewrites to :3001).
 */

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
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
  const data = await request<{ imports: ImportListItem[] }>('/imports');
  return data.imports;
}

export async function uploadImportFile(file: File): Promise<ImportUploadResult> {
  const res = await fetch(`${BASE}/imports`, {
    method: 'POST',
    body: file,
    headers: { 'Content-Type': 'application/octet-stream' },
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

export async function getArrTimeseries(
  importId: string,
  from?: string,
  to?: string,
): Promise<ArrTimeseries> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.size ? `?${params}` : '';
  return request<ArrTimeseries>(`/imports/${importId}/arr${qs}`);
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

export async function getReviewQueue(
  importId: string,
  status?: string,
): Promise<ReviewQueue> {
  const qs = status ? `?status=${status}` : '';
  return request<ReviewQueue>(`/imports/${importId}/review${qs}`);
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

// ─── Health ───────────────────────────────────────────────────────────────────

export async function getHealth(): Promise<{ status: string; ts: string }> {
  return request('/health');
}
