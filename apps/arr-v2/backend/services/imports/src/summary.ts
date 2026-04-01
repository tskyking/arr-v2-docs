import { readXlsxWorkbook } from './readers/xlsxXmlReader.js';
import { workbookToImportBundle } from './workbookToBundle.js';
import { normalizeImportBundle } from './normalizers.js';

const filePath = process.argv[2];
const workbook = readXlsxWorkbook(filePath);
const bundle = workbookToImportBundle(workbook);
const normalized = normalizeImportBundle(bundle);

// Summarize by category
const categoryTotals = new Map<string, { count: number; amount: number }>();
const unmapped: string[] = [];

for (const row of normalized.normalizedRows) {
  const cat = row.recognizedCategory ?? '__unmapped__';
  const existing = categoryTotals.get(cat) ?? { count: 0, amount: 0 };
  existing.count++;
  existing.amount += row.amount;
  categoryTotals.set(cat, existing);
  if (!row.recognizedCategory) unmapped.push(row.productService);
}

// Summarize review reasons
const reasonCounts = new Map<string, number>();
for (const item of normalized.reviewItems) {
  reasonCounts.set(item.reasonCode, (reasonCounts.get(item.reasonCode) ?? 0) + 1);
}

// Top unmapped product/services
const unmappedCounts = new Map<string, number>();
for (const p of unmapped) {
  unmappedCounts.set(p, (unmappedCounts.get(p) ?? 0) + 1);
}

console.log('\n=== IMPORT SUMMARY ===');
console.log(`Total transaction rows: ${normalized.normalizedRows.length}`);
console.log(`Total review flags:     ${normalized.reviewItems.length}`);
console.log(`Rows needing review:    ${normalized.normalizedRows.filter(r => r.requiresReview).length}`);

console.log('\n--- Revenue by Category ---');
for (const [cat, { count, amount }] of [...categoryTotals.entries()].sort((a, b) => b[1].amount - a[1].amount)) {
  console.log(`  ${cat.padEnd(45)} rows: ${String(count).padStart(5)}   amount: $${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).padStart(12)}`);
}

console.log('\n--- Review Flag Breakdown ---');
for (const [reason, count] of [...reasonCounts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason.padEnd(50)} ${count}`);
}

console.log('\n--- Top Unmapped Product/Services ---');
const topUnmapped = [...unmappedCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [p, count] of topUnmapped) {
  console.log(`  ${String(count).padStart(4)}x  ${p}`);
}
