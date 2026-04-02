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
import type { ImportSummaryResponse, ArrTimeseriesResponse, ReviewQueueResponse, ReviewItem } from './types.js';
import { ImportError, wrapUnknownError } from '../../imports/src/importErrors.js';

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

// In-memory store for now — will be replaced with DB persistence
const importStore = new Map<string, ImportResult>();

// Per-import map of itemId → override state
interface ReviewOverride {
  status: 'resolved' | 'overridden';
  resolvedAt: string;
  resolvedBy: string;
  overrideNote?: string;
}
const reviewOverrides = new Map<string, ReviewOverride>();

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

export function listImports(): Array<{ importId: string; importedAt: string; totalRows: number }> {
  return [...importStore.values()].map(r => ({
    importId: r.importId,
    importedAt: r.importedAt,
    totalRows: r.bundle.normalizedRows.length,
  }));
}
