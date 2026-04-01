/**
 * ARR Engine Types
 * Core value objects for the ARR calculation layer.
 */

/** A date string in ISO format YYYY-MM-DD */
export type ISODate = string;

/** Recognition rule types aligned with the workbook assumptions sheet */
export type RecognitionRuleType =
  | 'subscription_term'
  | 'fallback_one_year_from_invoice'
  | 'fixed_36_months_from_invoice'
  | 'invoice_date_immediate';

export interface RevenueSegment {
  sourceRowNumber: number;
  siteName: string;
  category: string;
  ruleType: RecognitionRuleType;
  periodStart: ISODate;
  periodEnd: ISODate;
  recognizedAmount: number;
  arrContribution: number;
  requiresReview: boolean;
  originalAmount: number;
}

export interface ArrSnapshot {
  asOf: ISODate;
  totalArr: number;
  byCategory: Record<string, number>;
  byCustomer: Record<string, number>;
  activeCustomerCount: number;
}

export interface ArrCalculationResult {
  segments: RevenueSegment[];
  snapshots: Map<string, ArrSnapshot>;
  skippedRows: Array<{ sourceRowNumber: number; reason: string }>;
}
