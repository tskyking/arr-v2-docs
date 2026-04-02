import type { WorkbookImportBundle, TransactionDetailRow, ProductServiceMappingRow, RecognitionAssumptionRow } from './types';
import type { RawSheetTable, RawWorkbook } from './readers/xlsxXmlReader';
import { detectWorkbookSheets } from './sheetDetection';
import { parseDateLike, parseNumber } from './utils';
import { ImportError, wrapUnknownError } from './importErrors.js';

function findHeaderRowIndex(rows: string[][], requiredHeaders: string[]): number {
  return rows.findIndex((row) => {
    const normalized = row.map((c) => String(c).trim().toLowerCase());
    return requiredHeaders.every((h) => normalized.includes(h.toLowerCase()));
  });
}

function buildHeaderIndex(row: string[]): Map<string, number> {
  const map = new Map<string, number>();
  row.forEach((value, index) => map.set(String(value).trim().toLowerCase(), index));
  return map;
}

function getCell(row: string[], headerMap: Map<string, number>, ...names: string[]): string {
  for (const name of names) {
    const idx = headerMap.get(name.toLowerCase());
    if (idx !== undefined) return row[idx] ?? '';
  }
  return '';
}

export function parseTransactionDetailSheet(sheet: RawSheetTable): TransactionDetailRow[] {
  // Transaction sheets may have title rows at top before the real column header
  // Find the header row by looking for a row containing 'customer' AND 'product/service'
  const headerIndex = findHeaderRowIndex(sheet.rows, ['customer', 'product/service']);
  if (headerIndex < 0) throw new ImportError('TRANSACTION_HEADER_NOT_FOUND');
  const headers = buildHeaderIndex(sheet.rows[headerIndex]);
  const dataRows = sheet.rows.slice(headerIndex + 1).filter((row) => {
    // Skip rows where the customer cell is empty — those are subtotal/blank spacer rows
    const customerIdx = headers.get('customer');
    const val = customerIdx !== undefined ? String(row[customerIdx] ?? '').trim() : '';
    return val !== '';
  });

  return dataRows.map((row, i) => ({
    customerName: getCell(row, headers, 'customer'),
    invoiceDate: getCell(row, headers, 'date', 'invoice date'),
    transactionType: getCell(row, headers, 'transaction type'),
    invoiceNumber: getCell(row, headers, 'num', 'invoice number'),
    productService: getCell(row, headers, 'product/service'),
    memoDescription: getCell(row, headers, 'memo/description') || undefined,
    quantity: parseNumber(getCell(row, headers, 'qty')) ?? 0,
    salesPrice: parseNumber(getCell(row, headers, 'sales price')) ?? 0,
    amount: parseNumber(getCell(row, headers, 'amount')) ?? 0,
    subscriptionStartDate: parseDateLike(getCell(row, headers, 'subscription start date')),
    subscriptionEndDate: parseDateLike(getCell(row, headers, 'subscription end date')),
    account: getCell(row, headers, 'account') || undefined,
    className: getCell(row, headers, 'class') || undefined,
    balance: parseNumber(getCell(row, headers, 'balance')),
    sourceRowNumber: headerIndex + i + 2,
  }));
}

export function parseProductServiceMappingSheet(sheet: RawSheetTable): ProductServiceMappingRow[] {
  const headerIndex = findHeaderRowIndex(sheet.rows, ['product/service']);
  if (headerIndex < 0) throw new Error('Could not locate product/service mapping header row');
  const headerRow = sheet.rows[headerIndex];
  const headers = buildHeaderIndex(headerRow);
  const categoryHeaders = headerRow.filter((h) => String(h).trim() !== '' && String(h).trim().toLowerCase() !== 'product/service');
  const dataRows = sheet.rows.slice(headerIndex + 1).filter((row) => row.some((c) => String(c).trim() !== ''));

  return dataRows.map((row, i) => {
    const productService = getCell(row, headers, 'product/service');
    const categoryFlags: Record<string, boolean> = {};
    for (const category of categoryHeaders) {
      const value = getCell(row, headers, category);
      categoryFlags[category] = String(value).trim().toLowerCase() === 'yes';
    }
    const resolved = Object.entries(categoryFlags).filter(([, v]) => v).map(([k]) => k);
    return {
      productService,
      categoryFlags,
      resolvedPrimaryCategory: resolved.length === 1 ? resolved[0] : undefined,
      sourceRowNumber: headerIndex + i + 2,
    };
  });
}

// Known header/title values that should not be treated as assumption data rows
const ASSUMPTION_HEADER_STRINGS = new Set([
  'revenue recognition period assumptions',
  'category',
  'rule',
  'revenue category',
  'recognition rule',
]);

export function parseRecognitionAssumptionsSheet(sheet: RawSheetTable): RecognitionAssumptionRow[] {
  // Structure: row 0 is a title row with empty col 0 and header text in col 1
  // Data rows: col 0 is empty, col 1 is category name, col 2 is rule text
  const dataRows = sheet.rows.filter((row) => {
    const col1 = String(row[1] ?? '').trim();
    const col2 = String(row[2] ?? '').trim();
    if (col1 === '' || col2 === '') return false;
    // Skip rows that look like header/title rows
    if (ASSUMPTION_HEADER_STRINGS.has(col1.toLowerCase())) return false;
    if (ASSUMPTION_HEADER_STRINGS.has(col2.toLowerCase())) return false;
    return true;
  });

  return dataRows.map((row, i) => {
    const categoryName = String(row[1] ?? '').trim();
    const rawRuleText = String(row[2] ?? '').trim();
    let resolvedRuleType: string | undefined;
    const lower = rawRuleText.toLowerCase();
    if (lower.includes('subscription start date') && lower.includes('subscription end date')) {
      resolvedRuleType = 'subscription_term';
    } else if (lower.includes('one year') && lower.includes('invoice date')) {
      resolvedRuleType = 'fallback_one_year_from_invoice';
    } else if (lower.includes('three years') && lower.includes('invoice date')) {
      resolvedRuleType = 'fixed_36_months_from_invoice';
    } else if (lower.includes('all revenue on the invoice date')) {
      resolvedRuleType = 'invoice_date_immediate';
    }
    return {
      categoryName,
      rawRuleText,
      resolvedRuleType,
      sourceRowNumber: i + 2,
    };
  });
}

export function parseAliasSheet(sheet: RawSheetTable): Record<string, string>[] {
  const headerIndex = findHeaderRowIndex(sheet.rows, ['customer from qb', 'customer', 'product/service']);
  if (headerIndex < 0) return [];
  const headers = sheet.rows[headerIndex];
  const dataRows = sheet.rows.slice(headerIndex + 1).filter((row) => row.some((c) => String(c).trim() !== ''));
  return dataRows.map((row) => {
    const out: Record<string, string> = {};
    headers.forEach((header, idx) => {
      const key = String(header ?? '').trim();
      if (key) out[key] = String(row[idx] ?? '').trim();
    });
    return out;
  });
}

export function workbookToImportBundle(workbook: RawWorkbook): WorkbookImportBundle {
  const detected = detectWorkbookSheets(workbook);

  if (!detected.transactionDetail) throw new ImportError('MISSING_TRANSACTION_SHEET');
  if (!detected.productServiceMappings) throw new ImportError('MISSING_MAPPING_SHEET');
  if (!detected.recognitionAssumptions) throw new ImportError('MISSING_ASSUMPTIONS_SHEET');

  return {
    transactionDetailRows: parseTransactionDetailSheet(detected.transactionDetail),
    productServiceMappings: parseProductServiceMappingSheet(detected.productServiceMappings),
    recognitionAssumptions: parseRecognitionAssumptionsSheet(detected.recognitionAssumptions),
    aliasRows: detected.aliasMappings ? parseAliasSheet(detected.aliasMappings) : undefined,
  };
}
