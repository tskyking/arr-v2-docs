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
import type { NormalizedImportBundle } from '../../imports/src/types.js';
import type { RevenueSegment, ArrSnapshot } from '../../arr/src/types.js';
import type { ImportSummaryResponse, ArrTimeseriesResponse, ReviewQueueResponse } from './types.js';

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

export function processImport(filePath: string): ImportResult {
  const importId = randomUUID();
  const importedAt = new Date().toISOString();

  const workbook = readXlsxWorkbook(filePath);
  const bundle = workbookToImportBundle(workbook);
  const normalized = normalizeImportBundle(bundle);
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
    }));

  return { periods, fromDate, toDate };
}

export function getReviewQueue(importId: string, status?: string): ReviewQueueResponse | null {
  const result = importStore.get(importId);
  if (!result) return null;

  const items = result.bundle.reviewItems
    .filter(item => !status || status === 'open')
    .map((item, idx) => ({
      id: `${importId}-${item.sourceRowNumber}-${idx}`,
      importId,
      sourceRowNumber: item.sourceRowNumber,
      severity: item.severity as 'warning' | 'error',
      reasonCode: item.reasonCode,
      message: item.message,
      customerName: result.bundle.normalizedRows[item.sourceRowNumber - 1]?.siteName ?? '',
      productService: result.bundle.normalizedRows[item.sourceRowNumber - 1]?.productService ?? '',
      amount: result.bundle.normalizedRows[item.sourceRowNumber - 1]?.amount ?? 0,
      invoiceDate: result.bundle.normalizedRows[item.sourceRowNumber - 1]?.invoiceDate ?? '',
      status: 'open' as const,
    }));

  return {
    items,
    total: items.length,
    openCount: items.length,
    resolvedCount: 0,
  };
}

export function listImports(): Array<{ importId: string; importedAt: string; totalRows: number }> {
  return [...importStore.values()].map(r => ({
    importId: r.importId,
    importedAt: r.importedAt,
    totalRows: r.bundle.normalizedRows.length,
  }));
}
