import { readXlsxWorkbook } from './readers/xlsxXmlReader';
import { workbookToImportBundle } from './workbookToBundle';
import { normalizeImportBundle } from './normalizers';

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: tsx demo.ts <path-to-xlsx>');
  process.exit(1);
}

const workbook = readXlsxWorkbook(filePath);
const bundle = workbookToImportBundle(workbook);
const normalized = normalizeImportBundle(bundle);

console.log(JSON.stringify({
  sheets: workbook.sheets.map((s) => s.name),
  transactionRows: bundle.transactionDetailRows.length,
  mappingRows: bundle.productServiceMappings.length,
  assumptionRows: bundle.recognitionAssumptions.length,
  aliasRows: bundle.aliasRows?.length ?? 0,
  normalizedRows: normalized.normalizedRows.length,
  reviewItems: normalized.reviewItems.length,
  sampleReviewItems: normalized.reviewItems.slice(0, 10),
}, null, 2));
