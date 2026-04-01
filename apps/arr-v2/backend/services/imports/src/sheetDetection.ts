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

function sheetHeaders(sheet: RawSheetTable): string[] {
  return sheet.rows.find((row) => row.some((cell) => String(cell).trim() !== '')) ?? [];
}

export function detectWorkbookSheets(workbook: RawWorkbook): DetectedWorkbookSheets {
  const detected: DetectedWorkbookSheets = {};

  for (const sheet of workbook.sheets) {
    const name = sheet.name.toLowerCase();

    // Find the actual header row (first row where all non-empty cells look like column labels)
    const headerRowIndex = sheet.rows.findIndex((row) =>
      row.some((c) => String(c).trim() !== '')
    );
    const headers = headerRowIndex >= 0 ? sheet.rows[headerRowIndex] : [];

    // --- Transaction detail: prefer internal (non-external) sheet ---
    if (!detected.transactionDetail && (
      (name.includes('sales by cust detail') || name.includes('sales by customer detail')) &&
      !name.includes('external')
    )) {
      detected.transactionDetail = sheet;
      continue;
    }

    // --- Product/service mappings: prefer explicit name match ---
    if (!detected.productServiceMappings && (
      name.includes('mapping to revenue type') ||
      name.includes('prodsvc mapping') ||
      name.includes('product/service mapping')
    )) {
      detected.productServiceMappings = sheet;
      continue;
    }

    // --- Recognition assumptions ---
    if (!detected.recognitionAssumptions && (
      name.includes('rev rec assumptions') ||
      name.includes('revenue recognition')
    )) {
      detected.recognitionAssumptions = sheet;
      continue;
    }

    // --- Alias/anonymizer mappings ---
    if (!detected.aliasMappings && (
      name.includes('anonymizer') ||
      includesAll(headers, ['customer from qb'])
    )) {
      detected.aliasMappings = sheet;
      continue;
    }
  }

  return detected;
}
