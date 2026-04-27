/**
 * Session 11 QA — customer cube route coverage using the seeded demo workbook
 * 2026-04-04
 *
 * Verifies:
 * - the public seeded demo workbook imports successfully through the real API
 * - GET /customer-cube returns audit-friendly shape + traceability fields
 * - GET /customer-cube/export.csv returns a downloadable CSV with expected headers
 * - tenant isolation applies to customer cube routes
 */

import http from 'node:http';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const WORKSPACE = path.resolve(process.cwd(), '../../..');
const DEMO_WORKBOOK = path.join(
  WORKSPACE,
  'apps/arr-v2/frontend/public/demo/arr-v2-demo-import.xlsx',
);
const TEST_TENANT = 'qa-session11';
const OTHER_TENANT = 'qa-session11-other';

let port: number;
let importId: string;
let serverModule: { default: http.Server };

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: unknown;
}

function request(
  method: string,
  routePath: string,
  body?: string | Buffer,
  headers?: http.OutgoingHttpHeaders,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path: routePath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
        ...headers,
      },
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

beforeAll(async () => {
  port = 13907;
  process.env['PORT'] = String(port);
  serverModule = await import('../server.js');

  await new Promise<void>((resolve) => {
    if (serverModule.default.listening) { resolve(); return; }
    serverModule.default.once('listening', resolve);
  });

  const upload = await request(
    'POST',
    `/tenants/${TEST_TENANT}/imports`,
    JSON.stringify({ filePath: DEMO_WORKBOOK }),
  );

  expect(upload.status).toBe(200);
  importId = (upload.json as { importId: string }).importId;
}, 20_000);

afterAll(() => {
  serverModule?.default?.close();
});

describe('GET /tenants/:tenantId/imports/:id/customer-cube', () => {
  it('returns 200 with audit-friendly cube structure', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customer-cube`);
    expect(res.status).toBe(200);

    const body = res.json as {
      importId: string;
      fromDate: string;
      toDate: string;
      periods: string[];
      summary: {
        trackedCustomers: number;
        trackedRows: number;
        trackedProductServices: number;
        openingArr: number;
        closingArr: number;
        netChange: number;
      };
      rows: Array<{
        customerName: string;
        productService: string;
        category: string;
        sourceInvoiceNumbers: string[];
        sourceRowNumbers: number[];
        periods: Array<{ period: string; arr: number }>;
        openingArr: number;
        closingArr: number;
        netChange: number;
        movement: string;
        requiresReview: boolean;
      }>;
    };

    expect(body.importId).toBe(importId);
    expect(body.periods.length).toBeGreaterThan(0);
    expect(body.summary.trackedCustomers).toBeGreaterThan(0);
    expect(body.summary.trackedRows).toBeGreaterThan(0);

    const first = body.rows[0];
    expect(typeof first.customerName).toBe('string');
    expect(typeof first.productService).toBe('string');
    expect(typeof first.category).toBe('string');
    expect(Array.isArray(first.sourceInvoiceNumbers)).toBe(true);
    expect(Array.isArray(first.sourceRowNumbers)).toBe(true);
    expect(Array.isArray(first.periods)).toBe(true);
    expect(first.periods.length).toBe(body.periods.length);
    expect(typeof first.openingArr).toBe('number');
    expect(typeof first.closingArr).toBe('number');
    expect(typeof first.netChange).toBe('number');
    expect(['New', 'Expansion', 'Contraction', 'Churn', 'Flat']).toContain(first.movement);
    expect(typeof first.requiresReview).toBe('boolean');
  });

  it('supports date filtering and keeps period columns aligned', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customer-cube?from=2026-01&to=2026-03`);
    expect(res.status).toBe(200);

    const body = res.json as {
      periods: string[];
      rows: Array<{ periods: Array<{ period: string; arr: number }> }>;
    };

    expect(body.periods).toEqual(['2026-01', '2026-02', '2026-03']);
    for (const row of body.rows) {
      expect(row.periods.map(period => period.period)).toEqual(body.periods);
    }
  });

  it('returns an empty cube when the requested date window has no overlapping periods', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customer-cube?from=2030-01&to=2030-03`);
    expect(res.status).toBe(200);

    const body = res.json as {
      periods: string[];
      summary: {
        trackedCustomers: number;
        trackedRows: number;
        trackedProductServices: number;
        openingArr: number;
        closingArr: number;
        netChange: number;
      };
      rows: Array<{ periods: Array<{ period: string; arr: number }> }>;
    };

    expect(body.periods).toEqual([]);
    expect(body.rows).toEqual([]);
    expect(body.summary).toEqual({
      trackedCustomers: 0,
      trackedRows: 0,
      trackedProductServices: 0,
      openingArr: 0,
      closingArr: 0,
      netChange: 0,
    });
  });

  it('is tenant-isolated', async () => {
    const res = await request('GET', `/tenants/${OTHER_TENANT}/imports/${importId}/customer-cube`);
    expect(res.status).toBe(404);
    expect((res.json as Record<string, unknown>).code).toBe('NOT_FOUND');
  });
});

describe('GET /tenants/:tenantId/imports/:id/customer-cube/export.csv', () => {
  it('returns 200 CSV with traceability-oriented headers', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customer-cube/export.csv?from=2026-01&to=2026-03`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/customer-cube-/);

    const lines = res.body.trim().split('\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]).toContain('customer_name');
    expect(lines[0]).toContain('product_service');
    expect(lines[0]).toContain('source_invoice_numbers');
    expect(lines[0]).toContain('source_row_numbers');
    expect(lines[0]).toContain('2026-01');
    expect(lines[0]).toContain('2026-03');
  });

  it('is tenant-isolated for CSV export too', async () => {
    const res = await request('GET', `/tenants/${OTHER_TENANT}/imports/${importId}/customer-cube/export.csv`);
    expect(res.status).toBe(404);
    expect((res.json as Record<string, unknown>).code).toBe('NOT_FOUND');
  });
});
