export const REQUIRED_TRANSACTION_COLUMNS = [
  'Customer',
  'Date|Invoice Date',
  'Transaction Type',
  'Num|Invoice Number',
  'Product/Service',
  'Qty',
  'Sales Price',
  'Amount',
] as const;

export const RECURRING_CATEGORY_HINTS = new Set([
  'Dashboard Subscription',
  'Website Hosting / Support Subscription?',
]);
