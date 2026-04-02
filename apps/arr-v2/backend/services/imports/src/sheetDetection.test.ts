import { describe, it, expect } from 'vitest';
import { detectWorkbookSheets } from './sheetDetection.js';
import type { RawWorkbook, RawSheetTable } from './readers/xlsxXmlReader.js';

function makeSheet(name: string, rows: string[][] = []): RawSheetTable {
  return { name, rows };
}

function makeWorkbook(sheets: RawSheetTable[]): RawWorkbook {
  return { sourcePath: '/fake/path.xlsx', sheets };
}

describe('detectWorkbookSheets', () => {
  describe('transactionDetail detection', () => {
    it('detects "sales by cust detail" sheet', () => {
      const wb = makeWorkbook([makeSheet('Sales by Cust Detail')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeDefined();
      expect(detected.transactionDetail!.name).toBe('Sales by Cust Detail');
    });

    it('detects "sales by customer detail" sheet', () => {
      const wb = makeWorkbook([makeSheet('Sales by Customer Detail')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeDefined();
    });

    it('accepts "external" transaction detail sheets as fallback (Bug #6 fix)', () => {
      // When only the external sheet is present (customer-facing workbook format),
      // it should be accepted rather than rejected. Bug #6 was a hard-reject that
      // made external workbooks completely unprocessable.
      const wb = makeWorkbook([makeSheet('Sales by Cust Detail External')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeDefined();
      expect(detected.transactionDetail!.name).toBe('Sales by Cust Detail External');
    });

    it('prefers internal over external when both present', () => {
      const internal = makeSheet('Sales by Cust Detail');
      const external = makeSheet('Sales by Cust Detail External');
      const wb = makeWorkbook([external, internal]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail!.name).toBe('Sales by Cust Detail');
    });

    it('is case-insensitive', () => {
      const wb = makeWorkbook([makeSheet('SALES BY CUST DETAIL')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeDefined();
    });
  });

  describe('productServiceMappings detection', () => {
    it('detects "mapping to revenue type" sheet', () => {
      const wb = makeWorkbook([makeSheet('Mapping to Revenue Type')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.productServiceMappings).toBeDefined();
    });

    it('detects "prodsvc mapping" sheet', () => {
      const wb = makeWorkbook([makeSheet('ProdSvc Mapping')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.productServiceMappings).toBeDefined();
    });

    it('detects "product/service mapping" sheet', () => {
      const wb = makeWorkbook([makeSheet('Product/Service Mapping')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.productServiceMappings).toBeDefined();
    });
  });

  describe('recognitionAssumptions detection', () => {
    it('detects "rev rec assumptions" sheet', () => {
      const wb = makeWorkbook([makeSheet('Rev Rec Assumptions')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.recognitionAssumptions).toBeDefined();
    });

    it('detects "revenue recognition" sheet', () => {
      const wb = makeWorkbook([makeSheet('Revenue Recognition')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.recognitionAssumptions).toBeDefined();
    });
  });

  describe('aliasMappings detection', () => {
    it('detects "anonymizer" sheet by name', () => {
      const wb = makeWorkbook([makeSheet('Anonymizer')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.aliasMappings).toBeDefined();
    });

    it('detects alias sheet by header "customer from qb"', () => {
      const sheet = makeSheet('Some Other Name', [
        ['Customer From QB', 'Customer', 'Product/Service per QB', 'Product/Service'],
        ['Acme LLC', 'Site A', 'Widget Pro', 'Widget'],
      ]);
      const wb = makeWorkbook([sheet]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.aliasMappings).toBeDefined();
    });
  });

  describe('empty and edge cases', () => {
    it('returns all undefined for empty workbook', () => {
      const wb = makeWorkbook([]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeUndefined();
      expect(detected.productServiceMappings).toBeUndefined();
      expect(detected.recognitionAssumptions).toBeUndefined();
      expect(detected.aliasMappings).toBeUndefined();
    });

    it('returns all undefined for workbook with unrelated sheets', () => {
      const wb = makeWorkbook([makeSheet('Summary'), makeSheet('Notes'), makeSheet('Dashboard')]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeUndefined();
      expect(detected.productServiceMappings).toBeUndefined();
    });

    it('handles sheet with blank header row (only assigns first non-blank row)', () => {
      const sheet = makeSheet('Anonymizer', [
        ['', '', ''],
        ['Customer From QB', 'Customer', 'Product/Service'],
      ]);
      const wb = makeWorkbook([sheet]);
      const detected = detectWorkbookSheets(wb);
      // Name match takes precedence, sheet should still be detected
      expect(detected.aliasMappings).toBeDefined();
    });

    it('does not duplicate assignments when one sheet matches multiple patterns', () => {
      // "Rev Rec Assumptions Mapping to Revenue Type" — unusual but possible
      const wb = makeWorkbook([
        makeSheet('Sales by Cust Detail'),
        makeSheet('Mapping to Revenue Type'),
        makeSheet('Rev Rec Assumptions'),
        makeSheet('Anonymizer'),
      ]);
      const detected = detectWorkbookSheets(wb);
      expect(detected.transactionDetail).toBeDefined();
      expect(detected.productServiceMappings).toBeDefined();
      expect(detected.recognitionAssumptions).toBeDefined();
      expect(detected.aliasMappings).toBeDefined();
    });
  });
});
