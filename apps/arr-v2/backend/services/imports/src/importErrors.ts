/**
 * Import error types — structured, human-readable errors for the import pipeline.
 * All user-facing errors must use ImportError, never raw JS Error objects.
 */

export type ImportErrorCode =
  // File-level
  | 'FILE_NOT_FOUND'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_UNREADABLE'
  | 'FILE_EMPTY'
  // Workbook structure
  | 'MISSING_TRANSACTION_SHEET'
  | 'MISSING_MAPPING_SHEET'
  | 'MISSING_ASSUMPTIONS_SHEET'
  | 'TRANSACTION_HEADER_NOT_FOUND'
  // Data quality
  | 'NO_DATA_ROWS'
  | 'ALL_ROWS_UNMAPPED'
  | 'NO_RECOGNITION_RULES'
  // Internal (should not reach users, but caught and wrapped)
  | 'INTERNAL_PARSE_ERROR';

const ERROR_MESSAGES: Record<ImportErrorCode, string> = {
  FILE_NOT_FOUND:
    'The uploaded file could not be found. Please try uploading again.',
  UNSUPPORTED_FILE_TYPE:
    'Only .xlsx workbooks are supported. Please export your data as an Excel file (.xlsx) and try again.',
  FILE_UNREADABLE:
    'The file could not be read — it may be corrupted or password-protected. Please check the file and try again.',
  FILE_EMPTY:
    'The uploaded file appears to be empty. Please check the file and try again.',
  MISSING_TRANSACTION_SHEET:
    'Could not find a transaction detail sheet in this workbook. ' +
    'Expected a sheet with Customer, Product/Service, and Amount columns (e.g. "Sales by Customer Detail"). ' +
    'Please check the workbook structure.',
  MISSING_MAPPING_SHEET:
    'Could not find a product/service mapping sheet. ' +
    'Expected a sheet mapping each Product/Service to a revenue category (e.g. "ProdSvc mapping to revenue type"). ' +
    'Please add a mapping sheet or contact support.',
  MISSING_ASSUMPTIONS_SHEET:
    'Could not find a revenue recognition assumptions sheet. ' +
    'Expected a sheet listing recognition rules per category (e.g. "Rev rec assumptions"). ' +
    'Please add an assumptions sheet or contact support.',
  TRANSACTION_HEADER_NOT_FOUND:
    'Found the transaction sheet but could not locate the column headers. ' +
    'Expected columns: Customer, Product/Service, Amount. ' +
    'The sheet may have an unexpected layout.',
  NO_DATA_ROWS:
    'The transaction sheet has no data rows after the header. ' +
    'Please check that the workbook contains invoice data.',
  ALL_ROWS_UNMAPPED:
    'None of the transaction rows could be matched to a product/service category. ' +
    'This usually means the mapping sheet is empty or the product names do not match. ' +
    'Please check the mapping sheet.',
  NO_RECOGNITION_RULES:
    'No revenue recognition rules could be parsed from the assumptions sheet. ' +
    'Please check that the assumptions sheet contains rule descriptions.',
  INTERNAL_PARSE_ERROR:
    'An unexpected error occurred while reading the workbook. ' +
    'Please try again or contact support if the problem continues.',
};

export class ImportError extends Error {
  readonly code: ImportErrorCode;
  readonly userMessage: string;
  readonly detail?: string;

  constructor(code: ImportErrorCode, detail?: string) {
    const userMessage = ERROR_MESSAGES[code];
    // Use userMessage as the primary .message so that regex-on-message checks in tests
    // and standard try/catch handlers see human-readable text, not the code token.
    const message = detail ? `${userMessage} (${detail})` : userMessage;
    super(message);
    this.name = 'ImportError';
    this.code = code;
    this.userMessage = userMessage;
    this.detail = detail;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      ...(this.detail ? { detail: this.detail } : {}),
    };
  }
}

/** Wrap an unknown error into an ImportError with INTERNAL_PARSE_ERROR code */
export function wrapUnknownError(err: unknown, context?: string): ImportError {
  if (err instanceof ImportError) return err;
  const msg = err instanceof Error ? err.message : String(err);
  const detail = context ? `${context}: ${msg}` : msg;
  return new ImportError('INTERNAL_PARSE_ERROR', detail);
}
