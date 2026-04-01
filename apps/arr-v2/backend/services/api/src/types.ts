/**
 * API layer types — request/response shapes for the ARR V2 backend API.
 */

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportUploadResponse {
  importId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  message?: string;
}

export interface ImportStatusResponse {
  importId: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress?: {
    totalRows: number;
    processedRows: number;
    reviewItems: number;
  };
  error?: string;
}

export interface ImportSummaryResponse {
  importId: string;
  importedAt: string;
  totalRows: number;
  mappedRows: number;
  reviewItems: number;
  categoryBreakdown: Array<{ category: string; rowCount: number; totalAmount: number }>;
  skippedRows: number;
}

// ─── ARR ─────────────────────────────────────────────────────────────────────

export interface ArrSnapshotResponse {
  period: string;          // e.g. '2022-04'
  asOf: string;            // ISO date
  totalArr: number;
  activeCustomers: number;
  byCategory: Array<{ category: string; arr: number }>;
  byCustomer: Array<{ customer: string; arr: number }>;
}

export interface ArrTimeseriesResponse {
  periods: ArrSnapshotResponse[];
  fromDate: string;
  toDate: string;
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

export interface ReviewQueueResponse {
  items: ReviewItem[];
  total: number;
  openCount: number;
  resolvedCount: number;
}

export interface ResolveReviewItemRequest {
  action: 'resolve' | 'override';
  note?: string;
  overrideValues?: Record<string, unknown>;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface CustomerSummary {
  name: string;
  currentArr: number;
  activeContracts: number;
  lastInvoiceDate: string;
  requiresReview: boolean;
}

export interface CustomerListResponse {
  customers: CustomerSummary[];
  total: number;
}

// ─── Common ───────────────────────────────────────────────────────────────────

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
