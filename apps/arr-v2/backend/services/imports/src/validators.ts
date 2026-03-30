import { REQUIRED_TRANSACTION_COLUMNS } from './constants';
import { normalizeHeader } from './utils';

export function hasHeader(headers: string[], requirement: string): boolean {
  const normalized = headers.map(normalizeHeader);
  const options = requirement.split('|').map(normalizeHeader);
  return options.some((opt) => normalized.includes(opt));
}

export function validateTransactionHeaders(headers: string[]): string[] {
  const missing: string[] = [];
  for (const requirement of REQUIRED_TRANSACTION_COLUMNS) {
    if (!hasHeader(headers, requirement)) missing.push(requirement);
  }
  return missing;
}
