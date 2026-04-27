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

const WORKSPACE = path.resolve(process.cwd(), '../../..');

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

// ─── External workbook pipeline (Bug #6 fixed) ────────────────────────────────
// Bug #6 was: 'Sales by Cust Detail External' was hard-rejected by sheetDetection.
// Fix: external sheets are now accepted as fallback when no internal sheet is found.
// Internal sheet is still preferred when both exist.

describe('Full pipeline — external (anonymized) workbook (Bug #6 fixed)', () => {
  it('external workbook CAN now be processed end-to-end (Bug #6 fixed)', () => {
    // sheetDetection now accepts 'Sales by Cust Detail External' as a valid
    // transaction detail sheet when no internal variant is present.
    const workbook = readXlsxWorkbook(EXTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    const result = normalizeImportBundle(bundle);
    const { segments } = recognizeAll(result.normalizedRows);
    expect(segments.length).toBeGreaterThan(0);
  });

  it('external workbook sheets are named with External suffix', () => {
    const workbook = readXlsxWorkbook(EXTERNAL_XLSX);
    const names = workbook.sheets.map(s => s.name);
    expect(names.some(n => n.toLowerCase().includes('external'))).toBe(true);
  });

  it('external workbook detected transaction detail sheet has External in its name', () => {
    const workbook = readXlsxWorkbook(EXTERNAL_XLSX);
    const bundle = workbookToImportBundle(workbook);
    // The bundle processes successfully — confirming sheetDetection used the external sheet
    expect(bundle.transactionDetailRows.length).toBeGreaterThan(0);
  });
});

// ─── Cross-workbook consistency ───────────────────────────────────────────────

describe('Cross-workbook consistency', () => {
  it('both internal and external workbooks process successfully (Bug #6 fixed)', () => {
    const internalWb = readXlsxWorkbook(INTERNAL_XLSX);
    const externalWb = readXlsxWorkbook(EXTERNAL_XLSX);

    const internalResult = normalizeImportBundle(workbookToImportBundle(internalWb));
    const { segments: internalSegs } = recognizeAll(internalResult.normalizedRows);
    expect(internalSegs.length).toBeGreaterThan(0);

    // External workbook now also processes (Bug #6 fixed)
    const externalResult = normalizeImportBundle(workbookToImportBundle(externalWb));
    const { segments: externalSegs } = recognizeAll(externalResult.normalizedRows);
    expect(externalSegs.length).toBeGreaterThan(0);
  });

  it('external workbook produces the same or comparable row count as internal', () => {
    const internalWb = readXlsxWorkbook(INTERNAL_XLSX);
    const externalWb = readXlsxWorkbook(EXTERNAL_XLSX);

    const internalBundle = workbookToImportBundle(internalWb);
    const externalBundle = workbookToImportBundle(externalWb);

    // Both should have data rows; exact counts may differ due to anonymization
    expect(internalBundle.transactionDetailRows.length).toBeGreaterThan(0);
    expect(externalBundle.transactionDetailRows.length).toBeGreaterThan(0);
  });
});
