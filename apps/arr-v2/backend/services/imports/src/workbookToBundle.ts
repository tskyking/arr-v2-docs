import type { WorkbookImportBundle } from './types';
import type { RawSheetTable, RawWorkbook } from './readers/xlsxXmlReader';
import { detectWorkbookSheets } from './sheetDetection';

function notImplemented(name: string): never {
  throw new Error(`${name} is not implemented yet.`);
}

export function parseTransactionDetailSheet(_sheet: RawSheetTable) {
  return notImplemented('parseTransactionDetailSheet');
}

export function parseProductServiceMappingSheet(_sheet: RawSheetTable) {
  return notImplemented('parseProductServiceMappingSheet');
}

export function parseRecognitionAssumptionsSheet(_sheet: RawSheetTable) {
  return notImplemented('parseRecognitionAssumptionsSheet');
}

export function parseAliasSheet(_sheet: RawSheetTable) {
  return notImplemented('parseAliasSheet');
}

export function workbookToImportBundle(workbook: RawWorkbook): WorkbookImportBundle {
  const detected = detectWorkbookSheets(workbook);

  if (!detected.transactionDetail) {
    throw new Error('Could not detect transaction detail sheet.');
  }
  if (!detected.productServiceMappings) {
    throw new Error('Could not detect product/service mapping sheet.');
  }
  if (!detected.recognitionAssumptions) {
    throw new Error('Could not detect recognition assumptions sheet.');
  }

  return {
    transactionDetailRows: parseTransactionDetailSheet(detected.transactionDetail),
    productServiceMappings: parseProductServiceMappingSheet(detected.productServiceMappings),
    recognitionAssumptions: parseRecognitionAssumptionsSheet(detected.recognitionAssumptions),
    aliasRows: detected.aliasMappings ? parseAliasSheet(detected.aliasMappings) : undefined,
  };
}
