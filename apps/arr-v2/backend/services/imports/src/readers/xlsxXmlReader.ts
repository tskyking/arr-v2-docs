import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import { ImportError, wrapUnknownError } from '../importErrors.js';

export interface RawSheetTable {
  name: string;
  rows: string[][];
}

export interface RawWorkbook {
  sourcePath: string;
  sheets: RawSheetTable[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: false,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function getCellRef(cell: any): string {
  return cell?.['@_r'] ?? '';
}

function getColumnLetters(ref: string): string {
  return ref.replace(/[0-9]/g, '');
}

function columnLettersToIndex(letters: string): number {
  let result = 0;
  for (const ch of letters) {
    result = result * 26 + (ch.charCodeAt(0) - 64);
  }
  return Math.max(result - 1, 0);
}

function readSharedStrings(zip: AdmZip): string[] {
  const entry = zip.getEntry('xl/sharedStrings.xml');
  if (!entry) return [];

  const xml = zip.readAsText(entry, 'utf8');
  const parsed = parser.parse(xml);
  const sis = asArray(parsed?.sst?.si);

  return sis.map((si) => {
    if (typeof si?.t === 'string') return si.t;
    const runs = asArray(si?.r);
    return runs.map((r) => (typeof r?.t === 'string' ? r.t : '')).join('');
  });
}

function readWorkbookRels(zip: AdmZip): Map<string, string> {
  const entry = zip.getEntry('xl/_rels/workbook.xml.rels');
  if (!entry) throw new Error('Missing workbook relationships XML');
  const xml = zip.readAsText(entry, 'utf8');
  const parsed = parser.parse(xml);
  const rels = asArray(parsed?.Relationships?.Relationship);
  const map = new Map<string, string>();
  for (const rel of rels) {
    map.set(rel['@_Id'], rel['@_Target']);
  }
  return map;
}

function readSheetRows(zip: AdmZip, sheetPath: string, sharedStrings: string[]): string[][] {
  const entry = zip.getEntry(sheetPath);
  if (!entry) throw new Error(`Missing sheet XML: ${sheetPath}`);

  const xml = zip.readAsText(entry, 'utf8');
  const parsed = parser.parse(xml);
  const rows = asArray(parsed?.worksheet?.sheetData?.row);

  return rows.map((row) => {
    const cells = asArray(row?.c);
    const out: string[] = [];

    for (const cell of cells) {
      const ref = getCellRef(cell);
      const colIndex = columnLettersToIndex(getColumnLetters(ref));
      while (out.length <= colIndex) out.push('');

      let value = '';
      const cellType = cell?.['@_t'];
      if (cellType === 's') {
        const idx = Number(cell?.v ?? -1);
        value = Number.isInteger(idx) && idx >= 0 ? (sharedStrings[idx] ?? '') : '';
      } else if (cellType === 'inlineStr') {
        if (typeof cell?.is?.t === 'string') value = cell.is.t;
      } else if (typeof cell?.v === 'string' || typeof cell?.v === 'number') {
        value = String(cell.v);
      }

      out[colIndex] = value;
    }

    return out;
  });
}

export function readXlsxWorkbook(filePath: string): RawWorkbook {
  if (!fs.existsSync(filePath)) {
    throw new ImportError('FILE_NOT_FOUND');
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.xlsx') {
    throw new ImportError('UNSUPPORTED_FILE_TYPE', `Got: ${ext}`);
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(filePath);
  } catch (e) {
    throw new ImportError('FILE_UNREADABLE', e instanceof Error ? e.message : String(e));
  }
  const sharedStrings = readSharedStrings(zip);
  const relMap = readWorkbookRels(zip);

  const workbookEntry = zip.getEntry('xl/workbook.xml');
  if (!workbookEntry) throw new ImportError('FILE_UNREADABLE', 'Missing xl/workbook.xml — not a valid XLSX file');
  const workbookXml = zip.readAsText(workbookEntry, 'utf8');
  const workbookParsed = parser.parse(workbookXml);
  const sheets = asArray(workbookParsed?.workbook?.sheets?.sheet);

  const rawSheets: RawSheetTable[] = sheets.map((sheet) => {
    const rid = sheet['@_r:id'];
    const target = relMap.get(rid);
    if (!target) throw new Error(`Missing relationship target for sheet ${sheet['@_name']}`);
    // Normalize path: some XLSX generators use ../xl/ or bare worksheet names
    let sheetPath = target;
    if (sheetPath.startsWith('../')) sheetPath = sheetPath.replace(/^\.\.\//, '');
    if (!sheetPath.startsWith('xl/')) sheetPath = `xl/${sheetPath}`;
    return {
      name: sheet['@_name'],
      rows: readSheetRows(zip, sheetPath, sharedStrings),
    };
  });

  return { sourcePath: filePath, sheets: rawSheets };
}
