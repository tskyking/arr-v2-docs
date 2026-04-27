/**
 * Session 10 QA — customer route happy-path integration coverage
 * 2026-04-03
 *
 * Gap closed:
 * - Existing server tests only covered 404s for /imports/:id/customers and /imports/:id/customers/:name.
 * - This file verifies successful list/detail responses against a real sample workbook,
 *   plus tenant isolation for customer endpoints.
 */

import http from 'node:http';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const WORKSPACE = path.resolve(process.cwd(), '../../..');
const REAL_INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx',
);
const TEST_TENANT = 'qa-session10';
const OTHER_TENANT = 'qa-session10-other';

let port: number;
let importId: string;
let firstCustomerName: string;
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
  port = 13906;
  process.env['PORT'] = String(port);
  serverModule = await import('../server.js');

  await new Promise<void>((resolve) => {
    if (serverModule.default.listening) { resolve(); return; }
    serverModule.default.once('listening', resolve);
  });

  const upload = await request(
    'POST',
    `/tenants/${TEST_TENANT}/imports`,
    JSON.stringify({ filePath: REAL_INTERNAL_XLSX }),
  );

  expect(upload.status).toBe(200);
  importId = (upload.json as { importId: string }).importId;

  const list = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customers`);
  expect(list.status).toBe(200);
  const customers = (list.json as { customers: Array<{ name: string }> }).customers;
  expect(customers.length).toBeGreaterThan(0);
  firstCustomerName = customers[0].name;
}, 20_000);

afterAll(() => {
  serverModule?.default?.close();
});

describe('GET /tenants/:tenantId/imports/:id/customers', () => {
  it('returns 200 with customer list shape and totals', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customers`);
    expect(res.status).toBe(200);

    const body = res.json as {
      customers: Array<{
        name: string;
        currentArr: number;
        activeContracts: number;
        lastInvoiceDate: string;
        requiresReview: boolean;
      }>;
      total: number;
    };

    expect(body.total).toBe(body.customers.length);
    expect(body.customers.length).toBeGreaterThan(0);

    const first = body.customers[0];
    expect(typeof first.name).toBe('string');
    expect(typeof first.currentArr).toBe('number');
    expect(typeof first.activeContracts).toBe('number');
    expect(typeof first.lastInvoiceDate).toBe('string');
    expect(typeof first.requiresReview).toBe('boolean');
  });

  it('is sorted by currentArr descending', async () => {
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customers`);
    const body = res.json as { customers: Array<{ currentArr: number }> };

    for (let i = 0; i < body.customers.length - 1; i++) {
      expect(body.customers[i].currentArr).toBeGreaterThanOrEqual(body.customers[i + 1].currentArr);
    }
  });

  it('is tenant-isolated: same importId is not readable through another tenant', async () => {
    const res = await request('GET', `/tenants/${OTHER_TENANT}/imports/${importId}/customers`);
    expect(res.status).toBe(404);
    expect((res.json as Record<string, unknown>).code).toBe('NOT_FOUND');
  });
});

describe('GET /tenants/:tenantId/imports/:id/customers/:name', () => {
  it('returns 200 for a real customer name using URL encoding', async () => {
    const encoded = encodeURIComponent(firstCustomerName);
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customers/${encoded}`);
    expect(res.status).toBe(200);

    const body = res.json as {
      name: string;
      currentArr: number;
      peakArr: number;
      firstSeenPeriod: string;
      lastActivePeriod: string;
      arrHistory: Array<{ period: string; arr: number }>;
      requiresReview: boolean;
      openReviewCount: number;
    };

    expect(body.name).toBe(firstCustomerName);
    expect(body.arrHistory.length).toBeGreaterThan(0);
    expect(body.peakArr).toBeGreaterThanOrEqual(body.currentArr);
    expect(typeof body.requiresReview).toBe('boolean');
    expect(typeof body.openReviewCount).toBe('number');
  });

  it('keeps arrHistory sorted chronologically', async () => {
    const encoded = encodeURIComponent(firstCustomerName);
    const res = await request('GET', `/tenants/${TEST_TENANT}/imports/${importId}/customers/${encoded}`);
    const body = res.json as { arrHistory: Array<{ period: string }> };

    for (let i = 0; i < body.arrHistory.length - 1; i++) {
      expect(body.arrHistory[i].period <= body.arrHistory[i + 1].period).toBe(true);
    }
  });

  it('returns 404 through another tenant even with a valid encoded customer name', async () => {
    const encoded = encodeURIComponent(firstCustomerName);
    const res = await request('GET', `/tenants/${OTHER_TENANT}/imports/${importId}/customers/${encoded}`);
    expect(res.status).toBe(404);
    expect((res.json as Record<string, unknown>).code).toBe('NOT_FOUND');
  });
});
