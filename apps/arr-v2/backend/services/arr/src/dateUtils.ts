/**
 * Date utilities for ARR period calculations.
 */

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const mmddyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy;
    return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00Z`);
  }
  // Excel serial date
  const serial = Number(value);
  if (!isNaN(serial) && serial > 1000 && serial < 100000) {
    return new Date((serial - 25569) * 86400 * 1000);
  }
  return null;
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addYears(d: Date, years: number): Date {
  const result = new Date(d);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

export function addMonths(d: Date, months: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
