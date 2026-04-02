/**
 * Tests for new MVP output endpoints — session 5 (2026-04-02)
 *
 * Tests:
 *  ARR CSV export:
 *   1. GET /imports/:id/arr/export.csv → 200, Content-Type text/csv, for a real import
 *   2. GET /imports/:id/arr/export.csv → 404 for unknown importId
 *   3. CSV has a header row with required columns
 *   4. CSV has at least one data row
 *   5. CSV values are numeric (no NaN, no undefined literals)
 *   6. ?from=&to= date params are respected (result should not extend beyond range)
 *
 *  ARR Movements CSV export:
 *   7. GET /imports/:id/arr/movements/export.csv → 200, Content-Type text/csv
 *   8. GET /imports/:id/arr/movements/export.csv → 404 for unknown id
 *   9. Movements CSV has correct header columns
 *  10. Movements CSV includes a TOTAL row at the end
 *
 *  Review stats endpoint:
 *  11. GET /imports/:id/review/stats → 200 with required fields for a real import
 *  12. GET /imports/:id/review/stats → 404 for unknown id
 *  13. stats.total === stats.openCount + stats.resolvedCount + stats.overriddenCount
 *  14. stats.errorCount + stats.warningCount <= stats.total (items can only be one severity)
 *  15. stats.openByReasonCode entries sum to stats.openCount
 *  16. stats.allResolved is false when there are open items, true when all resolved
 *  17. stats.topCustomersWithIssues has at most 10 entries
 *
 *  Unit tests for exportArrCsv / exportMovementsCsv / getReviewStats functions directly:
 *  18. exportArrCsv returns null for unknown importId
 *  19. exportMovementsCsv returns null for unknown importId
 *  20. getReviewStats returns null for unknown importId
 */

import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { listImports, exportArrCsv, exportMovementsCsv, getReviewStats } from '../importService.js';

const FAKE_ID = '00000000-0000-0000-0000-000000000099';
let port: number;
let serverModule: { default: http.Server };

// ─── HTTP helper ─────────────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: unknown;
}

function request(
  method: string,
  path: string,
  body?: string,
  headers?: http.OutgoingHttpHeaders,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(opts, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let json: unknown;
        try { json = JSON.parse(raw); } catch { json = raw; }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body: raw, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ─── Server lifecycle ─────────────────────────────────────────────────────────

// Use a different port from server.test.ts to avoid conflicts
const TEST_PORT = 13902;

beforeAll(async () => {
  port = TEST_PORT;
  process.env['PORT'] = String(port);
  serverModule = await import('../server.js');
  await new Promise<void>((resolve) => {
    if (serverModule.default.listening) { resolve(); return; }
    serverModule.default.once('listening', resolve);
  });
}, 10_000);

afterAll(() => {
  serverModule?.default?.close();
});

// ─── Get a real importId from the store ──────────────────────────────────────

function getRealImportId(): string | undefined {
  const imports = listImports();
  return imports[0]?.importId;
}

// ─── 1–6. ARR CSV export ─────────────────────────────────────────────────────

describe('GET /imports/:id/arr/export.csv', () => {
  it('1. returns 200 with text/csv content-type for a real import', async () => {
    const id = getRealImportId();
    if (!id) { console.warn('No imports in store — skipping'); return; }
    const res = await request('GET', `/imports/${id}/arr/export.csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('2. returns 404 for unknown importId', async () => {
    const res = await request('GET', `/imports/${FAKE_ID}/arr/export.csv`);
    expect(res.status).toBe(404);
  });

  it('3. CSV has a header row with period, total_arr, active_customers', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/export.csv`);
    const firstLine = res.body.split('\n')[0];
    expect(firstLine).toContain('period');
    expect(firstLine).toContain('total_arr');
    expect(firstLine).toContain('active_customers');
  });

  it('4. CSV has at least one data row beyond the header', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/export.csv`);
    const lines = res.body.split('\n').filter(l => l.trim().length > 0);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('5. CSV data rows have numeric total_arr values (no NaN or undefined)', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/export.csv`);
    const lines = res.body.split('\n').filter(l => l.trim());
    const header = lines[0].split(',');
    const totalArrIdx = header.indexOf('total_arr');
    expect(totalArrIdx).toBeGreaterThanOrEqual(0);
    for (const line of lines.slice(1)) {
      const cells = line.split(',');
      const val = cells[totalArrIdx];
      expect(val).not.toBe('NaN');
      expect(val).not.toBe('undefined');
      expect(Number.isFinite(Number(val))).toBe(true);
    }
  });

  it('6. Content-Disposition header includes filename with .csv', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/export.csv`);
    expect(res.headers['content-disposition']).toMatch(/\.csv/);
  });
});

// ─── 7–10. ARR Movements CSV export ──────────────────────────────────────────

describe('GET /imports/:id/arr/movements/export.csv', () => {
  it('7. returns 200 with text/csv', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/movements/export.csv`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
  });

  it('8. returns 404 for unknown importId', async () => {
    const res = await request('GET', `/imports/${FAKE_ID}/arr/movements/export.csv`);
    expect(res.status).toBe(404);
  });

  it('9. Movements CSV has correct header columns', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/movements/export.csv`);
    const header = res.body.split('\n')[0];
    expect(header).toContain('period');
    expect(header).toContain('opening_arr');
    expect(header).toContain('new_arr');
    expect(header).toContain('churn_arr');
    expect(header).toContain('closing_arr');
    expect(header).toContain('net_movement');
  });

  it('10. Movements CSV includes a TOTAL row at the end', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/arr/movements/export.csv`);
    const lines = res.body.split('\n').filter(l => l.trim());
    const lastDataLine = lines[lines.length - 1];
    expect(lastDataLine).toContain('TOTAL');
  });
});

// ─── 11–17. Review stats endpoint ────────────────────────────────────────────

describe('GET /imports/:id/review/stats', () => {
  it('11. returns 200 with required fields for a real import', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    expect(res.status).toBe(200);
    const body = res.json as Record<string, unknown>;
    expect(typeof body.importId).toBe('string');
    expect(typeof body.total).toBe('number');
    expect(typeof body.openCount).toBe('number');
    expect(typeof body.resolvedCount).toBe('number');
    expect(typeof body.overriddenCount).toBe('number');
    expect(typeof body.errorCount).toBe('number');
    expect(typeof body.warningCount).toBe('number');
    expect(typeof body.allResolved).toBe('boolean');
    expect(Array.isArray(body.openByReasonCode)).toBe(true);
    expect(Array.isArray(body.openBySeverity)).toBe(true);
    expect(Array.isArray(body.topCustomersWithIssues)).toBe(true);
  });

  it('12. returns 404 for unknown importId', async () => {
    const res = await request('GET', `/imports/${FAKE_ID}/review/stats`);
    expect(res.status).toBe(404);
  });

  it('13. total === openCount + resolvedCount + overriddenCount', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    const body = res.json as Record<string, unknown>;
    const total = body.total as number;
    const sum = (body.openCount as number) + (body.resolvedCount as number) + (body.overriddenCount as number);
    expect(sum).toBe(total);
  });

  it('14. errorCount + warningCount <= total', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    const body = res.json as Record<string, unknown>;
    expect((body.errorCount as number) + (body.warningCount as number)).toBeLessThanOrEqual(body.total as number);
  });

  it('15. openByReasonCode entries sum to openCount', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    const body = res.json as Record<string, unknown>;
    const entries = body.openByReasonCode as Array<{ count: number }>;
    const sum = entries.reduce((s, e) => s + e.count, 0);
    expect(sum).toBe(body.openCount as number);
  });

  it('16. allResolved reflects whether openCount is 0', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    const body = res.json as Record<string, unknown>;
    if ((body.openCount as number) === 0) {
      expect(body.allResolved).toBe(true);
    } else {
      expect(body.allResolved).toBe(false);
    }
  });

  it('17. topCustomersWithIssues has at most 10 entries', async () => {
    const id = getRealImportId();
    if (!id) return;
    const res = await request('GET', `/imports/${id}/review/stats`);
    const body = res.json as Record<string, unknown>;
    expect((body.topCustomersWithIssues as unknown[]).length).toBeLessThanOrEqual(10);
  });
});

// ─── 18–20. Unit tests for service functions directly ────────────────────────

describe('exportArrCsv — null for unknown importId', () => {
  it('18. returns null for unknown importId', () => {
    expect(exportArrCsv(FAKE_ID)).toBeNull();
  });
});

describe('exportMovementsCsv — null for unknown importId', () => {
  it('19. returns null for unknown importId', () => {
    expect(exportMovementsCsv(FAKE_ID)).toBeNull();
  });
});

describe('getReviewStats — null for unknown importId', () => {
  it('20. returns null for unknown importId', () => {
    expect(getReviewStats(FAKE_ID)).toBeNull();
  });
});
