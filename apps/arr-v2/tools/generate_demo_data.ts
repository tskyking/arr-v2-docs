import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const WORKBOOK_PATH = join(ROOT, 'frontend/public/demo/arr-v2-demo-import.xlsx');
const OUT_PATH = join(ROOT, 'frontend/src/lib/demoData.ts');

const DEMO_IMPORT_ID = 'demo-q1-2026';
const DEMO_TENANT_ID = 'aurora-capital';
const DEMO_USER_EMAIL = 'analyst@auroracap.com';
const DEMO_IMPORTED_AT = '2026-04-27T22:30:00.000Z';
const DEMO_BASELINE_TO_DATE = '2026-04-30';
const DEMO_CUBE_FROM_DATE = '2026-01-01';

function stable(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"__DEMO_IMPORT_ID__"/g, 'DEMO_IMPORT_ID')
    .replace(/"__DEMO_TENANT_ID__"/g, 'DEMO_TENANT_ID')
    .replace(/"__DEMO_USER_EMAIL__"/g, 'DEMO_USER_EMAIL');
}

function roundMoney(n: number): number {
  return Number((n || 0).toFixed(2));
}

function rowsToCustomerList(result: any, periods: any[], reviewItems: any[]) {
  const latest = periods[periods.length - 1];
  const currentByCustomer = new Map((latest?.byCustomer ?? []).map((entry: any) => [entry.customer, entry.arr]));
  const meta = new Map<string, { requiresReview: boolean; lastInvoiceDate: string; activeContracts: number }>();

  for (const row of result.bundle.normalizedRows) {
    const name = row.siteName;
    if (!name) continue;
    const existing = meta.get(name) ?? { requiresReview: false, lastInvoiceDate: '', activeContracts: 0 };
    existing.requiresReview = existing.requiresReview || !!row.requiresReview || reviewItems.some((item: any) => item.customerName === name && item.status === 'open');
    if (!existing.lastInvoiceDate || row.invoiceDate > existing.lastInvoiceDate) existing.lastInvoiceDate = row.invoiceDate;
    if (row.subscriptionStartDate && row.subscriptionEndDate) existing.activeContracts += 1;
    meta.set(name, existing);
  }

  const customers = [...meta.entries()].map(([name, item]) => ({
    name,
    currentArr: roundMoney(Number(currentByCustomer.get(name) ?? 0)),
    activeContracts: item.activeContracts,
    lastInvoiceDate: item.lastInvoiceDate,
    requiresReview: item.requiresReview,
  })).sort((a, b) => b.currentArr - a.currentArr || a.name.localeCompare(b.name));

  return { customers, total: customers.length };
}

function rowsToCustomerDetails(customerList: any, periods: any[], reviewItems: any[]) {
  const details: Record<string, any> = {};

  for (const customer of customerList.customers) {
    const arrHistory = periods
      .map((period: any) => ({
        period: period.period,
        arr: roundMoney(Number(period.byCustomer.find((entry: any) => entry.customer === customer.name)?.arr ?? 0)),
      }))
      .filter((period: any) => period.arr > 0);
    const arrValues = arrHistory.map((period: any) => period.arr);
    details[customer.name] = {
      name: customer.name,
      currentArr: customer.currentArr,
      peakArr: arrValues.length ? Math.max(...arrValues) : customer.currentArr,
      firstSeenPeriod: arrHistory[0]?.period ?? '',
      lastActivePeriod: arrHistory[arrHistory.length - 1]?.period ?? '',
      arrHistory,
      requiresReview: customer.requiresReview,
      openReviewCount: reviewItems.filter((item: any) => item.customerName === customer.name && item.status === 'open').length,
    };
  }

  return details;
}

function asDemoImportId<T>(value: T): T {
  return JSON.parse(JSON.stringify(value).replaceAll(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g, '__DEMO_IMPORT_ID__'));
}

async function main() {
  const dataDir = mkdtempSync(join(tmpdir(), 'arr-v2-demo-data-'));
  process.env.DATA_DIR = dataDir;

  try {
    const service = await import('../backend/services/api/src/importService.ts');
    const result = service.processImport(DEMO_TENANT_ID, WORKBOOK_PATH);

  const summary = asDemoImportId(service.getImportSummary(DEMO_TENANT_ID, result.importId));
  summary.importedAt = DEMO_IMPORTED_AT;

  const timeseries = asDemoImportId(service.getArrTimeseries(DEMO_TENANT_ID, result.importId, result.fromDate, DEMO_BASELINE_TO_DATE));
  const movements = asDemoImportId(service.getArrMovements(DEMO_TENANT_ID, result.importId, result.fromDate, DEMO_BASELINE_TO_DATE));
  const reviewQueue = asDemoImportId(service.getReviewQueue(DEMO_TENANT_ID, result.importId));
  const reviewStats = asDemoImportId(service.getReviewStats(DEMO_TENANT_ID, result.importId));
  const customerCube = asDemoImportId(service.getCustomerCube(DEMO_TENANT_ID, result.importId, DEMO_CUBE_FROM_DATE, DEMO_BASELINE_TO_DATE));

  summary.importId = '__DEMO_IMPORT_ID__';
  timeseries.fromDate = result.fromDate;
  timeseries.toDate = DEMO_BASELINE_TO_DATE;
  movements.fromDate = result.fromDate;
  movements.toDate = DEMO_BASELINE_TO_DATE;
  reviewQueue.items = reviewQueue.items.map((item: any, index: number) => ({
    ...item,
    id: `rq-${String(index + 101).padStart(3, '0')}`,
    importId: '__DEMO_IMPORT_ID__',
  }));
  reviewStats.importId = '__DEMO_IMPORT_ID__';
  customerCube.importId = '__DEMO_IMPORT_ID__';

  const customerList = rowsToCustomerList(result, timeseries.periods, reviewQueue.items);
  const customerDetails = rowsToCustomerDetails(customerList, timeseries.periods, reviewQueue.items);

  const demoImports = [
    { importId: 'demo-q4-2025', importedAt: '2026-02-14T16:42:00.000Z', totalRows: 1042 },
    { importId: '__DEMO_IMPORT_ID__', importedAt: DEMO_IMPORTED_AT, totalRows: summary.totalRows },
  ];

  const out = `import type {\n  ArrMovementsResult,\n  ArrTimeseries,\n  CustomerCubeResult,\n  CustomerDetail,\n  CustomerListResult,\n  ImportListItem,\n  ImportSummary,\n  ReviewQueue,\n  ReviewStats,\n} from './api';\n\nexport const DEMO_IMPORT_ID = '${DEMO_IMPORT_ID}';\nexport const DEMO_TENANT_ID = '${DEMO_TENANT_ID}';\nexport const DEMO_USER_EMAIL = '${DEMO_USER_EMAIL}';\n\nexport const demoImports: ImportListItem[] = ${stable(demoImports)};\n\nexport const demoSummary: Record<string, ImportSummary> = {\n  [DEMO_IMPORT_ID]: ${stable(summary)},\n  'demo-q4-2025': {\n    importId: 'demo-q4-2025',\n    importedAt: '2026-02-14T16:42:00.000Z',\n    totalRows: 1042,\n    mappedRows: 1009,\n    reviewItems: 9,\n    skippedRows: 24,\n    categoryBreakdown: ${stable(summary.categoryBreakdown)},\n  },\n};\n\nexport const demoTimeseries: Record<string, ArrTimeseries> = {\n  [DEMO_IMPORT_ID]: ${stable(timeseries)},\n  'demo-q4-2025': { fromDate: '2025-01-01', toDate: '2025-12-31', periods: [] },\n};\n\nexport const demoMovements: Record<string, ArrMovementsResult> = {\n  [DEMO_IMPORT_ID]: ${stable(movements)},\n  'demo-q4-2025': {\n    fromDate: '2025-01-01',\n    toDate: '2025-12-31',\n    totalNewArr: 0,\n    totalExpansionArr: 0,\n    totalContractionArr: 0,\n    totalChurnArr: 0,\n    totalNetMovement: 0,\n    movements: [],\n  },\n};\n\nexport const demoReviewQueue: Record<string, ReviewQueue> = {\n  [DEMO_IMPORT_ID]: ${stable(reviewQueue)},\n  'demo-q4-2025': { items: [], total: 0, openCount: 0, resolvedCount: 0 },\n};\n\nexport const demoReviewItems = demoReviewQueue[DEMO_IMPORT_ID].items;\n\nexport const demoReviewStats: Record<string, ReviewStats> = {\n  [DEMO_IMPORT_ID]: ${stable(reviewStats)},\n  'demo-q4-2025': {\n    importId: 'demo-q4-2025',\n    total: 0,\n    openCount: 0,\n    resolvedCount: 0,\n    overriddenCount: 0,\n    errorCount: 0,\n    warningCount: 0,\n    openByReasonCode: [],\n    openBySeverity: [],\n    topCustomersWithIssues: [],\n    allResolved: true,\n  },\n};\n\nexport const demoCustomers: Record<string, CustomerListResult> = {\n  [DEMO_IMPORT_ID]: ${stable(customerList)},\n  'demo-q4-2025': { total: 0, customers: [] },\n};\n\nexport const demoCustomerDetails: Record<string, Record<string, CustomerDetail>> = {\n  [DEMO_IMPORT_ID]: ${stable(customerDetails)},\n};\n\nexport const demoCustomerCube: CustomerCubeResult = ${stable(customerCube)};\n\nexport function isStaticDemoEnvironment(): boolean {\n  if (typeof window === 'undefined') return false;\n  return window.location.hostname.endsWith('github.io') || window.location.search.includes('demo=1');\n}\n\nexport function isDemoImportId(importId?: string): boolean {\n  return !!importId && importId.startsWith('demo-');\n}\n\nexport function getDemoCustomerDetail(importId: string, customerName: string): CustomerDetail {\n  const detail = demoCustomerDetails[importId]?.[customerName];\n  if (detail) return detail;\n\n  const customer = demoCustomers[importId]?.customers.find(entry => entry.name === customerName);\n  return {\n    name: customerName,\n    currentArr: customer?.currentArr ?? 0,\n    peakArr: customer?.currentArr ?? 0,\n    firstSeenPeriod: '',\n    lastActivePeriod: '',\n    arrHistory: demoTimeseries[importId]?.periods\n      .map(period => ({\n        period: period.period,\n        arr: period.byCustomer.find(entry => entry.customer === customerName)?.arr ?? 0,\n      }))\n      .filter(period => period.arr > 0) ?? [],\n    requiresReview: customer?.requiresReview ?? false,\n    openReviewCount: demoReviewItems.filter(item => item.customerName === customerName && item.status === 'open').length,\n  };\n}\n`;

  writeFileSync(OUT_PATH, out);
  console.log(`Generated demo data from ${WORKBOOK_PATH} -> ${OUT_PATH}`);
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
