/**
 * HTTP server layer tests — session 5 (2026-04-02)
 *
 * Tests the server.ts route handlers for:
 *   1. GET /health — 200 + {status: 'ok', ts: <ISO>}
 *   2. GET /imports — 200, returns {imports:[]}  (may have real data)
 *   3. GET /imports/:id/summary — 404 for unknown id
 *   4. GET /imports/:id/arr — 404 for unknown id
 *   5. GET /imports/:id/arr/movements — 404 for unknown id
 *   6. GET /imports/:id/review — 404 for unknown id
 *   7. GET /imports/:id/customers — 404 for unknown id
 *   8. GET /imports/:id/customers/:name — 404 for unknown id
 *   9. DELETE /imports/:id — 404 for unknown id
 *  10. PATCH /imports/:id/review/:itemId — 400 when action missing (no body)
 *  11. PATCH /imports/:id/review/:itemId — 400 when action is 'override' with no note
 *  12. POST /imports/:id/review/bulk-resolve — 400 when action missing
 *  13. POST /imports/:id/review/bulk-resolve — 400 when action is 'override' with no note
 *  14. POST /imports (JSON body) — 422 when filePath points to non-existent file
 *  15. POST /imports (JSON body) — 400 when body lacks filePath
 *  16. GET  /unknown-route — 404
 *  17. OPTIONS /imports — 204 preflight
 *  18. POST /imports — 415 when Content-Type is unsupported
 *
 * Strategy: Start the server on a random port (process.env.PORT override),
 * make real HTTP requests using Node's built-in http module, then close.
 */

import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

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
  body?: string | Buffer,
  headers?: http.OutgoingHttpHeaders,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
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

// ─── Server lifecycle ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Pick an arbitrary free port in the test range so we don't clash with dev server
  port = 13901;
  process.env['PORT'] = String(port);

  // Dynamic import so the module picks up the PORT env var
  serverModule = await import('../server.js');

  // Wait briefly for the server to begin listening
  await new Promise<void>((resolve) => {
    if (serverModule.default.listening) { resolve(); return; }
    serverModule.default.once('listening', resolve);
  });
}, 10_000);

afterAll(() => {
  serverModule?.default?.close();
});

// ─── 1. GET /health ───────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request('GET', '/health');
    expect(res.status).toBe(200);
    const body = res.json as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(typeof body.ts).toBe('string');
    // ts should be a valid ISO timestamp
    expect(() => new Date(body.ts as string)).not.toThrow();
  });

  it('returns Content-Type application/json', async () => {
    const res = await request('GET', '/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('includes Access-Control-Allow-Origin: *', async () => {
    const res = await request('GET', '/health');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('includes storage diagnostics for staging smoke checks', async () => {
    const res = await request('GET', '/health');
    const body = res.json as { storage?: Record<string, unknown> };
    expect(body.storage?.kind).toBe('file');
    expect(typeof body.storage?.writable).toBe('boolean');
    expect(typeof body.storage?.importCount).toBe('number');
    expect(['ephemeral-risk', 'configured-file-storage']).toContain(body.storage?.durability);
  });
});

// ─── 1b. GET /health/storage ──────────────────────────────────────────────────

describe('GET /health/storage', () => {
  it('returns storage diagnostics', async () => {
    const res = await request('GET', '/health/storage');
    expect(res.status).toBe(200);
    const body = res.json as Record<string, unknown>;
    expect(body.kind).toBe('file');
    expect(typeof body.dataDirConfigured).toBe('boolean');
    expect(typeof body.writable).toBe('boolean');
  });
});

// ─── 1c. Direct SPA URLs ─────────────────────────────────────────────────────

describe('GET direct SPA URLs', () => {
  it('redirects /dashboard/:id to the frontend hash route instead of API 404', async () => {
    const res = await request('GET', `/dashboard/${FAKE_ID}`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/#/dashboard/${FAKE_ID}`);
  });

  it('preserves query strings when redirecting direct SPA URLs', async () => {
    const res = await request('GET', `/review/${FAKE_ID}?status=open`);
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`/#/review/${FAKE_ID}?status=open`);
  });
});

// ─── 2. GET /imports ──────────────────────────────────────────────────────────

describe('GET /imports', () => {
  // BUG #7 fixed: store.ts now excludes .overrides.json files from loadAllImports().
  it('returns 200 with an imports array', async () => {
    const res = await request('GET', '/imports');
    expect(res.status).toBe(200);
    const body = res.json as Record<string, unknown>;
    expect(Array.isArray(body.imports)).toBe(true);
  });

  it('imports array entries have expected shape', async () => {
    const res = await request('GET', '/imports');
    const body = res.json as { imports: Array<Record<string, unknown>> };
    for (const entry of body.imports) {
      expect(typeof entry.importId).toBe('string');
      expect(typeof entry.importedAt).toBe('string');
      expect(typeof entry.totalRows).toBe('number');
    }
  });
});

// ─── 3–9. 404 for unknown importId ───────────────────────────────────────────

describe('404 routes for unknown importId', () => {
  const unknown = FAKE_ID;

  it('GET /imports/:id/summary → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/summary`);
    expect(res.status).toBe(404);
    const body = res.json as Record<string, unknown>;
    expect(body.code).toBe('NOT_FOUND');
  });

  it('GET /imports/:id/arr → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/arr`);
    expect(res.status).toBe(404);
  });

  it('GET /imports/:id/arr/movements → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/arr/movements`);
    expect(res.status).toBe(404);
  });

  it('GET /imports/:id/review → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/review`);
    expect(res.status).toBe(404);
  });

  it('GET /imports/:id/customers → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/customers`);
    expect(res.status).toBe(404);
  });

  it('GET /imports/:id/customers/:name → 404', async () => {
    const res = await request('GET', `/imports/${unknown}/customers/SomeCorp`);
    expect(res.status).toBe(404);
  });

  it('DELETE /imports/:id → 404', async () => {
    const res = await request('DELETE', `/imports/${unknown}`);
    expect(res.status).toBe(404);
  });
});

// ─── 10–11. PATCH review item ─────────────────────────────────────────────────

describe('PATCH /imports/:id/review/:itemId — validation', () => {
  it('400 with INVALID_ACTION when body has no action field', async () => {
    const res = await request('PATCH', `/imports/${FAKE_ID}/review/item-001`, JSON.stringify({}));
    expect(res.status).toBe(400);
    const body = res.json as Record<string, unknown>;
    expect(body.code).toBe('INVALID_ACTION');
  });

  it('400 with INVALID_ACTION when action is unknown string', async () => {
    const res = await request('PATCH', `/imports/${FAKE_ID}/review/item-001`, JSON.stringify({ action: 'delete' }));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('INVALID_ACTION');
  });

  it('400 with NOTE_REQUIRED when action=override but no note', async () => {
    const res = await request('PATCH', `/imports/${FAKE_ID}/review/item-001`, JSON.stringify({ action: 'override' }));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('NOTE_REQUIRED');
  });

  it('400 with NOTE_REQUIRED when note is whitespace-only', async () => {
    const res = await request('PATCH', `/imports/${FAKE_ID}/review/item-001`, JSON.stringify({ action: 'override', note: '   ' }));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('NOTE_REQUIRED');
  });

  it('404 when action=resolve but importId does not exist', async () => {
    const res = await request('PATCH', `/imports/${FAKE_ID}/review/item-001`, JSON.stringify({ action: 'resolve' }));
    expect(res.status).toBe(404);
  });
});

// ─── 12–13. POST bulk-resolve ─────────────────────────────────────────────────

describe('POST /imports/:id/review/bulk-resolve — validation', () => {
  it('400 when action is missing', async () => {
    const res = await request('POST', `/imports/${FAKE_ID}/review/bulk-resolve`, JSON.stringify({}));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('INVALID_ACTION');
  });

  it('400 when action=override but no note', async () => {
    const res = await request('POST', `/imports/${FAKE_ID}/review/bulk-resolve`, JSON.stringify({ action: 'override' }));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('NOTE_REQUIRED');
  });

  it('404 when action=resolve but importId does not exist', async () => {
    const res = await request('POST', `/imports/${FAKE_ID}/review/bulk-resolve`, JSON.stringify({ action: 'resolve' }));
    expect(res.status).toBe(404);
  });
});

// ─── 14–15. POST /imports — file-based upload ─────────────────────────────────

describe('POST /imports — JSON body upload', () => {
  it('422 when filePath refers to a file that does not exist', async () => {
    const res = await request('POST', '/imports', JSON.stringify({ filePath: '/does/not/exist.xlsx' }));
    expect(res.status).toBe(422);
    const body = res.json as Record<string, unknown>;
    // Should be an ImportError (FILE_NOT_FOUND or FILE_UNREADABLE)
    expect(typeof body.code).toBe('string');
    expect(typeof body.message).toBe('string');
  });

  it('400 when JSON body lacks filePath', async () => {
    const res = await request('POST', '/imports', JSON.stringify({ someOtherField: 'nope' }));
    expect(res.status).toBe(400);
    expect((res.json as Record<string, unknown>).code).toBe('MISSING_FILE_PATH');
  });
});

// ─── 16. Unknown route ────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('GET /unknown → 404 with NOT_FOUND code', async () => {
    const res = await request('GET', '/unknown-route');
    expect(res.status).toBe(404);
    expect((res.json as Record<string, unknown>).code).toBe('NOT_FOUND');
  });

  it('GET /imports/id-only (no sub-path, GET method) → 404', async () => {
    // GET /imports/:id with no sub is unhandled — falls through to catch-all
    const res = await request('GET', `/imports/${FAKE_ID}`);
    expect(res.status).toBe(404);
  });
});

// ─── 17. OPTIONS preflight ────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  it('OPTIONS /imports → 204 with CORS headers', async () => {
    const res = await request('OPTIONS', '/imports');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.headers['access-control-allow-methods']).toMatch(/POST/);
  });
});

// ─── 18. POST /imports — unsupported Content-Type ────────────────────────────

describe('POST /imports — unsupported media type', () => {
  it('415 when Content-Type is text/plain', async () => {
    const res = await request('POST', '/imports', 'some text', { 'Content-Type': 'text/plain' });
    expect(res.status).toBe(415);
    expect((res.json as Record<string, unknown>).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('415 when Content-Type is text/csv', async () => {
    const res = await request('POST', '/imports', 'col1,col2', { 'Content-Type': 'text/csv' });
    expect(res.status).toBe(415);
  });
});

// ─── 19. Admin audit/debug routes ────────────────────────────────────────────

describe('admin audit routes', () => {
  async function postAudit(tenantId: string, eventType: string, userEmail: string, extra: Record<string, unknown> = {}) {
    const res = await request('POST', `/tenants/${tenantId}/audit/activity`, JSON.stringify({
      eventType,
      clientId: `client-${tenantId}-${eventType}-${Date.now()}`,
      route: `/test/${eventType}`,
      targetLabel: extra.targetLabel ?? eventType,
      userEmail,
      ...extra,
    }), { 'X-User-Email': userEmail });
    expect(res.status).toBe(202);
  }

  it('redirects direct /admin/audit SPA URLs to the hash route', async () => {
    const res = await request('GET', '/admin/audit');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/#/admin/audit');
  });

  it('returns summaries and all-tenant events across tenants without breaking tenant endpoint', async () => {
    await postAudit('U', 'page_view', 'todd@example.com');
    await postAudit('admin', 'login_success', 'todd@example.com');
    await postAudit('U', 'upload_success', 'todd@example.com', { targetLabel: 'workbook.xlsx' });

    const summaries = await request('GET', '/admin/audit/tenants?limit=100');
    expect(summaries.status).toBe(200);
    const summaryBody = summaries.json as { tenants: Array<Record<string, unknown>> };
    const tenantIds = summaryBody.tenants.map((tenant) => tenant.tenantId);
    expect(tenantIds).toContain('U');
    expect(tenantIds).toContain('admin');
    const u = summaryBody.tenants.find((tenant) => tenant.tenantId === 'U');
    expect(u?.lastUserEmail).toBe('todd@example.com');
    expect(u?.lastUploadAt).toBeTruthy();
    expect((u?.links as Record<string, string>).events).toContain('tenantId=U');

    const allEvents = await request('GET', '/admin/audit/events?limit=100');
    expect(allEvents.status).toBe(200);
    expect((allEvents.json as { events: unknown[] }).events.length).toBeGreaterThanOrEqual(3);

    const tenantEvents = await request('GET', '/admin/audit/events?tenantId=U&limit=100');
    expect(tenantEvents.status).toBe(200);
    expect((tenantEvents.json as { events: Array<Record<string, unknown>> }).events.every((event) => event.tenantId === 'U')).toBe(true);

    const typeEvents = await request('GET', '/admin/audit/events?tenantId=U&type=upload_success&limit=100');
    expect(typeEvents.status).toBe(200);
    expect((typeEvents.json as { events: Array<Record<string, unknown>> }).events.every((event) => event.eventType === 'upload_success')).toBe(true);

    const aliasEvents = await request('GET', '/admin/audit/events?tenantId=U&eventType=upload_success&limit=100');
    expect(aliasEvents.status).toBe(200);
    expect((aliasEvents.json as { events: Array<Record<string, unknown>> }).events.every((event) => event.eventType === 'upload_success')).toBe(true);

    const legacy = await request('GET', '/tenants/U/audit/events?limit=100');
    expect(legacy.status).toBe(200);
    expect((legacy.json as { tenantId: string; events: unknown[] }).tenantId).toBe('U');
  });

  it('caps admin audit event limits at 500', async () => {
    for (let i = 0; i < 3; i += 1) {
      await postAudit('limitcheck', 'ui_click', 'jim@example.com', { targetLabel: `button-${i}` });
    }
    const res = await request('GET', '/admin/audit/events?limit=9999');
    expect(res.status).toBe(200);
    expect((res.json as { events: unknown[] }).events.length).toBeLessThanOrEqual(500);
  });
});
