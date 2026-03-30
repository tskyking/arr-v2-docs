import fs from 'node:fs';
import path from 'node:path';
import { unzipSync } from 'node:zlib';

// Minimal placeholder note:
// Real XLSX support usually uses a library, but this project skeleton keeps the
// workbook-reading boundary explicit before dependency choice is finalized.

export interface RawSheetTable {
  name: string;
  rows: string[][];
}

export interface RawWorkbook {
  sourcePath: string;
  sheets: RawSheetTable[];
}

/**
 * Placeholder boundary for future XLSX reading.
 * For now this throws intentionally so the integration point is explicit.
 */
export function readXlsxWorkbook(filePath: string): RawWorkbook {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Workbook not found: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.xlsx') {
    throw new Error(`Unsupported workbook extension: ${ext}`);
  }

  throw new Error('readXlsxWorkbook is not implemented yet. Next step: choose XLSX parser dependency or implement zip/xml reader.');
}
