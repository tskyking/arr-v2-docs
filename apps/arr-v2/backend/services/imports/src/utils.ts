export function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === '';
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

export function parseNumber(value: unknown): number | null {
  if (isBlank(value)) return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

export function parseDateLike(value: unknown): string | null {
  if (isBlank(value)) return null;
  const raw = String(value).trim();
  if (raw === '0') return null;
  return raw;
}
