/**
 * Import service — orchestrates the full import pipeline.
 * Connects the XLSX reader → workbook parser → normalizer → ARR engine.
 */

import { randomUUID } from 'node:crypto';
import { readXlsxWorkbook } from '../../imports/src/readers/xlsxXmlReader.js';
import { workbookToImportBundle } from '../../imports/src/workbookToBundle.js';
import { normalizeImportBundle } from '../../imports/src/normalizers.js';
import { recognizeAll } from '../../arr/src/recognition.js';
import { buildMonthlySnapshots } from '../../arr/src/snapshots.js';
import { buildArrMovements } from '../../arr/src/movements.js';
import type { ArrMovementsResult } from '../../arr/src/movements.js';
import type { NormalizedImportBundle } from '../../imports/src/types.js';
import type { RevenueSegment, ArrSnapshot } from '../../arr/src/types.js';
import type {
  ImportSummaryResponse,
  ArrTimeseriesResponse,
  ReviewQueueResponse,
  ReviewItem,
  CustomerSummary,
  CustomerListResponse,
  CustomerDetailResponse,
} from './types.js';
import { ImportError, wrapUnknownError } from '../../imports/src/importErrors.js';
import {
  saveImport,
  loadAllImports,
  deleteImport,
  saveOverrides,
  loadOverrides,
  deleteOverrides,
  type PersistedOverride,
} from './store.js';

export interface ImportResult {
  importId: string;
  importedAt: string;
  bundle: NormalizedImportBundle & { normalizedRows: any[]; reviewItems: any[] };
  segments: RevenueSegment[];
  skippedRows: Array<{ sourceRowNumber: number; reason: string }>;
  snapshots: Map<string, ArrSnapshot>;
  fromDate: string;
  toDate: string;
}

// Import store — file-backed, loaded at startup so data survives restarts
const importStore: Map<string, ImportResult> = loadAllImports();

// Per-import map of itemId → override state — persisted to disk per import
// Key: itemId (stable deterministic string), Value: override record
type ReviewOverride = PersistedOverride;

// Flat map of itemId → override — merged from all loaded imports
// Populated at startup and kept in sync with every patch/resolve
const reviewOverrides = new Map<string, ReviewOverride>();

// Bootstrap: load all existing overrides from disk
for (const [importId] of importStore) {
  const loaded = loadOverrides(importId);
  for (const [itemId, override] of loaded) {
    reviewOverrides.set(itemId, override);
  }
}

// Per-import tracking so we know which items to persist when saving
const overridesByImport = new Map<string, Map<string, ReviewOverride>>();
for (const [importId] of importStore) {
  const loaded = loadOverrides(importId);
  overridesByImport.set(importId, loaded);
}

// Stable deterministic item ID used by both getReviewQueue and patchReviewItem
function makeItemId(importId: string, sourceRowNumber: number, idx: number): string {
  return `${importId}-${sourceRowNumber}-${idx}`;
}

export function processImport(filePath: string): ImportResult {
  const importId = randomUUID();
  const importedAt = new Date().toISOString();

  // All pipeline errors are wrapped into ImportError before leaving this function.
  // No raw JS errors, stack traces, or internal messages should reach the API layer.
  let workbook, bundle, normalized;
  try {
    workbook = readXlsxWorkbook(filePath);
  } catch (e) {
    throw e instanceof ImportError ? e : new ImportError('FILE_UNREADABLE', e instanceof Error ? e.message : String(e));
  }
  try {
    bundle = workbookToImportBundle(workbook);
  } catch (e) {
    throw e instanceof ImportError ? e : wrapUnknownError(e, 'Parsing workbook');
  }
  try {
    normalized = normalizeImportBundle(bundle);
  } catch (e) {
    throw wrapUnknownError(e, 'Normalizing rows');
  }

  // Post-parse data quality checks
  if (normalized.normalizedRows.length === 0) {
    throw new ImportError('NO_DATA_ROWS');
  }
  const mappedCount = normalized.normalizedRows.filter(r => r.recognizedCategory).length;
  if (mappedCount === 0) {
    throw new ImportError('ALL_ROWS_UNMAPPED');
  }
  const { segments, skipped } = recognizeAll(normalized.normalizedRows);

  // Determine date range from segments
  const periodStarts = segments.map(s => s.periodStart).filter(Boolean).sort();
  const periodEnds = segments.map(s => s.periodEnd).filter(Boolean).sort();
  const fromDate = periodStarts[0] ?? new Date().toISOString().slice(0, 10);
  const toDate = periodEnds[periodEnds.length - 1] ?? new Date().toISOString().slice(0, 10);

  const snapshots = buildMonthlySnapshots(segments, fromDate, toDate);

  const result: ImportResult = {
    importId,
    importedAt,
    bundle: normalized as any,
    segments,
    skippedRows: skipped,
    snapshots,
    fromDate,
    toDate,
  };

  importStore.set(importId, result);
  saveImport(result);
  return result;
}

export function getImport(importId: string): ImportResult | undefined {
  return importStore.get(importId);
}

export function getImportSummary(importId: string): ImportSummaryResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const categoryMap = new Map<string, { rowCount: number; totalAmount: number }>();
  for (const row of result.bundle.normalizedRows) {
    const cat = row.recognizedCategory ?? '__unmapped__';
    const existing = categoryMap.get(cat) ?? { rowCount: 0, totalAmount: 0 };
    existing.rowCount++;
    existing.totalAmount += row.amount;
    categoryMap.set(cat, existing);
  }

  return {
    importId,
    importedAt: result.importedAt,
    totalRows: result.bundle.normalizedRows.length,
    mappedRows: result.bundle.normalizedRows.filter(r => r.recognizedCategory).length,
    reviewItems: result.bundle.reviewItems.length,
    categoryBreakdown: [...categoryMap.entries()].map(([category, stats]) => ({
      category,
      ...stats,
    })).sort((a, b) => b.totalAmount - a.totalAmount),
    skippedRows: result.skippedRows.length,
  };
}

export function getArrMovements(
  importId: string,
  from?: string,
  to?: string,
): ArrMovementsResult | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const fromDate = from ?? result.fromDate;
  const toDate = to ?? result.toDate;
  return buildArrMovements(result.snapshots, fromDate, toDate);
}

export function getArrTimeseries(importId: string, from?: string, to?: string): ArrTimeseriesResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const fromDate = from ?? result.fromDate;
  const toDate = to ?? result.toDate;

  // Filter snapshots to requested range
  const periods = [...result.snapshots.entries()]
    .filter(([key]) => key >= (fromDate.slice(0, 7)) && key <= (toDate.slice(0, 7)))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, snap]) => ({
      period,
      asOf: snap.asOf,
      totalArr: snap.totalArr,
      activeCustomers: snap.activeCustomerCount,
      byCategory: Object.entries(snap.byCategory)
        .map(([category, arr]) => ({ category, arr }))
        .sort((a, b) => b.arr - a.arr),
      byCustomer: Object.entries(snap.byCustomer)
        .map(([customer, arr]) => ({ customer, arr }))
        .sort((a, b) => b.arr - a.arr),
    }));

  return { periods, fromDate, toDate };
}

export function getReviewQueue(importId: string, status?: string): ReviewQueueResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const allItems = result.bundle.reviewItems.map((item, idx) => {
    const id = makeItemId(importId, item.sourceRowNumber, idx);
    const override = reviewOverrides.get(id);
    const row = result.bundle.normalizedRows[item.sourceRowNumber - 1];
    return {
      id,
      importId,
      sourceRowNumber: item.sourceRowNumber,
      severity: item.severity as 'warning' | 'error',
      reasonCode: item.reasonCode,
      message: item.message,
      customerName: row?.siteName ?? '',
      productService: row?.productService ?? '',
      amount: row?.amount ?? 0,
      invoiceDate: row?.invoiceDate ?? '',
      status: override?.status ?? ('open' as 'open' | 'resolved' | 'overridden'),
      resolvedAt: override?.resolvedAt,
      resolvedBy: override?.resolvedBy,
      overrideNote: override?.overrideNote,
    };
  });

  const filtered = status && status !== 'all'
    ? allItems.filter(i => i.status === status)
    : allItems;

  const resolvedCount = allItems.filter(i => i.status === 'resolved' || i.status === 'overridden').length;

  return {
    items: filtered,
    total: allItems.length,
    openCount: allItems.filter(i => i.status === 'open').length,
    resolvedCount,
  };
}

export function patchReviewItem(
  importId: string,
  itemId: string,
  action: 'resolve' | 'override',
  note?: string,
): ReviewItem | null {
  const result = importStore.get(importId);
  if (!result) return null;

  // Verify the itemId belongs to this import
  const idx = result.bundle.reviewItems.findIndex((item, i) =>
    makeItemId(importId, item.sourceRowNumber, i) === itemId
  );
  if (idx === -1) return null;

  const item = result.bundle.reviewItems[idx];
  const row = result.bundle.normalizedRows[item.sourceRowNumber - 1];
  const override: ReviewOverride = {
    status: action === 'override' ? 'overridden' : 'resolved',
    resolvedAt: new Date().toISOString(),
    resolvedBy: 'user',  // placeholder until auth is added
    overrideNote: note,
  };
  reviewOverrides.set(itemId, override);

  // Persist the updated override map for this import
  let importOverrides = overridesByImport.get(importId);
  if (!importOverrides) {
    importOverrides = new Map();
    overridesByImport.set(importId, importOverrides);
  }
  importOverrides.set(itemId, override);
  saveOverrides(importId, importOverrides);

  return {
    id: itemId,
    importId,
    sourceRowNumber: item.sourceRowNumber,
    severity: item.severity as 'warning' | 'error',
    reasonCode: item.reasonCode,
    message: item.message,
    customerName: row?.siteName ?? '',
    productService: row?.productService ?? '',
    amount: row?.amount ?? 0,
    invoiceDate: row?.invoiceDate ?? '',
    status: override.status,
    resolvedAt: override.resolvedAt,
    resolvedBy: override.resolvedBy,
    overrideNote: override.overrideNote,
  };
}

/**
 * Bulk-resolve open review items in a single call.
 * Accepts an optional list of itemIds; if omitted, resolves ALL open items.
 * Returns the count of items actually updated.
 *
 * POST /imports/:id/review/bulk-resolve
 * Body: { action: 'resolve' | 'override'; note?: string; itemIds?: string[] }
 */
export function bulkResolveReview(
  importId: string,
  action: 'resolve' | 'override',
  itemIds?: string[],
  note?: string,
): { updatedCount: number; items: ReviewItem[] } | null {
  const result = importStore.get(importId);
  if (!result) return null;

  // Build the full queue to know which items are open
  const allItems = result.bundle.reviewItems.map((item, idx) => ({
    id: makeItemId(importId, item.sourceRowNumber, idx),
    idx,
    item,
  }));

  // Filter to target set
  const targets = itemIds && itemIds.length > 0
    ? allItems.filter(i => itemIds.includes(i.id) && !reviewOverrides.has(i.id))
    : allItems.filter(i => !reviewOverrides.has(i.id));

  const updatedItems: ReviewItem[] = [];

  let importOverrides = overridesByImport.get(importId);
  if (!importOverrides) {
    importOverrides = new Map();
    overridesByImport.set(importId, importOverrides);
  }

  for (const target of targets) {
    const override: ReviewOverride = {
      status: action === 'override' ? 'overridden' : 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'user',
      overrideNote: note,
    };
    reviewOverrides.set(target.id, override);
    importOverrides.set(target.id, override);

    const row = result.bundle.normalizedRows[target.item.sourceRowNumber - 1];
    updatedItems.push({
      id: target.id,
      importId,
      sourceRowNumber: target.item.sourceRowNumber,
      severity: target.item.severity as 'warning' | 'error',
      reasonCode: target.item.reasonCode,
      message: target.item.message,
      customerName: row?.siteName ?? '',
      productService: row?.productService ?? '',
      amount: row?.amount ?? 0,
      invoiceDate: row?.invoiceDate ?? '',
      status: override.status,
      resolvedAt: override.resolvedAt,
      resolvedBy: override.resolvedBy,
      overrideNote: override.overrideNote,
    });
  }

  // Persist all changes in one write
  if (updatedItems.length > 0) {
    saveOverrides(importId, importOverrides);
  }

  return { updatedCount: updatedItems.length, items: updatedItems };
}

export function removeImport(importId: string): boolean {
  if (!importStore.has(importId)) return false;
  importStore.delete(importId);
  deleteImport(importId);
  // Clean up overrides from disk and in-memory maps
  const importOverrides = overridesByImport.get(importId);
  if (importOverrides) {
    for (const itemId of importOverrides.keys()) {
      reviewOverrides.delete(itemId);
    }
    overridesByImport.delete(importId);
  }
  deleteOverrides(importId);
  return true;
}

export function listImports(): Array<{ importId: string; importedAt: string; totalRows: number }> {
  return [...importStore.values()].map(r => ({
    importId: r.importId,
    importedAt: r.importedAt,
    totalRows: r.bundle.normalizedRows.length,
  }));
}

// ─── Customer endpoints ──────────────────────────────────────────────────────

/**
 * Build a summary list of all customers seen in an import.
 * For each customer, reports current ARR (most recent snapshot),
 * whether any rows require review, and the last invoice date.
 */
export function getCustomerList(importId: string): CustomerListResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  // Determine the latest snapshot period for "current" ARR
  const sortedPeriods = [...result.snapshots.keys()].sort();
  const latestPeriod = sortedPeriods[sortedPeriods.length - 1];
  const latestSnapshot = latestPeriod ? result.snapshots.get(latestPeriod) : undefined;

  // Collect customer-level signals from normalized rows
  const customerMeta = new Map<string, { requiresReview: boolean; lastInvoiceDate: string; activeContracts: number }>();
  for (const row of result.bundle.normalizedRows) {
    const name = row.siteName;
    if (!name) continue;
    const existing = customerMeta.get(name) ?? { requiresReview: false, lastInvoiceDate: '', activeContracts: 0 };
    if (row.requiresReview) existing.requiresReview = true;
    if (!existing.lastInvoiceDate || row.invoiceDate > existing.lastInvoiceDate) {
      existing.lastInvoiceDate = row.invoiceDate;
    }
    if (row.subscriptionStartDate && row.subscriptionEndDate) existing.activeContracts++;
    customerMeta.set(name, existing);
  }

  const customers: CustomerSummary[] = [...customerMeta.entries()].map(([name, meta]) => ({
    name,
    currentArr: latestSnapshot?.byCustomer?.[name] ?? 0,
    activeContracts: meta.activeContracts,
    lastInvoiceDate: meta.lastInvoiceDate,
    requiresReview: meta.requiresReview,
  })).sort((a, b) => b.currentArr - a.currentArr);

  return { customers, total: customers.length };
}

/**
 * Get detailed ARR history for a single customer within an import.
 * Returns the full ARR-per-period history, peak ARR, and review summary.
 */
export function getCustomerDetail(
  importId: string,
  customerName: string,
): CustomerDetailResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const sortedPeriods = [...result.snapshots.keys()].sort();

  // Build per-period ARR history for this customer
  const arrHistory = sortedPeriods
    .map(period => ({
      period,
      arr: result.snapshots.get(period)?.byCustomer?.[customerName] ?? 0,
    }))
    .filter(p => p.arr > 0); // Only include periods where customer had ARR

  if (arrHistory.length === 0) {
    // Customer may exist in rows but have no recognized ARR — still return a record
    const hasRows = result.bundle.normalizedRows.some(r => r.siteName === customerName);
    if (!hasRows) return null;
  }

  const arrValues = arrHistory.map(p => p.arr);
  const peakArr = arrValues.length > 0 ? Math.max(...arrValues) : 0;
  const currentArr = arrHistory[arrHistory.length - 1]?.arr ?? 0;
  const firstSeenPeriod = arrHistory[0]?.period ?? '';
  const lastActivePeriod = arrHistory[arrHistory.length - 1]?.period ?? '';

  // Count open review items for this customer
  const allReviewItems = result.bundle.reviewItems.map((item, idx) => {
    const id = `${importId}-${item.sourceRowNumber}-${idx}`;
    const row = result.bundle.normalizedRows[item.sourceRowNumber - 1];
    return { id, siteName: row?.siteName ?? '' };
  });
  const openReviewCount = allReviewItems.filter(item => {
    const override = reviewOverrides.get(item.id);
    return item.siteName === customerName && !override;
  }).length;

  const requiresReview = result.bundle.normalizedRows.some(
    r => r.siteName === customerName && r.requiresReview,
  );

  return {
    name: customerName,
    currentArr,
    peakArr,
    firstSeenPeriod,
    lastActivePeriod,
    arrHistory,
    requiresReview,
    openReviewCount,
  };
}
