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
  tenantId: string;        // Tenant this import belongs to — never cross-tenant accessible
  importId: string;
  importedAt: string;
  bundle: NormalizedImportBundle & { normalizedRows: any[]; reviewItems: any[] };
  segments: RevenueSegment[];
  skippedRows: Array<{ sourceRowNumber: number; reason: string }>;
  snapshots: Map<string, ArrSnapshot>;
  fromDate: string;
  toDate: string;
}

// ─── Tenant-scoped in-memory store ──────────────────────────────────────────
//
// All data is keyed by tenantId at the top level.
// No cross-tenant access is possible by construction.
//
// Structure:
//   tenantStores:    tenantId → Map<importId, ImportResult>
//   tenantOverrides: tenantId → Map<itemId, ReviewOverride>
//   overridesByImport: tenantId:importId → Map<itemId, ReviewOverride>

type ReviewOverride = PersistedOverride;

const tenantStores = new Map<string, Map<string, ImportResult>>();
const tenantOverrides = new Map<string, Map<string, ReviewOverride>>();
const overridesByImport = new Map<string, Map<string, ReviewOverride>>();

function getTenantStore(tenantId: string): Map<string, ImportResult> {
  if (!tenantStores.has(tenantId)) {
    // Lazy-load from disk on first access for this tenant
    const loaded = loadAllImports(tenantId);
    tenantStores.set(tenantId, loaded);
    // Also bootstrap overrides for this tenant
    const overrides = new Map<string, ReviewOverride>();
    tenantOverrides.set(tenantId, overrides);
    for (const [importId] of loaded) {
      const importOverrides = loadOverrides(tenantId, importId);
      overridesByImport.set(`${tenantId}:${importId}`, importOverrides);
      for (const [itemId, override] of importOverrides) {
        overrides.set(itemId, override);
      }
    }
  }
  return tenantStores.get(tenantId)!;
}

function getTenantOverrides(tenantId: string): Map<string, ReviewOverride> {
  getTenantStore(tenantId); // ensure bootstrapped
  return tenantOverrides.get(tenantId) ?? new Map();
}

// Stable deterministic item ID used by both getReviewQueue and patchReviewItem
function makeItemId(importId: string, sourceRowNumber: number, idx: number): string {
  return `${importId}-${sourceRowNumber}-${idx}`;
}

export function processImport(tenantId: string, filePath: string): ImportResult {
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
    tenantId,
    importId,
    importedAt,
    bundle: normalized as any,
    segments,
    skippedRows: skipped,
    snapshots,
    fromDate,
    toDate,
  };

  getTenantStore(tenantId).set(importId, result);
  saveImport(tenantId, result);
  return result;
}

export function getImport(tenantId: string, importId: string): ImportResult | undefined {
  return getTenantStore(tenantId).get(importId);
}

export function getImportSummary(tenantId: string, importId: string): ImportSummaryResponse | null {
  const result = getTenantStore(tenantId).get(importId);
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
  tenantId: string,
  importId: string,
  from?: string,
  to?: string,
): ArrMovementsResult | null {
  const result = getTenantStore(tenantId).get(importId);
  if (!result) return null;

  const fromDate = from ?? result.fromDate;
  const toDate = to ?? result.toDate;
  return buildArrMovements(result.snapshots, fromDate, toDate);
}

export function getArrTimeseries(tenantId: string, importId: string, from?: string, to?: string): ArrTimeseriesResponse | null {
  const result = getTenantStore(tenantId).get(importId);
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

export function getReviewQueue(tenantId: string, importId: string, status?: string): ReviewQueueResponse | null {
  const result = getTenantStore(tenantId).get(importId);
  if (!result) return null;

  const allItems = result.bundle.reviewItems.map((item, idx) => {
    const id = makeItemId(importId, item.sourceRowNumber, idx);
    const override = getTenantOverrides(tenantId).get(id);
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
  tenantId: string,
  importId: string,
  itemId: string,
  action: 'resolve' | 'override',
  note?: string,
): ReviewItem | null {
  const result = getTenantStore(tenantId).get(importId);
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
  getTenantOverrides(tenantId).set(itemId, override);

  // Persist the updated override map for this import
  const overrideKey = `${tenantId}:${importId}`;
  let importOverrides = overridesByImport.get(overrideKey);
  if (!importOverrides) {
    importOverrides = new Map();
    overridesByImport.set(overrideKey, importOverrides);
  }
  importOverrides.set(itemId, override);
  saveOverrides(tenantId, importId, importOverrides);

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
  tenantId: string,
  importId: string,
  action: 'resolve' | 'override',
  itemIds?: string[],
  note?: string,
): { updatedCount: number; items: ReviewItem[] } | null {
  const result = getTenantStore(tenantId).get(importId);
  if (!result) return null;

  // Build the full queue to know which items are open
  const allItems = result.bundle.reviewItems.map((item, idx) => ({
    id: makeItemId(importId, item.sourceRowNumber, idx),
    idx,
    item,
  }));

  // Filter to target set
  const tenantOvr = getTenantOverrides(tenantId);
  const targets = itemIds && itemIds.length > 0
    ? allItems.filter(i => itemIds.includes(i.id) && !tenantOvr.has(i.id))
    : allItems.filter(i => !tenantOvr.has(i.id));

  const updatedItems: ReviewItem[] = [];
  const overrideKey = `${tenantId}:${importId}`;
  let importOverrides = overridesByImport.get(overrideKey);
  if (!importOverrides) {
    importOverrides = new Map();
    overridesByImport.set(overrideKey, importOverrides);
  }

  for (const target of targets) {
    const override: ReviewOverride = {
      status: action === 'override' ? 'overridden' : 'resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'user',
      overrideNote: note,
    };
    tenantOvr.set(target.id, override);
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

  if (updatedItems.length > 0) {
    saveOverrides(tenantId, importId, importOverrides);
  }

  return { updatedCount: updatedItems.length, items: updatedItems };
}

export function removeImport(tenantId: string, importId: string): boolean {
  const store = getTenantStore(tenantId);
  if (!store.has(importId)) return false;
  store.delete(importId);
  deleteImport(tenantId, importId);
  const overrideKey = `${tenantId}:${importId}`;
  const importOverrides = overridesByImport.get(overrideKey);
  if (importOverrides) {
    const tenantOvr = getTenantOverrides(tenantId);
    for (const itemId of importOverrides.keys()) tenantOvr.delete(itemId);
    overridesByImport.delete(overrideKey);
  }
  deleteOverrides(tenantId, importId);
  return true;
}

// ─── CSV export helpers ─────────────────────────────────────────────────────

/** Escape a CSV cell value — wraps in quotes if it contains comma, quote, or newline. */
function csvCell(value: string | number | undefined | null): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Build a CSV row from an array of values. */
function csvRow(cells: Array<string | number | undefined | null>): string {
  return cells.map(csvCell).join(',');
}

/**
 * Export ARR timeseries as CSV.
 * Columns: period, total_arr, active_customers, [category columns...], [customer columns...]
 *
 * Returns null if the import does not exist.
 */
export function exportArrCsv(tenantId: string, importId: string, from?: string, to?: string): string | null {
  const ts = getArrTimeseries(tenantId, importId, from, to);
  if (!ts) return null;

  if (ts.periods.length === 0) {
    return 'period,total_arr,active_customers\n';
  }

  // Collect all category and customer names across all periods for stable column headers
  const categoryNames = new Set<string>();
  const customerNames = new Set<string>();
  for (const p of ts.periods) {
    for (const c of p.byCategory) categoryNames.add(c.category);
    for (const c of p.byCustomer) customerNames.add(c.customer);
  }

  const sortedCategories = [...categoryNames].sort();
  const sortedCustomers = [...customerNames].sort();

  const headerCells = [
    'period',
    'total_arr',
    'active_customers',
    ...sortedCategories.map(c => `cat_${c}`),
    ...sortedCustomers.map(c => `cust_${c}`),
  ];

  const lines: string[] = [csvRow(headerCells)];

  for (const p of ts.periods) {
    const catMap = Object.fromEntries(p.byCategory.map(c => [c.category, c.arr]));
    const custMap = Object.fromEntries(p.byCustomer.map(c => [c.customer, c.arr]));
    lines.push(csvRow([
      p.period,
      p.totalArr,
      p.activeCustomers,
      ...sortedCategories.map(c => catMap[c] ?? 0),
      ...sortedCustomers.map(c => custMap[c] ?? 0),
    ]));
  }

  return lines.join('\n') + '\n';
}

/**
 * Export ARR movements waterfall as CSV.
 * Columns: period, opening_arr, new_arr, expansion_arr, contraction_arr, churn_arr, net_movement, closing_arr,
 *          new_customers, expanded_customers, contracted_customers, churned_customers
 *
 * Returns null if the import does not exist.
 */
export function exportMovementsCsv(tenantId: string, importId: string, from?: string, to?: string): string | null {
  const movements = getArrMovements(tenantId, importId, from, to);
  if (!movements) return null;

  const headers = [
    'period',
    'opening_arr',
    'new_arr',
    'expansion_arr',
    'contraction_arr',
    'churn_arr',
    'net_movement',
    'closing_arr',
    'new_customers',
    'expanded_customers',
    'contracted_customers',
    'churned_customers',
  ];

  const lines: string[] = [csvRow(headers)];

  for (const m of movements.movements) {
    lines.push(csvRow([
      m.period,
      m.openingArr,
      m.newArr,
      m.expansionArr,
      m.contractionArr,
      m.churnArr,
      m.netMovement,
      m.closingArr,
      m.newCustomers,
      m.expandedCustomers,
      m.contractedCustomers,
      m.churnedCustomers,
    ]));
  }

  // Append totals row
  lines.push(csvRow([
    'TOTAL',
    '',
    movements.totalNewArr,
    movements.totalExpansionArr,
    movements.totalContractionArr,
    movements.totalChurnArr,
    movements.totalNetMovement,
    '',
    '',
    '',
    '',
    '',
  ]));

  return lines.join('\n') + '\n';
}

// ─── Review stats ────────────────────────────────────────────────────────────

export interface ReviewStatsResponse {
  importId: string;
  total: number;
  openCount: number;
  resolvedCount: number;
  overriddenCount: number;
  errorCount: number;
  warningCount: number;
  /** Count of open items grouped by reasonCode */
  openByReasonCode: Array<{ reasonCode: string; count: number }>;
  /** Count of open items grouped by severity */
  openBySeverity: Array<{ severity: string; count: number }>;
  /** Top 10 customers with the most open review items */
  topCustomersWithIssues: Array<{ customerName: string; openCount: number }>;
  /** Whether all open items have been resolved/overridden */
  allResolved: boolean;
}

/**
 * Build review queue statistics for the review screen header/summary panel.
 * Provides all the aggregates a review screen needs to render its status bar
 * without re-fetching the full item list.
 */
export function getReviewStats(tenantId: string, importId: string): ReviewStatsResponse | null {
  const queue = getReviewQueue(tenantId, importId);
  if (!queue) return null;

  const { items } = queue;

  const resolvedCount = items.filter(i => i.status === 'resolved').length;
  const overriddenCount = items.filter(i => i.status === 'overridden').length;
  const openItems = items.filter(i => i.status === 'open');
  const openCount = openItems.length;

  // Reason code breakdown (open items only)
  const reasonMap = new Map<string, number>();
  for (const item of openItems) {
    reasonMap.set(item.reasonCode, (reasonMap.get(item.reasonCode) ?? 0) + 1);
  }
  const openByReasonCode = [...reasonMap.entries()]
    .map(([reasonCode, count]) => ({ reasonCode, count }))
    .sort((a, b) => b.count - a.count);

  // Severity breakdown (open items only)
  const severityMap = new Map<string, number>();
  for (const item of openItems) {
    severityMap.set(item.severity, (severityMap.get(item.severity) ?? 0) + 1);
  }
  const openBySeverity = [...severityMap.entries()]
    .map(([severity, count]) => ({ severity, count }))
    .sort((a, b) => b.count - a.count);

  // Top customers by open item count
  const customerMap = new Map<string, number>();
  for (const item of openItems) {
    if (item.customerName) {
      customerMap.set(item.customerName, (customerMap.get(item.customerName) ?? 0) + 1);
    }
  }
  const topCustomersWithIssues = [...customerMap.entries()]
    .map(([customerName, count]) => ({ customerName, openCount: count }))
    .sort((a, b) => b.openCount - a.openCount)
    .slice(0, 10);

  return {
    importId,
    total: items.length,
    openCount,
    resolvedCount,
    overriddenCount,
    errorCount: items.filter(i => i.severity === 'error').length,
    warningCount: items.filter(i => i.severity === 'warning').length,
    openByReasonCode,
    openBySeverity,
    topCustomersWithIssues,
    allResolved: openCount === 0,
  };
}

export function listImports(tenantId: string): Array<{ importId: string; importedAt: string; totalRows: number }> {
  return [...getTenantStore(tenantId).values()].map(r => ({
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
export function getCustomerList(tenantId: string, importId: string): CustomerListResponse | null {
  const result = getTenantStore(tenantId).get(importId);
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
  tenantId: string,
  importId: string,
  customerName: string,
): CustomerDetailResponse | null {
  const result = getTenantStore(tenantId).get(importId);
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
  const overridesForImport = loadOverrides(tenantId, importId);
  const allReviewItems = result.bundle.reviewItems.map((item, idx) => {
    const id = `${importId}-${item.sourceRowNumber}-${idx}`;
    const row = result.bundle.normalizedRows[item.sourceRowNumber - 1];
    return { id, siteName: row?.siteName ?? '' };
  });
  const openReviewCount = allReviewItems.filter(item => {
    const override = overridesForImport.get(item.id);
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
