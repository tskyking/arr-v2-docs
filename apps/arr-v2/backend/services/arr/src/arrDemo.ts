import { readXlsxWorkbook } from '../../imports/src/readers/xlsxXmlReader.js';
import { workbookToImportBundle } from '../../imports/src/workbookToBundle.js';
import { normalizeImportBundle } from '../../imports/src/normalizers.js';
import { recognizeAll } from './recognition.js';
import { buildMonthlySnapshots } from './snapshots.js';

const filePath = process.argv[2];
const workbook = readXlsxWorkbook(filePath);
const bundle = workbookToImportBundle(workbook);
const normalized = normalizeImportBundle(bundle);
const { segments, skipped } = recognizeAll(normalized.normalizedRows);

// Find date range from segments
const dates = segments.map(s => s.periodStart).sort();
const fromDate = dates[0];
const toDate = '2022-04-30';

const snapshots = buildMonthlySnapshots(segments, fromDate, toDate);

// Print last 12 months of ARR
const keys = [...snapshots.keys()].sort().slice(-12);
console.log('\n=== ARR by Month (last 12 periods) ===');
for (const key of keys) {
  const snap = snapshots.get(key)!;
  const arr = snap.totalArr.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  console.log(`  ${key}   ARR: ${arr.padStart(14)}   customers: ${snap.activeCustomerCount}`);
}

// Category breakdown for latest month
const latestKey = keys[keys.length - 1];
const latest = snapshots.get(latestKey)!;
console.log(`\n=== Category Breakdown (${latestKey}) ===`);
for (const [cat, arr] of Object.entries(latest.byCategory).sort((a, b) => b[1] - a[1])) {
  const formatted = arr.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  console.log(`  ${cat.padEnd(45)} ${formatted}`);
}

console.log(`\nTotal segments: ${segments.length} | Skipped: ${skipped.length}`);
