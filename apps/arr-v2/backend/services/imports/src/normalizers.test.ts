import { describe, it, expect } from 'vitest';
import { normalizeImportBundle } from './normalizers.js';
import type {
  WorkbookImportBundle,
  TransactionDetailRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
} from './types.js';

function makeTransaction(overrides: Partial<TransactionDetailRow> = {}): TransactionDetailRow {
  return {
    sourceRowNumber: 2,
    customerName: 'Acme Corp',
    invoiceDate: '2024-01-15',
    transactionType: 'Invoice',
    invoiceNumber: 'INV-001',
    productService: 'Dashboard Pro',
    quantity: 1,
    salesPrice: 12000,
    amount: 12000,
    // Provide subscription dates to avoid MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM
    // for Dashboard Subscription (which is in RECURRING_CATEGORY_HINTS)
    subscriptionStartDate: '2024-01-01',
    subscriptionEndDate: '2024-12-31',
    ...overrides,
  };
}

function makeMapping(overrides: Partial<ProductServiceMappingRow> = {}): ProductServiceMappingRow {
  return {
    productService: 'Dashboard Pro',
    categoryFlags: { 'Dashboard Subscription': true },
    resolvedPrimaryCategory: 'Dashboard Subscription',
    sourceRowNumber: 2,
    ...overrides,
  };
}

function makeAssumption(overrides: Partial<RecognitionAssumptionRow> = {}): RecognitionAssumptionRow {
  return {
    categoryName: 'Dashboard Subscription',
    rawRuleText: 'Recognize over one year from invoice date',
    resolvedRuleType: 'fallback_one_year_from_invoice',
    sourceRowNumber: 2,
    ...overrides,
  };
}

function makeBundle(overrides: Partial<WorkbookImportBundle> = {}): WorkbookImportBundle {
  return {
    transactionDetailRows: [makeTransaction()],
    productServiceMappings: [makeMapping()],
    recognitionAssumptions: [makeAssumption()],
    ...overrides,
  };
}

describe('normalizeImportBundle', () => {
  describe('happy path', () => {
    it('normalizes a clean row with no review reasons', () => {
      const bundle = makeBundle();
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows).toHaveLength(1);
      const row = result.normalizedRows[0];
      expect(row.requiresReview).toBe(false);
      expect(row.reviewReasons).toHaveLength(0);
      expect(row.recognizedCategory).toBe('Dashboard Subscription');
      expect(row.recognizedRuleType).toBe('fallback_one_year_from_invoice');
    });

    it('maps siteName from customerName', () => {
      const bundle = makeBundle();
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].siteName).toBe('Acme Corp');
    });

    it('maps sourceInvoiceNumber from invoiceNumber', () => {
      const bundle = makeBundle();
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].sourceInvoiceNumber).toBe('INV-001');
    });
  });

  describe('missing invoice number', () => {
    it('flags MISSING_INVOICE_NUMBER when invoiceNumber is empty', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ invoiceNumber: '' })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_INVOICE_NUMBER');
    });

    it('sets requiresReview = true for missing invoice number', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ invoiceNumber: '' })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].requiresReview).toBe(true);
    });
  });

  describe('missing product/service mapping', () => {
    it('flags MISSING_PRODUCT_SERVICE_MAPPING when product not in mapping sheet', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ productService: 'Unknown Product XYZ' })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    });

    it('does not assign category when mapping is missing', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ productService: 'Unknown Product XYZ' })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].recognizedCategory).toBeUndefined();
    });
  });

  describe('alias resolution', () => {
    it('resolves product via alias map (internal QB name -> anonymized name)', () => {
      const bundle: WorkbookImportBundle = {
        transactionDetailRows: [makeTransaction({ productService: 'Dashboard Pro (QB Internal Name)' })],
        productServiceMappings: [makeMapping({ productService: 'Dashboard Pro' })],
        recognitionAssumptions: [makeAssumption()],
        aliasRows: [
          {
            'Product/Service per QB': 'Dashboard Pro (QB Internal Name)',
            'Product/Service': 'Dashboard Pro',
          },
        ],
      };
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].recognizedCategory).toBe('Dashboard Subscription');
      expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    });

    it('still flags missing mapping when alias lookup also fails', () => {
      const bundle: WorkbookImportBundle = {
        transactionDetailRows: [makeTransaction({ productService: 'Totally Unknown' })],
        productServiceMappings: [makeMapping()],
        recognitionAssumptions: [makeAssumption()],
        aliasRows: [
          {
            'Product/Service per QB': 'Some Other QB Name',
            'Product/Service': 'Dashboard Pro',
          },
        ],
      };
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_PRODUCT_SERVICE_MAPPING');
    });
  });

  describe('multiple categories (ambiguous mapping)', () => {
    it('flags MULTIPLE_PRODUCT_SERVICE_CATEGORIES when resolvedPrimaryCategory is undefined but mapping exists', () => {
      const bundle = makeBundle({
        productServiceMappings: [
          makeMapping({
            resolvedPrimaryCategory: undefined,
            categoryFlags: { 'Dashboard Subscription': true, 'Hosting': true },
          }),
        ],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    });
  });

  describe('missing recognition assumption', () => {
    it('flags MISSING_RECOGNITION_ASSUMPTION when no assumption for the category', () => {
      const bundle = makeBundle({
        recognitionAssumptions: [
          makeAssumption({ categoryName: 'Some Other Category' }),
        ],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_RECOGNITION_ASSUMPTION');
    });
  });

  describe('unsupported recognition rule', () => {
    it('flags UNSUPPORTED_RECOGNITION_RULE when resolvedRuleType is undefined', () => {
      const bundle = makeBundle({
        recognitionAssumptions: [
          makeAssumption({ resolvedRuleType: undefined }),
        ],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('UNSUPPORTED_RECOGNITION_RULE');
    });
  });

  describe('negative amounts (credits/refunds)', () => {
    it('flags SUSPICIOUS_NEGATIVE_AMOUNT for negative amount', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ amount: -1200, quantity: -1, salesPrice: 1200 })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('SUSPICIOUS_NEGATIVE_AMOUNT');
    });

    it('still processes negative amount row (does not skip)', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ amount: -1200, quantity: -1, salesPrice: 1200 })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows).toHaveLength(1);
      expect(result.normalizedRows[0].amount).toBe(-1200);
    });
  });

  describe('amount/price/quantity mismatch', () => {
    it('flags AMOUNT_PRICE_QUANTITY_MISMATCH when qty * price != amount', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ quantity: 2, salesPrice: 100, amount: 150 })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
    });

    it('does not flag mismatch when within $0.01 tolerance', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ quantity: 1, salesPrice: 12000.005, amount: 12000 })],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).not.toContain('AMOUNT_PRICE_QUANTITY_MISMATCH');
    });
  });

  describe('missing subscription dates for recurring items', () => {
    it('flags MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM for Dashboard Subscription with no dates', () => {
      const bundle = makeBundle({
        transactionDetailRows: [
          makeTransaction({ subscriptionStartDate: null, subscriptionEndDate: null }),
        ],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
    });

    it('does not flag when subscriptionStartDate is present', () => {
      const bundle = makeBundle({
        transactionDetailRows: [
          makeTransaction({ subscriptionStartDate: '2024-01-01', subscriptionEndDate: null }),
        ],
      });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
    });

    it('does not flag for categories not in RECURRING_CATEGORY_HINTS', () => {
      const bundle: WorkbookImportBundle = {
        transactionDetailRows: [
          makeTransaction({ subscriptionStartDate: null, subscriptionEndDate: null }),
        ],
        productServiceMappings: [makeMapping({ resolvedPrimaryCategory: 'One-Time Setup Fee' })],
        recognitionAssumptions: [makeAssumption({ categoryName: 'One-Time Setup Fee' })],
      };
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows[0].reviewReasons).not.toContain('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
    });
  });

  describe('review items generation', () => {
    it('generates one reviewItem per review reason per row', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ invoiceNumber: '', amount: -1200, quantity: -1, salesPrice: 1200 })],
      });
      const result = normalizeImportBundle(bundle);
      // At least MISSING_INVOICE_NUMBER and SUSPICIOUS_NEGATIVE_AMOUNT
      expect(result.reviewItems.length).toBeGreaterThanOrEqual(2);
    });

    it('reviewItems reference the correct sourceRowNumber', () => {
      const bundle = makeBundle({
        transactionDetailRows: [makeTransaction({ sourceRowNumber: 42, invoiceNumber: '' })],
      });
      const result = normalizeImportBundle(bundle);
      const item = result.reviewItems.find((i) => i.reasonCode === 'MISSING_INVOICE_NUMBER');
      expect(item!.sourceRowNumber).toBe(42);
    });
  });

  describe('empty bundle', () => {
    it('handles empty transaction rows', () => {
      const bundle = makeBundle({ transactionDetailRows: [] });
      const result = normalizeImportBundle(bundle);
      expect(result.normalizedRows).toHaveLength(0);
      expect(result.reviewItems).toHaveLength(0);
    });
  });
});
