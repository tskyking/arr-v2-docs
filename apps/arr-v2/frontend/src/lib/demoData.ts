import type {
  ArrMovementsResult,
  ArrTimeseries,
  CustomerDetail,
  CustomerListResult,
  ImportListItem,
  ImportSummary,
  ReviewItem,
  ReviewQueue,
  ReviewStats,
} from './api';

export const DEMO_IMPORT_ID = 'demo-q1-2026';
export const DEMO_TENANT_ID = 'aurora-capital';
export const DEMO_USER_EMAIL = 'analyst@auroracap.com';

export const demoImports: ImportListItem[] = [
  {
    importId: 'demo-q4-2025',
    importedAt: '2026-02-14T16:42:00.000Z',
    totalRows: 1042,
  },
  {
    importId: 'demo-q1-2026',
    importedAt: '2026-04-02T15:18:00.000Z',
    totalRows: 1187,
  },
];

const categoryBreakdown = [
  { category: 'Subscription', rowCount: 732, totalAmount: 5_460_200 },
  { category: 'Services', rowCount: 211, totalAmount: 792_800 },
  { category: 'Usage', rowCount: 156, totalAmount: 428_600 },
  { category: 'Credits / Adjustments', rowCount: 88, totalAmount: -93_400 },
];

export const demoSummary: Record<string, ImportSummary> = {
  'demo-q1-2026': {
    importId: 'demo-q1-2026',
    importedAt: '2026-04-02T15:18:00.000Z',
    totalRows: 1187,
    mappedRows: 1138,
    reviewItems: 14,
    skippedRows: 35,
    categoryBreakdown,
  },
  'demo-q4-2025': {
    importId: 'demo-q4-2025',
    importedAt: '2026-02-14T16:42:00.000Z',
    totalRows: 1042,
    mappedRows: 1009,
    reviewItems: 9,
    skippedRows: 24,
    categoryBreakdown,
  },
};

export const demoTimeseries: Record<string, ArrTimeseries> = {
  'demo-q1-2026': {
    fromDate: '2025-04-01',
    toDate: '2026-03-31',
    periods: [
      { period: '2025-04', asOf: '2025-04-30', totalArr: 4_180_000, activeCustomers: 71, byCategory: [{ category: 'Subscription', arr: 3_520_000 }, { category: 'Services', arr: 460_000 }, { category: 'Usage', arr: 200_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 402_000 }, { customer: 'Apex Retail Group', arr: 366_000 }, { customer: 'Harbor Logistics', arr: 291_000 }] },
      { period: '2025-05', asOf: '2025-05-31', totalArr: 4_260_000, activeCustomers: 72, byCategory: [{ category: 'Subscription', arr: 3_590_000 }, { category: 'Services', arr: 468_000 }, { category: 'Usage', arr: 202_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 408_000 }, { customer: 'Apex Retail Group', arr: 370_000 }, { customer: 'Harbor Logistics', arr: 295_000 }] },
      { period: '2025-06', asOf: '2025-06-30', totalArr: 4_410_000, activeCustomers: 74, byCategory: [{ category: 'Subscription', arr: 3_690_000 }, { category: 'Services', arr: 490_000 }, { category: 'Usage', arr: 230_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 418_000 }, { customer: 'Apex Retail Group', arr: 381_000 }, { customer: 'Harbor Logistics', arr: 308_000 }] },
      { period: '2025-07', asOf: '2025-07-31', totalArr: 4_520_000, activeCustomers: 75, byCategory: [{ category: 'Subscription', arr: 3_770_000 }, { category: 'Services', arr: 495_000 }, { category: 'Usage', arr: 255_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 420_000 }, { customer: 'Apex Retail Group', arr: 389_000 }, { customer: 'Harbor Logistics', arr: 314_000 }] },
      { period: '2025-08', asOf: '2025-08-31', totalArr: 4_660_000, activeCustomers: 77, byCategory: [{ category: 'Subscription', arr: 3_870_000 }, { category: 'Services', arr: 514_000 }, { category: 'Usage', arr: 276_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 433_000 }, { customer: 'Apex Retail Group', arr: 401_000 }, { customer: 'Harbor Logistics', arr: 325_000 }] },
      { period: '2025-09', asOf: '2025-09-30', totalArr: 4_790_000, activeCustomers: 79, byCategory: [{ category: 'Subscription', arr: 3_965_000 }, { category: 'Services', arr: 528_000 }, { category: 'Usage', arr: 297_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 439_000 }, { customer: 'Apex Retail Group', arr: 412_000 }, { customer: 'Harbor Logistics', arr: 334_000 }] },
      { period: '2025-10', asOf: '2025-10-31', totalArr: 4_880_000, activeCustomers: 80, byCategory: [{ category: 'Subscription', arr: 4_020_000 }, { category: 'Services', arr: 545_000 }, { category: 'Usage', arr: 315_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 444_000 }, { customer: 'Apex Retail Group', arr: 419_000 }, { customer: 'Harbor Logistics', arr: 339_000 }] },
      { period: '2025-11', asOf: '2025-11-30', totalArr: 5_010_000, activeCustomers: 82, byCategory: [{ category: 'Subscription', arr: 4_115_000 }, { category: 'Services', arr: 557_000 }, { category: 'Usage', arr: 338_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 452_000 }, { customer: 'Apex Retail Group', arr: 431_000 }, { customer: 'Harbor Logistics', arr: 347_000 }] },
      { period: '2025-12', asOf: '2025-12-31', totalArr: 5_150_000, activeCustomers: 84, byCategory: [{ category: 'Subscription', arr: 4_225_000 }, { category: 'Services', arr: 570_000 }, { category: 'Usage', arr: 355_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 458_000 }, { customer: 'Apex Retail Group', arr: 446_000 }, { customer: 'Harbor Logistics', arr: 356_000 }] },
      { period: '2026-01', asOf: '2026-01-31', totalArr: 5_290_000, activeCustomers: 86, byCategory: [{ category: 'Subscription', arr: 4_338_000 }, { category: 'Services', arr: 584_000 }, { category: 'Usage', arr: 368_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 466_000 }, { customer: 'Apex Retail Group', arr: 454_000 }, { customer: 'Harbor Logistics', arr: 361_000 }] },
      { period: '2026-02', asOf: '2026-02-28', totalArr: 5_430_000, activeCustomers: 88, byCategory: [{ category: 'Subscription', arr: 4_450_000 }, { category: 'Services', arr: 593_000 }, { category: 'Usage', arr: 387_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 476_000 }, { customer: 'Apex Retail Group', arr: 462_000 }, { customer: 'Harbor Logistics', arr: 372_000 }] },
      { period: '2026-03', asOf: '2026-03-31', totalArr: 5_610_000, activeCustomers: 91, byCategory: [{ category: 'Subscription', arr: 4_603_000 }, { category: 'Services', arr: 602_000 }, { category: 'Usage', arr: 405_000 }], byCustomer: [{ customer: 'Northstar Health', arr: 488_000 }, { customer: 'Apex Retail Group', arr: 474_000 }, { customer: 'Harbor Logistics', arr: 381_000 }, { customer: 'Beacon Education', arr: 328_000 }, { customer: 'Summit Workforce', arr: 301_000 }, { customer: 'Riverbank Clinics', arr: 287_000 }, { customer: 'Blue Harbor Media', arr: 264_000 }, { customer: 'Granite Foods', arr: 248_000 }] },
    ],
  },
  'demo-q4-2025': {
    fromDate: '2025-01-01',
    toDate: '2025-12-31',
    periods: [],
  },
};

export const demoMovements: Record<string, ArrMovementsResult> = {
  'demo-q1-2026': {
    fromDate: '2025-04-01',
    toDate: '2026-03-31',
    totalNewArr: 712_000,
    totalExpansionArr: 981_000,
    totalContractionArr: 152_000,
    totalChurnArr: 111_000,
    totalNetMovement: 1_430_000,
    movements: [
      { period: '2025-04', openingArr: 4_020_000, newArr: 88_000, expansionArr: 112_000, contractionArr: 24_000, churnArr: 16_000, closingArr: 4_180_000, netMovement: 160_000, newCustomers: 2, churnedCustomers: 1, expandedCustomers: 7, contractedCustomers: 2 },
      { period: '2025-05', openingArr: 4_180_000, newArr: 43_000, expansionArr: 74_000, contractionArr: 21_000, churnArr: 16_000, closingArr: 4_260_000, netMovement: 80_000, newCustomers: 1, churnedCustomers: 1, expandedCustomers: 4, contractedCustomers: 2 },
      { period: '2025-06', openingArr: 4_260_000, newArr: 52_000, expansionArr: 125_000, contractionArr: 17_000, churnArr: 10_000, closingArr: 4_410_000, netMovement: 150_000, newCustomers: 1, churnedCustomers: 0, expandedCustomers: 6, contractedCustomers: 1 },
      { period: '2025-07', openingArr: 4_410_000, newArr: 36_000, expansionArr: 92_000, contractionArr: 18_000, churnArr: 0, closingArr: 4_520_000, netMovement: 110_000, newCustomers: 1, churnedCustomers: 0, expandedCustomers: 5, contractedCustomers: 2 },
      { period: '2025-08', openingArr: 4_520_000, newArr: 55_000, expansionArr: 101_000, contractionArr: 16_000, churnArr: 0, closingArr: 4_660_000, netMovement: 140_000, newCustomers: 2, churnedCustomers: 0, expandedCustomers: 5, contractedCustomers: 1 },
      { period: '2025-09', openingArr: 4_660_000, newArr: 48_000, expansionArr: 98_000, contractionArr: 11_000, churnArr: 5_000, closingArr: 4_790_000, netMovement: 130_000, newCustomers: 1, churnedCustomers: 1, expandedCustomers: 6, contractedCustomers: 1 },
      { period: '2025-10', openingArr: 4_790_000, newArr: 33_000, expansionArr: 75_000, contractionArr: 18_000, churnArr: 0, closingArr: 4_880_000, netMovement: 90_000, newCustomers: 1, churnedCustomers: 0, expandedCustomers: 4, contractedCustomers: 2 },
      { period: '2025-11', openingArr: 4_880_000, newArr: 54_000, expansionArr: 101_000, contractionArr: 15_000, churnArr: 10_000, closingArr: 5_010_000, netMovement: 130_000, newCustomers: 1, churnedCustomers: 1, expandedCustomers: 6, contractedCustomers: 1 },
      { period: '2025-12', openingArr: 5_010_000, newArr: 63_000, expansionArr: 116_000, contractionArr: 21_000, churnArr: 18_000, closingArr: 5_150_000, netMovement: 140_000, newCustomers: 2, churnedCustomers: 1, expandedCustomers: 6, contractedCustomers: 2 },
      { period: '2026-01', openingArr: 5_150_000, newArr: 71_000, expansionArr: 98_000, contractionArr: 17_000, churnArr: 12_000, closingArr: 5_290_000, netMovement: 140_000, newCustomers: 2, churnedCustomers: 1, expandedCustomers: 5, contractedCustomers: 2 },
      { period: '2026-02', openingArr: 5_290_000, newArr: 74_000, expansionArr: 93_000, contractionArr: 14_000, churnArr: 13_000, closingArr: 5_430_000, netMovement: 140_000, newCustomers: 2, churnedCustomers: 1, expandedCustomers: 4, contractedCustomers: 1 },
      { period: '2026-03', openingArr: 5_430_000, newArr: 83_000, expansionArr: 96_000, contractionArr: 0, churnArr: 0, closingArr: 5_610_000, netMovement: 180_000, newCustomers: 2, churnedCustomers: 0, expandedCustomers: 5, contractedCustomers: 0 },
    ],
  },
  'demo-q4-2025': {
    fromDate: '2025-01-01',
    toDate: '2025-12-31',
    totalNewArr: 0,
    totalExpansionArr: 0,
    totalContractionArr: 0,
    totalChurnArr: 0,
    totalNetMovement: 0,
    movements: [],
  },
};

export const demoReviewItems: ReviewItem[] = [
  {
    id: 'rq-101',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 184,
    severity: 'error',
    reasonCode: 'MISSING_SERVICE_PERIOD',
    message: 'Invoice row imported without a recognizable service start/end period. ARR is excluded until finance confirms the revenue coverage window.',
    customerName: 'Northstar Health',
    productService: 'Enterprise Analytics Platform',
    amount: 84_000,
    invoiceDate: '2026-03-18',
    status: 'open',
  },
  {
    id: 'rq-102',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 233,
    severity: 'warning',
    reasonCode: 'PARENT_CHILD_ACCOUNT_REVIEW',
    message: 'Billing account name differs from the mapped parent customer. Review suggested rollup to ensure logo ARR is not split incorrectly.',
    customerName: 'Beacon Education',
    productService: 'Campus Insights Suite',
    amount: 36_500,
    invoiceDate: '2026-03-12',
    status: 'open',
  },
  {
    id: 'rq-103',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 411,
    severity: 'warning',
    reasonCode: 'MANUAL_CATEGORY_OVERRIDE',
    message: 'Professional services line was mapped to subscription ARR in the prior close. Confirm whether this should stay excluded from recurring revenue.',
    customerName: 'Granite Foods',
    productService: 'Implementation Services',
    amount: 18_000,
    invoiceDate: '2026-02-27',
    status: 'overridden',
    resolvedBy: DEMO_USER_EMAIL,
    resolvedAt: '2026-04-02T17:42:00.000Z',
    overrideNote: 'Kept excluded from ARR for the board packet version of the close.',
  },
  {
    id: 'rq-104',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 592,
    severity: 'error',
    reasonCode: 'PRODUCT_MAPPING_AMBIGUOUS',
    message: 'SKU "ADV-GROWTH-PLUS" matched multiple product mapping candidates after normalization. Pick the correct recurring product family before publishing the final ARR close.',
    customerName: 'Apex Retail Group',
    productService: 'ADV-GROWTH-PLUS',
    amount: 126_000,
    invoiceDate: '2026-03-06',
    status: 'open',
  },
  {
    id: 'rq-105',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 601,
    severity: 'warning',
    reasonCode: 'CREDIT_MEMO_REVIEW',
    message: 'Credit memo exceeds the monthly recurring amount for the underlying contract line. Confirm whether this should create a negative ARR adjustment or remain non-recurring.',
    customerName: 'Riverbank Clinics',
    productService: 'Renewal Credit Memo',
    amount: -22_400,
    invoiceDate: '2026-03-09',
    status: 'open',
  },
  {
    id: 'rq-106',
    importId: DEMO_IMPORT_ID,
    sourceRowNumber: 655,
    severity: 'warning',
    reasonCode: 'SHORT_TERM_CONTRACT',
    message: 'Term length is under 90 days. Review whether this line should remain in ARR or move to implementation / pilot tracking.',
    customerName: 'Blue Harbor Media',
    productService: 'Pilot Expansion',
    amount: 14_700,
    invoiceDate: '2026-03-02',
    status: 'resolved',
    resolvedBy: DEMO_USER_EMAIL,
    resolvedAt: '2026-04-02T18:06:00.000Z',
  },
];

export const demoReviewQueue: Record<string, ReviewQueue> = {
  'demo-q1-2026': {
    items: demoReviewItems,
    total: demoReviewItems.length,
    openCount: demoReviewItems.filter(item => item.status === 'open').length,
    resolvedCount: demoReviewItems.filter(item => item.status !== 'open').length,
  },
  'demo-q4-2025': {
    items: [],
    total: 0,
    openCount: 0,
    resolvedCount: 0,
  },
};

export const demoReviewStats: Record<string, ReviewStats> = {
  'demo-q1-2026': {
    importId: DEMO_IMPORT_ID,
    total: 14,
    openCount: 8,
    resolvedCount: 4,
    overriddenCount: 2,
    errorCount: 3,
    warningCount: 11,
    openByReasonCode: [
      { reasonCode: 'PRODUCT_MAPPING_AMBIGUOUS', count: 3 },
      { reasonCode: 'MISSING_SERVICE_PERIOD', count: 2 },
      { reasonCode: 'PARENT_CHILD_ACCOUNT_REVIEW', count: 2 },
      { reasonCode: 'CREDIT_MEMO_REVIEW', count: 1 },
    ],
    openBySeverity: [
      { severity: 'warning', count: 5 },
      { severity: 'error', count: 3 },
    ],
    topCustomersWithIssues: [
      { customerName: 'Apex Retail Group', openCount: 2 },
      { customerName: 'Northstar Health', openCount: 2 },
      { customerName: 'Beacon Education', openCount: 1 },
      { customerName: 'Riverbank Clinics', openCount: 1 },
    ],
    allResolved: false,
  },
  'demo-q4-2025': {
    importId: 'demo-q4-2025',
    total: 0,
    openCount: 0,
    resolvedCount: 0,
    overriddenCount: 0,
    errorCount: 0,
    warningCount: 0,
    openByReasonCode: [],
    openBySeverity: [],
    topCustomersWithIssues: [],
    allResolved: true,
  },
};

export const demoCustomers: Record<string, CustomerListResult> = {
  'demo-q1-2026': {
    total: 10,
    customers: [
      { name: 'Northstar Health', currentArr: 488_000, activeContracts: 3, lastInvoiceDate: '2026-03-18', requiresReview: true },
      { name: 'Apex Retail Group', currentArr: 474_000, activeContracts: 4, lastInvoiceDate: '2026-03-06', requiresReview: true },
      { name: 'Harbor Logistics', currentArr: 381_000, activeContracts: 3, lastInvoiceDate: '2026-03-25', requiresReview: false },
      { name: 'Beacon Education', currentArr: 328_000, activeContracts: 2, lastInvoiceDate: '2026-03-12', requiresReview: true },
      { name: 'Summit Workforce', currentArr: 301_000, activeContracts: 2, lastInvoiceDate: '2026-03-27', requiresReview: false },
      { name: 'Riverbank Clinics', currentArr: 287_000, activeContracts: 2, lastInvoiceDate: '2026-03-09', requiresReview: true },
      { name: 'Blue Harbor Media', currentArr: 264_000, activeContracts: 2, lastInvoiceDate: '2026-03-02', requiresReview: false },
      { name: 'Granite Foods', currentArr: 248_000, activeContracts: 2, lastInvoiceDate: '2026-02-27', requiresReview: false },
      { name: 'Pioneer Transit', currentArr: 221_000, activeContracts: 2, lastInvoiceDate: '2026-03-14', requiresReview: false },
      { name: 'Lattice Security', currentArr: 198_000, activeContracts: 1, lastInvoiceDate: '2026-03-20', requiresReview: false },
    ],
  },
  'demo-q4-2025': {
    total: 0,
    customers: [],
  },
};

const apexHistory: Array<{ period: string; arr: number }> = [
  { period: '2025-04', arr: 366_000 },
  { period: '2025-05', arr: 370_000 },
  { period: '2025-06', arr: 381_000 },
  { period: '2025-07', arr: 389_000 },
  { period: '2025-08', arr: 401_000 },
  { period: '2025-09', arr: 412_000 },
  { period: '2025-10', arr: 419_000 },
  { period: '2025-11', arr: 431_000 },
  { period: '2025-12', arr: 446_000 },
  { period: '2026-01', arr: 454_000 },
  { period: '2026-02', arr: 462_000 },
  { period: '2026-03', arr: 474_000 },
];

export const demoCustomerDetails: Record<string, Record<string, CustomerDetail>> = {
  'demo-q1-2026': {
    'Apex Retail Group': {
      name: 'Apex Retail Group',
      currentArr: 474_000,
      peakArr: 474_000,
      firstSeenPeriod: '2025-04',
      lastActivePeriod: '2026-03',
      arrHistory: apexHistory,
      requiresReview: true,
      openReviewCount: 2,
    },
    'Northstar Health': {
      name: 'Northstar Health',
      currentArr: 488_000,
      peakArr: 488_000,
      firstSeenPeriod: '2025-04',
      lastActivePeriod: '2026-03',
      arrHistory: [
        { period: '2025-04', arr: 402_000 },
        { period: '2025-05', arr: 408_000 },
        { period: '2025-06', arr: 418_000 },
        { period: '2025-07', arr: 420_000 },
        { period: '2025-08', arr: 433_000 },
        { period: '2025-09', arr: 439_000 },
        { period: '2025-10', arr: 444_000 },
        { period: '2025-11', arr: 452_000 },
        { period: '2025-12', arr: 458_000 },
        { period: '2026-01', arr: 466_000 },
        { period: '2026-02', arr: 476_000 },
        { period: '2026-03', arr: 488_000 },
      ],
      requiresReview: true,
      openReviewCount: 2,
    },
  },
};

export const demoCustomerCube = {
  importId: DEMO_IMPORT_ID,
  periods: ['2026-01', '2026-02', '2026-03'],
  summary: {
    openingArr: 5_290_000,
    closingArr: 5_610_000,
    grossRetentionPct: 97.1,
    netRevenueRetentionPct: 105.6,
    expansionArr: 96_000,
    contractionArr: 0,
    churnArr: 0,
    trackedCustomers: 8,
  },
  segmentTotals: [
    { segment: 'Healthcare', arr: 775_000, customers: 2 },
    { segment: 'Retail', arr: 474_000, customers: 1 },
    { segment: 'Education', arr: 328_000, customers: 1 },
    { segment: 'Logistics', arr: 381_000, customers: 1 },
    { segment: 'Staffing', arr: 301_000, customers: 1 },
    { segment: 'Media', arr: 264_000, customers: 1 },
    { segment: 'Food', arr: 248_000, customers: 1 },
  ],
  rows: [
    {
      customer: 'Northstar Health',
      segment: 'Healthcare',
      logoId: 'HC-014',
      openingArr: 466_000,
      closingArr: 488_000,
      movement: 'Expansion',
      netChange: 22_000,
      productFamilies: [
        { family: 'Enterprise Analytics Platform', arr: [402_000, 412_000, 420_000] },
        { family: 'Premium Support Subscription', arr: [64_000, 64_000, 68_000] },
      ],
      traceability: 'INV-1001 renewal + March support uplift',
    },
    {
      customer: 'Apex Retail Group',
      segment: 'Retail',
      logoId: 'RT-009',
      openingArr: 454_000,
      closingArr: 474_000,
      movement: 'Expansion',
      netChange: 20_000,
      productFamilies: [
        { family: 'Retail Insights Platform', arr: [370_000, 370_000, 370_000] },
        { family: 'AI Forecasting Module', arr: [84_000, 84_000, 84_000] },
        { family: 'Advanced Benchmarking Add-On', arr: [0, 8_000, 20_000] },
      ],
      traceability: 'INV-1088 and INV-1304 mapped to Dashboard Subscription',
    },
    {
      customer: 'Beacon Education',
      segment: 'Education',
      logoId: 'ED-021',
      openingArr: 276_000,
      closingArr: 328_000,
      movement: 'Expansion',
      netChange: 52_000,
      productFamilies: [
        { family: 'Campus Insights Suite', arr: [276_000, 276_000, 276_000] },
        { family: 'Student Retention Add-On', arr: [0, 0, 52_000] },
      ],
      traceability: 'March add-on booked on INV-1292',
    },
    {
      customer: 'Harbor Logistics',
      segment: 'Logistics',
      logoId: 'LG-011',
      openingArr: 361_000,
      closingArr: 381_000,
      movement: 'Expansion',
      netChange: 20_000,
      productFamilies: [
        { family: 'Logistics Control Tower', arr: [347_000, 355_000, 366_000] },
        { family: 'Usage Overage Pack', arr: [14_000, 17_000, 15_000] },
      ],
      traceability: 'Control Tower base contract + peak-season overage invoices',
    },
    {
      customer: 'Summit Workforce',
      segment: 'Staffing',
      logoId: 'WF-033',
      openingArr: 289_000,
      closingArr: 301_000,
      movement: 'Expansion',
      netChange: 12_000,
      productFamilies: [
        { family: 'Workforce Planning Cloud', arr: [289_000, 295_000, 301_000] },
      ],
      traceability: 'Seat expansion reflected in renewal snapshot',
    },
    {
      customer: 'Blue Harbor Media',
      segment: 'Media',
      logoId: 'MD-018',
      openingArr: 252_000,
      closingArr: 264_000,
      movement: 'Expansion',
      netChange: 12_000,
      productFamilies: [
        { family: 'Audience Intelligence Suite', arr: [252_000, 258_000, 264_000] },
      ],
      traceability: 'Expansion traced to March active-seat true-up',
    },
    {
      customer: 'Granite Foods',
      segment: 'Food',
      logoId: 'FD-027',
      openingArr: 237_000,
      closingArr: 248_000,
      movement: 'Expansion',
      netChange: 11_000,
      productFamilies: [
        { family: 'Supply Chain Visibility', arr: [237_000, 242_000, 248_000] },
      ],
      traceability: 'Renewal uplift carries through ARR snapshot roll-forward',
    },
    {
      customer: 'Riverbank Clinics',
      segment: 'Healthcare',
      logoId: 'HC-022',
      openingArr: 258_000,
      closingArr: 287_000,
      movement: 'Expansion',
      netChange: 29_000,
      productFamilies: [
        { family: 'Clinic Performance Suite', arr: [258_000, 272_000, 287_000] },
      ],
      traceability: 'Clinic suite ramp matched to January start-date cohort',
    },
  ],
};

export function isStaticDemoEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('github.io') || window.location.search.includes('demo=1');
}

export function isDemoImportId(importId?: string): boolean {
  return !!importId && importId.startsWith('demo-');
}

export function getDemoCustomerDetail(importId: string, customerName: string): CustomerDetail {
  const detail = demoCustomerDetails[importId]?.[customerName];
  if (detail) return detail;

  const customer = demoCustomers[importId]?.customers.find(entry => entry.name === customerName);
  return {
    name: customerName,
    currentArr: customer?.currentArr ?? 0,
    peakArr: customer?.currentArr ?? 0,
    firstSeenPeriod: '2025-04',
    lastActivePeriod: '2026-03',
    arrHistory: demoTimeseries[importId]?.periods
      .map(period => ({
        period: period.period,
        arr: period.byCustomer.find(entry => entry.customer === customerName)?.arr ?? 0,
      }))
      .filter(period => period.arr > 0) ?? [],
    requiresReview: customer?.requiresReview ?? false,
    openReviewCount: demoReviewItems.filter(item => item.customerName === customerName && item.status === 'open').length,
  };
}
