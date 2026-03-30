import type {
  NormalizedImportBundle,
  NormalizedImportRow,
  ProductServiceMappingRow,
  RecognitionAssumptionRow,
  ReviewItem,
  ReviewReasonCode,
  TransactionDetailRow,
  WorkbookImportBundle,
} from './types';
import { RECURRING_CATEGORY_HINTS } from './constants';

function resolvePrimaryCategory(mapping?: ProductServiceMappingRow): string | undefined {
  return mapping?.resolvedPrimaryCategory;
}

function resolveRuleType(assumption?: RecognitionAssumptionRow): string | undefined {
  return assumption?.resolvedRuleType;
}

export function normalizeImportBundle(bundle: WorkbookImportBundle): NormalizedImportBundle {
  const reviewItems: ReviewItem[] = [];
  const normalizedRows: NormalizedImportRow[] = [];

  const mappingByProduct = new Map(bundle.productServiceMappings.map((row) => [row.productService, row]));
  const assumptionByCategory = new Map(bundle.recognitionAssumptions.map((row) => [row.categoryName, row]));

  for (const row of bundle.transactionDetailRows) {
    const reviewReasons: ReviewReasonCode[] = [];
    const mapping = mappingByProduct.get(row.productService);
    const category = resolvePrimaryCategory(mapping);
    const assumption = category ? assumptionByCategory.get(category) : undefined;
    const ruleType = resolveRuleType(assumption);

    if (!row.invoiceNumber) {
      reviewReasons.push('MISSING_INVOICE_NUMBER');
    }
    if (!mapping) {
      reviewReasons.push('MISSING_PRODUCT_SERVICE_MAPPING');
    }
    if (mapping && !category) {
      reviewReasons.push('MULTIPLE_PRODUCT_SERVICE_CATEGORIES');
    }
    if (category && !assumption) {
      reviewReasons.push('MISSING_RECOGNITION_ASSUMPTION');
    }
    if (assumption && !ruleType) {
      reviewReasons.push('UNSUPPORTED_RECOGNITION_RULE');
    }
    if (category && RECURRING_CATEGORY_HINTS.has(category) && !row.subscriptionStartDate && !row.subscriptionEndDate) {
      reviewReasons.push('MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM');
    }
    if (row.amount < 0) {
      reviewReasons.push('SUSPICIOUS_NEGATIVE_AMOUNT');
    }
    if (Math.abs(row.quantity * row.salesPrice - row.amount) > 0.01) {
      reviewReasons.push('AMOUNT_PRICE_QUANTITY_MISMATCH');
    }

    const normalized: NormalizedImportRow = {
      sourceRowNumber: row.sourceRowNumber,
      siteName: row.customerName,
      sourceInvoiceNumber: row.invoiceNumber,
      invoiceDate: row.invoiceDate,
      productService: row.productService,
      quantity: row.quantity,
      amount: row.amount,
      recognizedCategory: category,
      recognizedRuleType: ruleType,
      subscriptionStartDate: row.subscriptionStartDate ?? null,
      subscriptionEndDate: row.subscriptionEndDate ?? null,
      requiresReview: reviewReasons.length > 0,
      reviewReasons,
    };

    normalizedRows.push(normalized);

    for (const reasonCode of reviewReasons) {
      reviewItems.push({
        sourceRowNumber: row.sourceRowNumber,
        severity: 'warning',
        reasonCode,
        message: reasonCode,
        relatedFieldNames: [],
      });
    }
  }

  return { normalizedRows, reviewItems, warnings: [] };
}
