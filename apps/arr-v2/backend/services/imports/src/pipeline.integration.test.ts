/**
 * End-to-end integration test: full import pipeline against real sample workbooks.
 *
 * Pipeline: readXlsxWorkbook → workbookToImportBundle → normalizeImportBundle
 *           → recognizeAll → buildMonthlySnapshots
 *
 * These tests assert structural/invariant properties of the pipeline output
 * (no hardcoded amounts that could break on file changes) to be robust to
 * workbook updates.
 */

import path from 'node:path';
import { describe, it, expect } from 'vitest';

import { readXlsxWorkbook } from './readers/xlsxXmlReader.js';
import { workbookToImportBundle } from './workbookToBundle.js';
import { normalizeImportBundle } from './normalizers.js';
import { recognizeAll } from '../../arr/src/recognition.js';
import { buildMonthlySnapshots } from '../../arr/src/snapshots.js';

const WORKSPACE = '/Users/sky/.openclaw/workspace';

const INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx'
);
const EXTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import.xlsx'
);

// ─── Internal workbook pipeline ───────────────────────────────────────────────

describe('Full pipeline — internal workbook', () => {
  // Parse once, share across tests in this describe block
  let normalizedBundle: ReturnType<typeof normalizeImportBundle>;
  let recognitionResult: ReturnType<typeof recognizeAll>;

  it('runs end-to-end without throwing', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    normalizedBundle = normalizeImportBundle(bundle);
    recognitionResult = recognizeAll(normalizedBundle.normalizedRows);
    // If we got here without throwing, the pipeline is healthy
    expect(true).toBe(true);
  });

  it('produces normalized rows (> 0)', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    expect(result.normalizedRows.length).toBeGreaterThan(0);
  });

  it('every normalized row has a sourceRowNumber > 0', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    for (const row of result.normalizedRows) {
      expect(row.sourceRowNumber).toBeGreaterThan(0);
    }
  });

  it('every normalized row has a non-empty siteName', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    for (const row of result.normalizedRows) {
      expect(row.siteName.trim().length).toBeGreaterThan(0);
    }
  });

  it('at least some rows have no review flags (clean rows exist)', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const cleanRows = result.normalizedRows.filter((r) => !r.requiresReview);
    expect(cleanRows.length).toBeGreaterThan(0);
  });

  it('reviewItems count equals sum of reviewReasons across all rows', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const totalReasons = result.normalizedRows.reduce((acc, r) => acc + r.reviewReasons.length, 0);
    expect(result.reviewItems.length).toBe(totalReasons);
  });

  it('recognition produces at least some segments', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('all recognized segments have a valid periodStart and periodEnd (parseable dates)', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);
    for (const seg of segments) {
      expect(seg.periodStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(seg.periodEnd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('no segment has a NaN arrContribution', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);
    for (const seg of segments) {
      expect(isNaN(seg.arrContribution)).toBe(false);
    }
  });

  it('snapshot range covers at least one month with positive ARR', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);

    // Use a reasonable reporting range
    const snapshots = buildMonthlySnapshots(segments, '2023-01-01', '2025-12-31');
    expect(snapshots.size).toBeGreaterThan(0);

    let hasPositiveArr = false;
    for (const [, snap] of snapshots) {
      if (snap.totalArr > 0) {
        hasPositiveArr = true;
        break;
      }
    }
    expect(hasPositiveArr).toBe(true);
  });

  it('snapshots include at least one active customer in some month', () => {
    const workbook = readXlsxWorkbook(INTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);

    const snapshots = buildMonthlySnapshots(segments, '2023-01-01', '2025-12-31');
    let hasActiveCustomer = false;
    for (const [, snap] of snapshots) {
      if (snap.activeCustomerCount > 0) {
        hasActiveCustomer = true;
        break;
      }
    }
    expect(hasActiveCustomer).toBe(true);
  });
});

// ─── External workbook pipeline ───────────────────────────────────────────────
// BUG #6: The external workbook's transaction detail sheet is named
// 'Sales by Cust Detail External' — which sheetDetection.ts explicitly rejects
// (it filters out sheets ending with 'external'). So workbookToImportBundle
// throws for the external workbook. The xlsxXmlReader tests pass because they
// only check that a sheet name includes 'sales by cust' (which matches).
// These tests DOCUMENT the current broken behavior as a known bug.

describe('Full pipeline — external (anonymized) workbook (BUG #6)', () => {
  it('external workbook CANNOT be processed end-to-end — sheetDetection rejects its transaction sheet', () => {
    // This is a known bug: 'Sales by Cust Detail External' is rejected by detectWorkbookSheets.
    // This test locks in the current broken behavior so any fix is immediately visible.
    const workbook = readXlsxWorkbook(EXTERNAL_XLSX);
    expect(() => workbookToImportBundle(workbook)).toThrow(/transaction detail/i);
  });

  it('external workbook sheets are named with External suffix (root cause)', () => {
    const workbook = readXlsxWorkbook(EXTERNAL_XLSX);
    const names = workbook.sheets.map(s => s.name);
    // Confirm the external suffix exists on the transaction detail sheet
    expect(names.some(n => n.toLowerCase().includes('external'))).toBe(true);
  });
});

// ─── Cross-workbook consistency ───────────────────────────────────────────────

describe('Cross-workbook consistency', () => {
  it('internal workbook processes successfully while external throws (Bug #6)', () => {
    const internalWb = readXlsxWorkbook(INTERNAL_XLSX);
    const externalWb = readXlsxWorkbook(EXTERNAL_XLSX);

    const internalResult = normalizeImportBundle(workbookToImportBundle(internalWb));
    const { segments: internalSegs } = recognizeAll(internalResult.normalizedRows);
    expect(internalSegs.length).toBeGreaterThan(0);

    // External workbook fails pipeline — this is Bug #6
    expect(() => workbookToImportBundle(externalWb)).toThrow(/transaction detail/i);
  });
});
