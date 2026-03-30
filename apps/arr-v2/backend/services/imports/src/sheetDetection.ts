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
    const headers = sheetHeaders(sheet);

    if (!detected.transactionDetail && (
      name.includes('sales by cust detail') ||
      name.includes('sales by customer detail') ||
      includesAll(headers, ['customer', 'product/service', 'amount'])
    )) {
      detected.transactionDetail = sheet;
      continue;
    }

    if (!detected.productServiceMappings && (
      name.includes('mapping to revenue type') ||
      (includesAll(headers, ['product/service']) && headers.length > 2)
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
      (includesAll(headers, ['customer from qb', 'customer', 'product/service']) )
    )) {
      detected.aliasMappings = sheet;
      continue;
    }
  }

  return detected;
}
