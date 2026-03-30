export type ReviewSeverity = 'info' | 'warning' | 'error';

export type ReviewReasonCode =
  | 'MISSING_REQUIRED_COLUMN'
  | 'INVALID_DATE'
  | 'INVALID_NUMBER'
  | 'UNKNOWN_TRANSACTION_TYPE'
  | 'MISSING_INVOICE_NUMBER'
  | 'MISSING_PRODUCT_SERVICE_MAPPING'
  | 'MULTIPLE_PRODUCT_SERVICE_CATEGORIES'
  | 'MISSING_RECOGNITION_ASSUMPTION'
  | 'UNSUPPORTED_RECOGNITION_RULE'
  | 'MISSING_SUBSCRIPTION_DATES_FOR_RECURRING_ITEM'
  | 'SUSPICIOUS_NEGATIVE_AMOUNT'
  | 'AMOUNT_PRICE_QUANTITY_MISMATCH';

export interface TransactionDetailRow {
  customerName: string;
  invoiceDate: string;
  transactionType: string;
  invoiceNumber: string;
  productService: string;
  memoDescription?: string;
  quantity: number;
  salesPrice: number;
  amount: number;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  account?: string | null;
  className?: string | null;
  balance?: number | null;
  sourceRowNumber: number;
}

export interface ProductServiceMappingRow {
  productService: string;
  categoryFlags: Record<string, boolean>;
  resolvedPrimaryCategory?: string;
  sourceRowNumber: number;
}

export interface RecognitionAssumptionRow {
  categoryName: string;
  rawRuleText: string;
  resolvedRuleType?: string;
  sourceRowNumber: number;
}

export interface WorkbookImportBundle {
  transactionDetailRows: TransactionDetailRow[];
  productServiceMappings: ProductServiceMappingRow[];
  recognitionAssumptions: RecognitionAssumptionRow[];
  aliasRows?: Record<string, string>[];
}

export interface ReviewItem {
  sourceRowNumber: number;
  severity: ReviewSeverity;
  reasonCode: ReviewReasonCode;
  message: string;
  relatedFieldNames: string[];
}

export interface NormalizedImportRow {
  sourceRowNumber: number;
  siteName: string;
  sourceInvoiceNumber: string;
  invoiceDate: string;
  productService: string;
  quantity: number;
  amount: number;
  recognizedCategory?: string;
  recognizedRuleType?: string;
  subscriptionStartDate?: string | null;
  subscriptionEndDate?: string | null;
  requiresReview: boolean;
  reviewReasons: ReviewReasonCode[];
}

export interface NormalizedImportBundle {
  normalizedRows: NormalizedImportRow[];
  reviewItems: ReviewItem[];
  warnings: string[];
}
