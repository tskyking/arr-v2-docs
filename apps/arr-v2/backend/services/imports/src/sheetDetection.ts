import type { RawWorkbook, RawSheetTable } from './readers/xlsxXmlReader';

export interface DetectedWorkbookSheets {
  transactionDetail?: RawSheetTable;
  productServiceMappings?: RawSheetTable;
  recognitionAssumptions?: RawSheetTable;
  aliasMappings?: RawSheetTable;
}

function includesAll(headers: string[], required: string[]): boolean {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return required.every((item) => normalized.includes(item.trim().toLowerCase()));
}

/**
 * Find the first non-empty row in a sheet (the likely header row).
 * Scans up to 10 rows to skip title/date rows at the top of QB exports.
 */
function findHeaderRow(sheet: RawSheetTable): string[] {
  for (let i = 0; i < Math.min(10, sheet.rows.length); i++) {
    const row = sheet.rows[i];
    if (row.some((cell) => String(cell).trim() !== '')) return row;
  }
  return [];
}

/**
 * Find the actual column-header row — the first row that contains
 * recognizable column names (customer, product/service, amount, etc).
 */
function findColumnHeaderRow(sheet: RawSheetTable): string[] {
  for (let i = 0; i < Math.min(15, sheet.rows.length); i++) {
    const row = sheet.rows[i];
    const normalized = row.map((c) => String(c).trim().toLowerCase());
    if (
      normalized.includes('customer') &&
      (normalized.includes('product/service') || normalized.includes('amount'))
    ) {
      return row;
    }
  }
  return [];
}

/**
 * Detect whether a sheet looks like a transaction detail sheet by structure.
 * Checks for required columns regardless of sheet name.
 */
function isTransactionDetailByStructure(sheet: RawSheetTable): boolean {
  const headerRow = findColumnHeaderRow(sheet);
  return includesAll(headerRow, ['customer', 'product/service', 'amount']);
}

/**
 * Detect whether a sheet looks like a product/service mapping sheet by structure.
 */
function isProductServiceMappingByStructure(sheet: RawSheetTable): boolean {
  const headerRow = findHeaderRow(sheet);
  // Must have 'product/service' and at least one category-flag column
  const normalized = headerRow.map((h) => String(h).trim().toLowerCase());
  return normalized.includes('product/service') && headerRow.length >= 3;
}

/**
 * Detect whether a sheet looks like a recognition assumptions sheet by structure.
 * Rows have: empty col 0, category name in col 1, rule text in col 2.
 */
function isRecognitionAssumptionsByStructure(sheet: RawSheetTable): boolean {
  let ruleRows = 0;
  for (const row of sheet.rows.slice(0, 10)) {
    const col1 = String(row[1] ?? '').trim();
    const col2 = String(row[2] ?? '').trim();
    if (col1 && col2 && col2.toLowerCase().includes('revenue')) ruleRows++;
  }
  return ruleRows >= 1;
}

export function detectWorkbookSheets(workbook: RawWorkbook): DetectedWorkbookSheets {
  const detected: DetectedWorkbookSheets = {};

  // ── Pass 1: name-based hints (fast, high confidence) ────────────────────────
  // When a workbook contains both internal and external transaction sheets,
  // prefer the internal one. But do NOT hard-reject any sheet — pass 2 catches
  // anything missed here using content/structure detection.

  for (const sheet of workbook.sheets) {
    const name = sheet.name.toLowerCase();

    if (
      name.includes('sales by cust detail') ||
      name.includes('sales by customer detail')
    ) {
      // Prefer internal over external: accept any match, but upgrade to internal
      // if we previously only had an external match.
      const isExternal = name.includes('external');
      const currentIsExternal = detected.transactionDetail
        ? detected.transactionDetail.name.toLowerCase().includes('external')
        : false;
      if (!detected.transactionDetail || (currentIsExternal && !isExternal)) {
        detected.transactionDetail = sheet;
      }
      continue;
    }

    if (!detected.productServiceMappings && (
      name.includes('mapping to revenue type') ||
      name.includes('prodsvc mapping') ||
      name.includes('product/service mapping')
    )) {
      detected.productServiceMappings = sheet;
      continue;
    }

    if (!detected.recognitionAssumptions && (
      name.includes('rev rec assumptions') ||
      name.includes('revenue recognition')
    )) {
      detected.recognitionAssumptions = sheet;
      continue;
    }

    if (!detected.aliasMappings && (
      name.includes('anonymizer') ||
      name.includes('alias')
    )) {
      detected.aliasMappings = sheet;
      continue;
    }
  }

  // ── Pass 2: content/structure fallback ─────────────────────────────────────
  // For any slot not yet filled, scan remaining sheets by content.
  // This handles arbitrary sheet names from any XLSX generator.

  for (const sheet of workbook.sheets) {
    // Check alias mapping first — 'customer from qb' header is highly specific and
    // must take priority before generic product/service mapping detection fires.
    if (!detected.aliasMappings) {
      const headerRow = findHeaderRow(sheet);
      if (includesAll(headerRow, ['customer from qb'])) {
        detected.aliasMappings = sheet;
        continue;
      }
    }

    if (!detected.transactionDetail && isTransactionDetailByStructure(sheet)) {
      detected.transactionDetail = sheet;
      continue;
    }

    if (!detected.productServiceMappings && isProductServiceMappingByStructure(sheet)) {
      // Exclude sheets already detected as other types
      if (sheet !== detected.transactionDetail && sheet !== detected.aliasMappings) {
        detected.productServiceMappings = sheet;
        continue;
      }
    }

    if (!detected.recognitionAssumptions && isRecognitionAssumptionsByStructure(sheet)) {
      if (sheet !== detected.transactionDetail && sheet !== detected.productServiceMappings) {
        detected.recognitionAssumptions = sheet;
        continue;
      }
    }
  }

  return detected;
}
