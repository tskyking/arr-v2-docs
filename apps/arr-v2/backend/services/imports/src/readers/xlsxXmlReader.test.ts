/**
 * Tests for xlsxXmlReader.ts
 *
 * Integration smoke tests against the real sample workbooks that live in
 * docs/saas/arr-rebuild/reference/source-examples/csv/.
 *
 * Notes on error-path tests:
 *   - readXlsxWorkbook checks file existence BEFORE the extension check,
 *     so testing the extension guard requires real files on disk.
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterAll } from 'vitest';
import { readXlsxWorkbook } from './xlsxXmlReader.js';

// ─── Paths ───────────────────────────────────────────────────────────────────

const WORKSPACE = path.resolve(process.cwd(), '../../..');
const INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx'
);
const EXTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import.xlsx'
);

// Temp files for extension-check tests
const TMP_CSV = '/tmp/vitest_xlsxXmlReader_test.csv';
const TMP_XLS = '/tmp/vitest_xlsxXmlReader_test.xls';
fs.writeFileSync(TMP_CSV, 'dummy');
fs.writeFileSync(TMP_XLS, 'dummy');
afterAll(() => {
  [TMP_CSV, TMP_XLS].forEach((f) => { try { fs.unlinkSync(f); } catch {} });
});

// ─── Error paths ─────────────────────────────────────────────────────────────

describe('readXlsxWorkbook — error paths', () => {
  it('throws when the file does not exist', () => {
    // Error message changed to user-friendly copy; match on key fragment
    expect(() => readXlsxWorkbook('/tmp/__nonexistent_file_no_really__.xlsx')).toThrow(/could not be found/i);
  });

  it('throws for a .csv file (unsupported extension)', () => {
    // Error message now user-friendly; match on "only .xlsx" and the code tag
    expect(() => readXlsxWorkbook(TMP_CSV)).toThrow(/only .xlsx workbooks are supported/i);
  });

  it('throws for a .xls file (old binary format, unsupported)', () => {
    expect(() => readXlsxWorkbook(TMP_XLS)).toThrow(/only .xlsx workbooks are supported/i);
  });
});

// ─── Integration: internal sample workbook ───────────────────────────────────

describe('readXlsxWorkbook — internal sample workbook', () => {
  it('reads the workbook without throwing', () => {
    expect(() => readXlsxWorkbook(INTERNAL_XLSX)).not.toThrow();
  });

  it('returns an object with a sourcePath and sheets array', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    expect(wb.sourcePath).toBe(INTERNAL_XLSX);
    expect(Array.isArray(wb.sheets)).toBe(true);
    expect(wb.sheets.length).toBeGreaterThan(0);
  });

  it('every sheet has a non-empty name', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    for (const sheet of wb.sheets) {
      expect(typeof sheet.name).toBe('string');
      expect(sheet.name.length).toBeGreaterThan(0);
    }
  });

  it('every sheet has a rows array (even if empty)', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    for (const sheet of wb.sheets) {
      expect(Array.isArray(sheet.rows)).toBe(true);
    }
  });

  it('contains a transaction detail sheet (Sales by Customer Detail)', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const names = wb.sheets.map((s) => s.name.toLowerCase());
    const hasDetail = names.some(
      (n) => n.includes('sales by cust') || n.includes('sales by customer')
    );
    expect(hasDetail).toBe(true);
  });

  it('transaction detail sheet has more than 100 rows (real data)', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const detail = wb.sheets.find(
      (s) =>
        s.name.toLowerCase().includes('sales by customer detail') ||
        s.name.toLowerCase() === 'sales by cust detail'
    )!;
    expect(detail).toBeDefined();
    expect(detail.rows.length).toBeGreaterThan(100);
  });

  it('all cells in all rows are strings', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    for (const sheet of wb.sheets) {
      for (const row of sheet.rows) {
        expect(Array.isArray(row)).toBe(true);
        for (const cell of row) {
          expect(typeof cell).toBe('string');
        }
      }
    }
  });

  it('contains a mapping sheet', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const names = wb.sheets.map((s) => s.name.toLowerCase());
    const hasMapping = names.some((n) => n.includes('mapping'));
    expect(hasMapping).toBe(true);
  });

  it('contains a revenue recognition / assumptions sheet', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const names = wb.sheets.map((s) => s.name.toLowerCase());
    const hasAssumptions = names.some(
      (n) =>
        n.includes('rev rec') ||
        n.includes('revenue recognition') ||
        n.includes('assumption')
    );
    expect(hasAssumptions).toBe(true);
  });

  it('contains an anonymizer / alias sheet (internal workbook only)', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const names = wb.sheets.map((s) => s.name.toLowerCase());
    const hasAlias = names.some((n) => n.includes('anonymizer') || n.includes('alias'));
    expect(hasAlias).toBe(true);
  });

  it('transaction detail sheet contains numeric-looking amount values', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const detail = wb.sheets.find((s) =>
      s.name.toLowerCase().includes('sales by customer detail') ||
      s.name.toLowerCase() === 'sales by cust detail'
    )!;
    const numericRows = detail.rows.filter((row) =>
      row.some((cell) => {
        const n = Number(cell.replace(/,/g, ''));
        return isFinite(n) && n !== 0;
      })
    );
    expect(numericRows.length).toBeGreaterThan(0);
  });

  it('finds a Customer header column somewhere in the first 10 rows', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const detail = wb.sheets.find((s) =>
      s.name.toLowerCase().includes('sales by customer detail') ||
      s.name.toLowerCase() === 'sales by cust detail'
    )!;
    const headerRowIndex = detail.rows.slice(0, 10).findIndex((row) =>
      row.some((cell) => cell.trim().toLowerCase() === 'customer')
    );
    expect(headerRowIndex).toBeGreaterThanOrEqual(0);
  });

  it('customer column contains non-empty values in data rows', () => {
    const wb = readXlsxWorkbook(INTERNAL_XLSX);
    const detail = wb.sheets.find((s) =>
      s.name.toLowerCase().includes('sales by customer detail') ||
      s.name.toLowerCase() === 'sales by cust detail'
    )!;
    // Find header row
    const headerRowIndex = detail.rows.findIndex((row) =>
      row.some((cell) => cell.trim().toLowerCase() === 'customer')
    );
    expect(headerRowIndex).toBeGreaterThanOrEqual(0);
    const headerRow = detail.rows[headerRowIndex];
    const customerColIndex = headerRow.findIndex(
      (cell) => cell.trim().toLowerCase() === 'customer'
    );
    // Scan rows after the header for at least one non-empty customer value
    const dataRows = detail.rows.slice(headerRowIndex + 1);
    const nonEmptyCustomerRows = dataRows.filter(
      (row) => row[customerColIndex]?.trim().length > 0
    );
    expect(nonEmptyCustomerRows.length).toBeGreaterThan(0);
  });
});

// ─── Bug #5 unit: sheet path normalization ─────────────────────────────────
//
// Tests that readXlsxWorkbook normalizes varied XLSX generator path conventions.
// We test via a synthetic XLSX built with AdmZip to exercise the real code path.

import AdmZip from 'adm-zip';
import os from 'node:os';
import { randomUUID } from 'node:crypto';

/**
 * Build a minimal valid XLSX zip where the workbook.xml.rels file uses a
 * customized Target path, to exercise sheet path normalization.
 */
function buildMinimalXlsx(sheetTargetPath: string): string {
  const zip = new AdmZip();

  // [Content_Types].xml
  zip.addFile('[Content_Types].xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`));

  // _rels/.rels
  zip.addFile('_rels/.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`));

  // xl/workbook.xml
  zip.addFile('xl/workbook.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`));

  // xl/_rels/workbook.xml.rels — uses the CUSTOM target path to test normalization
  zip.addFile('xl/_rels/workbook.xml.rels', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${sheetTargetPath}"/>
</Relationships>`));

  // xl/worksheets/sheet1.xml — a minimal sheet with one cell
  zip.addFile('xl/worksheets/sheet1.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>hello</t></is></c></row>
  </sheetData>
</worksheet>`));

  const tmpPath = path.join(os.tmpdir(), `vitest-xlsx-pathtest-${randomUUID()}.xlsx`);
  zip.writeZip(tmpPath);
  return tmpPath;
}

describe('readXlsxWorkbook — Bug #5 sheet path normalization', () => {
  const tmpFiles: string[] = [];
  afterAll(() => { tmpFiles.forEach(f => { try { fs.unlinkSync(f); } catch {} }); });

  it('handles standard relative path "worksheets/sheet1.xml"', () => {
    const tmp = buildMinimalXlsx('worksheets/sheet1.xml');
    tmpFiles.push(tmp);
    const wb = readXlsxWorkbook(tmp);
    expect(wb.sheets).toHaveLength(1);
    expect(wb.sheets[0].name).toBe('Sheet1');
    expect(wb.sheets[0].rows[0][0]).toBe('hello');
  });

  it('handles "../worksheets/sheet1.xml" (single ../ prefix)', () => {
    const tmp = buildMinimalXlsx('../worksheets/sheet1.xml');
    tmpFiles.push(tmp);
    const wb = readXlsxWorkbook(tmp);
    expect(wb.sheets[0].rows[0][0]).toBe('hello');
  });

  it('handles "../../worksheets/sheet1.xml" (double ../ prefix)', () => {
    const tmp = buildMinimalXlsx('../../worksheets/sheet1.xml');
    tmpFiles.push(tmp);
    const wb = readXlsxWorkbook(tmp);
    expect(wb.sheets[0].rows[0][0]).toBe('hello');
  });

  it('handles absolute path "xl/worksheets/sheet1.xml"', () => {
    const tmp = buildMinimalXlsx('xl/worksheets/sheet1.xml');
    tmpFiles.push(tmp);
    const wb = readXlsxWorkbook(tmp);
    expect(wb.sheets[0].rows[0][0]).toBe('hello');
  });
});

// ─── Integration: external (anonymized) sample workbook ──────────────────────

describe('readXlsxWorkbook — external sample workbook', () => {
  it('reads the external workbook without throwing', () => {
    expect(() => readXlsxWorkbook(EXTERNAL_XLSX)).not.toThrow();
  });

  it('has the same structural guarantees as the internal workbook', () => {
    const wb = readXlsxWorkbook(EXTERNAL_XLSX);
    expect(wb.sheets.length).toBeGreaterThan(0);
    for (const sheet of wb.sheets) {
      expect(typeof sheet.name).toBe('string');
      expect(Array.isArray(sheet.rows)).toBe(true);
    }
  });

  it('contains a transaction detail sheet', () => {
    const wb = readXlsxWorkbook(EXTERNAL_XLSX);
    const names = wb.sheets.map((s) => s.name.toLowerCase());
    const hasTxDetail = names.some((n) => n.includes('sales by cust'));
    expect(hasTxDetail).toBe(true);
  });

  it('all cells in all rows are strings', () => {
    const wb = readXlsxWorkbook(EXTERNAL_XLSX);
    for (const sheet of wb.sheets) {
      for (const row of sheet.rows) {
        for (const cell of row) {
          expect(typeof cell).toBe('string');
        }
      }
    }
  });
});
