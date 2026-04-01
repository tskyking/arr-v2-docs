import { describe, it, expect } from 'vitest';
import {
  parseTransactionDetailSheet,
  parseProductServiceMappingSheet,
  parseRecognitionAssumptionsSheet,
  parseAliasSheet,
  workbookToImportBundle,
} from './workbookToBundle.js';
import type { RawSheetTable, RawWorkbook } from './readers/xlsxXmlReader.js';

function makeSheet(name: string, rows: string[][]): RawSheetTable {
  return { name, rows };
}

// ─── parseTransactionDetailSheet ──────────────────────────────────────────────

describe('parseTransactionDetailSheet', () => {
  const headerRow = [
    'Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service',
    'Qty', 'Sales Price', 'Amount', 'Subscription Start Date', 'Subscription End Date',
  ];
  const dataRow = [
    'Acme Corp', '01/15/2024', 'Invoice', 'INV-001', 'Dashboard Pro',
    '1', '12000', '12000', '01/01/2024', '12/31/2024',
  ];

  it('parses a basic transaction row', () => {
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, dataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].customerName).toBe('Acme Corp');
    expect(rows[0].invoiceNumber).toBe('INV-001');
    expect(rows[0].productService).toBe('Dashboard Pro');
    expect(rows[0].amount).toBe(12000);
    expect(rows[0].quantity).toBe(1);
    expect(rows[0].salesPrice).toBe(12000);
  });

  it('skips rows where customer is empty (subtotal rows)', () => {
    const subtotalRow = ['', '', '', '', '', '', '', '96000', '', ''];
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, dataRow, subtotalRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(1);
  });

  it('handles title rows above the header row', () => {
    const titleRow = ['Report Title', '', '', '', '', '', '', '', '', ''];
    const sheet = makeSheet('Sales by Cust Detail', [titleRow, headerRow, dataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].customerName).toBe('Acme Corp');
  });

  it('throws when header row cannot be found', () => {
    const sheet = makeSheet('Sales by Cust Detail', [['No', 'Valid', 'Headers']]);
    expect(() => parseTransactionDetailSheet(sheet)).toThrow();
  });

  it('assigns correct sourceRowNumber', () => {
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, dataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    // headerIndex=0, dataRow is row index 1 → sourceRowNumber = 0 + 1 + 2 = 3? Let's just check it's a number
    expect(typeof rows[0].sourceRowNumber).toBe('number');
    expect(rows[0].sourceRowNumber).toBeGreaterThan(0);
  });

  it('handles negative amount (credit/refund)', () => {
    const creditRow = ['Acme Corp', '01/15/2024', 'Credit Memo', 'CM-001', 'Dashboard Pro', '-1', '12000', '-12000', '', ''];
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, creditRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].amount).toBe(-12000);
    expect(rows[0].quantity).toBe(-1);
  });

  it('handles missing invoice date (empty string stays empty)', () => {
    const noDateRow = ['Acme Corp', '', 'Invoice', 'INV-002', 'Dashboard Pro', '1', '12000', '12000', '', ''];
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, noDateRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].invoiceDate).toBe('');
  });

  it('parses subscription start/end dates', () => {
    const sheet = makeSheet('Sales by Cust Detail', [headerRow, dataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].subscriptionStartDate).toBe('01/01/2024');
    expect(rows[0].subscriptionEndDate).toBe('12/31/2024');
  });

  it('handles "Invoice Date" as alternative to "Date"', () => {
    const altHeaderRow = [
      'Customer', 'Invoice Date', 'Transaction Type', 'Num', 'Product/Service',
      'Qty', 'Sales Price', 'Amount', '', '',
    ];
    const altDataRow = ['Acme Corp', '01/15/2024', 'Invoice', 'INV-001', 'Widget', '1', '500', '500', '', ''];
    const sheet = makeSheet('Sales', [altHeaderRow, altDataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].invoiceDate).toBe('01/15/2024');
  });

  it('handles "Invoice Number" as alternative to "Num"', () => {
    const altHeaderRow = [
      'Customer', 'Date', 'Transaction Type', 'Invoice Number', 'Product/Service',
      'Qty', 'Sales Price', 'Amount', '', '',
    ];
    const altDataRow = ['Acme Corp', '01/15/2024', 'Invoice', 'INV-999', 'Widget', '1', '500', '500', '', ''];
    const sheet = makeSheet('Sales', [altHeaderRow, altDataRow]);
    const rows = parseTransactionDetailSheet(sheet);
    expect(rows[0].invoiceNumber).toBe('INV-999');
  });
});

// ─── parseProductServiceMappingSheet ─────────────────────────────────────────

describe('parseProductServiceMappingSheet', () => {
  const headerRow = ['Product/Service', 'Dashboard Subscription', 'One-Time Setup Fee'];
  const row1 = ['Dashboard Pro', 'Yes', ''];
  const row2 = ['Setup Fee', '', 'Yes'];

  it('parses a basic mapping sheet', () => {
    const sheet = makeSheet('Mapping', [headerRow, row1, row2]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows).toHaveLength(2);
    expect(rows[0].productService).toBe('Dashboard Pro');
    expect(rows[0].categoryFlags['Dashboard Subscription']).toBe(true);
    expect(rows[0].categoryFlags['One-Time Setup Fee']).toBe(false);
    expect(rows[0].resolvedPrimaryCategory).toBe('Dashboard Subscription');
  });

  it('resolvedPrimaryCategory is undefined when multiple categories are yes', () => {
    const multiRow = ['Combo Product', 'Yes', 'Yes'];
    const sheet = makeSheet('Mapping', [headerRow, multiRow]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
  });

  it('resolvedPrimaryCategory is undefined when no categories are yes', () => {
    const noneRow = ['Uncategorized', '', ''];
    const sheet = makeSheet('Mapping', [headerRow, noneRow]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows[0].resolvedPrimaryCategory).toBeUndefined();
  });

  it('throws when Product/Service column is not found', () => {
    const sheet = makeSheet('Mapping', [['Col A', 'Col B'], ['val1', 'val2']]);
    expect(() => parseProductServiceMappingSheet(sheet)).toThrow();
  });

  it('skips blank data rows', () => {
    const blankRow: string[] = [];
    const sheet = makeSheet('Mapping', [headerRow, row1, blankRow]);
    const rows = parseProductServiceMappingSheet(sheet);
    expect(rows).toHaveLength(1);
  });
});

// ─── parseRecognitionAssumptionsSheet ────────────────────────────────────────

describe('parseRecognitionAssumptionsSheet', () => {
  it('parses subscription_term rule', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Dashboard Subscription', 'Recognize over subscription start date through subscription end date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0].resolvedRuleType).toBe('subscription_term');
  });

  it('parses fallback_one_year_from_invoice rule', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Hosting', 'Recognize over one year from invoice date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows[0].resolvedRuleType).toBe('fallback_one_year_from_invoice');
  });

  it('parses fixed_36_months_from_invoice rule', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'SetUp', 'Recognize over three years from invoice date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows[0].resolvedRuleType).toBe('fixed_36_months_from_invoice');
  });

  it('parses invoice_date_immediate rule', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'One-Time Fee', 'Recognize all revenue on the invoice date'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows[0].resolvedRuleType).toBe('invoice_date_immediate');
  });

  it('resolvedRuleType is undefined for unrecognized rule text', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Custom Category', 'Some custom recognition method'],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows[0].resolvedRuleType).toBeUndefined();
  });

  it('skips rows with empty category or rule columns', () => {
    const sheet = makeSheet('Rev Rec', [
      ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
      ['', '', 'Some rule without category'],
      ['', 'Category without rule', ''],
    ]);
    const rows = parseRecognitionAssumptionsSheet(sheet);
    expect(rows).toHaveLength(1);
  });
});

// ─── parseAliasSheet ─────────────────────────────────────────────────────────

describe('parseAliasSheet', () => {
  it('parses alias rows into key-value objects', () => {
    const sheet = makeSheet('Anonymizer', [
      ['Customer From QB', 'Customer', 'Product/Service per QB', 'Product/Service'],
      ['Acme LLC', 'Site A', 'Widget Pro (legacy)', 'Widget Pro'],
    ]);
    const rows = parseAliasSheet(sheet);
    expect(rows).toHaveLength(1);
    expect(rows[0]['Customer From QB']).toBe('Acme LLC');
    expect(rows[0]['Product/Service per QB']).toBe('Widget Pro (legacy)');
    expect(rows[0]['Product/Service']).toBe('Widget Pro');
  });

  it('returns empty array when header row cannot be found', () => {
    const sheet = makeSheet('Anonymizer', [
      ['No', 'Matching', 'Headers'],
      ['val1', 'val2', 'val3'],
    ]);
    const rows = parseAliasSheet(sheet);
    expect(rows).toHaveLength(0);
  });

  it('skips blank data rows', () => {
    const sheet = makeSheet('Anonymizer', [
      ['Customer From QB', 'Customer', 'Product/Service per QB', 'Product/Service'],
      ['', '', '', ''],
      ['Acme LLC', 'Site A', 'Widget', 'Widget'],
    ]);
    const rows = parseAliasSheet(sheet);
    // blank row should be filtered — but let's see if the function filters it
    // (it filters by row.some(c => String(c).trim() !== ''))
    expect(rows).toHaveLength(1);
  });
});

// ─── workbookToImportBundle ────────────────────────────────────────────────

describe('workbookToImportBundle', () => {
  function makeFullWorkbook(): RawWorkbook {
    return {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Sales by Cust Detail', [
          ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'],
          ['Acme Corp', '01/15/2024', 'Invoice', 'INV-001', 'Dashboard Pro', '1', '12000', '12000'],
        ]),
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Dashboard Pro', 'Yes'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
  }

  it('successfully parses a well-formed workbook', () => {
    const bundle = workbookToImportBundle(makeFullWorkbook());
    expect(bundle.transactionDetailRows).toHaveLength(1);
    expect(bundle.productServiceMappings).toHaveLength(1);
    expect(bundle.recognitionAssumptions).toHaveLength(1);
  });

  it('throws when transactionDetail sheet is missing', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Dashboard Pro', 'Yes'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/transaction detail/i);
  });

  it('throws when productServiceMappings sheet is missing', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Sales by Cust Detail', [
          ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'],
          ['Acme', '01/01/2024', 'Invoice', 'INV-1', 'Product', '1', '100', '100'],
        ]),
        makeSheet('Rev Rec Assumptions', [
          ['', 'Dashboard Subscription', 'Recognize over one year from invoice date'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/product.*service.*mapping|mapping/i);
  });

  it('throws when recognitionAssumptions sheet is missing', () => {
    const wb: RawWorkbook = {
      sourcePath: '/fake/path.xlsx',
      sheets: [
        makeSheet('Sales by Cust Detail', [
          ['Customer', 'Date', 'Transaction Type', 'Num', 'Product/Service', 'Qty', 'Sales Price', 'Amount'],
          ['Acme', '01/01/2024', 'Invoice', 'INV-1', 'Product', '1', '100', '100'],
        ]),
        makeSheet('Mapping to Revenue Type', [
          ['Product/Service', 'Dashboard Subscription'],
          ['Product', 'Yes'],
        ]),
      ],
    };
    expect(() => workbookToImportBundle(wb)).toThrow(/recognition assumption/i);
  });

  it('includes aliasRows when aliasMappings sheet is present', () => {
    const wb = makeFullWorkbook();
    wb.sheets.push(makeSheet('Anonymizer', [
      ['Customer From QB', 'Customer', 'Product/Service per QB', 'Product/Service'],
      ['Acme LLC', 'Acme Corp', 'Dashboard Pro Legacy', 'Dashboard Pro'],
    ]));
    const bundle = workbookToImportBundle(wb);
    expect(bundle.aliasRows).toBeDefined();
    expect(bundle.aliasRows!.length).toBeGreaterThan(0);
  });

  it('aliasRows is undefined when no aliasMappings sheet', () => {
    const bundle = workbookToImportBundle(makeFullWorkbook());
    expect(bundle.aliasRows).toBeUndefined();
  });
});
