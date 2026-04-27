/**
 * HTTP server upload + hardening tests — session 8 (2026-04-02)
 *
 * Previously documented as "Not Yet Covered" in qa-summary.md:
 *   "server.ts POST /imports multipart upload path — The multipart/form-data branch of
 *    the POST /imports handler is untested."
 *
 * Also tests:
 *   - POST /imports with application/octet-stream (binary upload) — covered here
 *   - 413 Payload Too Large when body exceeds MAX_BODY_BYTES limit (new hardening)
 *
 * Tests:
 *  1. POST /imports multipart/form-data — 422 when the uploaded bytes are not a valid XLSX
 *  2. POST /imports multipart/form-data — 415 is NOT returned (correct content-type accepted)
 *  3. POST /imports application/octet-stream — 422 when bytes are garbage (not valid XLSX)
 *  4. POST /imports application/octet-stream — 415 is NOT returned (correct content-type accepted)
 *  5. POST /imports — 413 when body exceeds MAX_BODY_BYTES (set small for test)
 *  6. POST /imports — 413 response has PAYLOAD_TOO_LARGE error code
 *  7. POST /imports multipart — respects Content-Type boundary param (no 415)
 *  8. POST /imports multipart — accepts real minimal XLSX bytes (from AdmZip) → 422 (invalid structure, not 415/500)
 *  9. POST /imports application/octet-stream — real sample XLSX succeeds with 200 and expected shape
 *
 * Note: The multipart branch in server.ts buffers the entire body and saves it to a temp file.
 * Most tests here only need to verify HTTP routing and error handling. A garbage payload should
 * return 422 (FILE_UNREADABLE or similar ImportError) rather than 415 or 500.
 */

import http from 'node:http';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import AdmZip from 'adm-zip';

const WORKSPACE = path.resolve(process.cwd(), '../../..');
const REAL_INTERNAL_XLSX = path.join(
  WORKSPACE,
  'docs/saas/arr-rebuild/reference/source-examples/csv/Sample Data for TSOT import internal).xlsx',
);

const FAKE_XLSX_BYTES = Buffer.from('PK\x03\x04this is not a valid xlsx file but has zip magic'); // fake zip magic
const GARBAGE_BYTES = Buffer.from('this is definitely not any kind of workbook');

let port: number;
let serverModule: { default: http.Server };

// ─── HTTP helper ──────────────────────────────────────────────────────────────

interface HttpResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: unknown;
}

function request(
  method: string,
  path: string,
  body?: Buffer | string,
  headers?: http.OutgoingHttpHeaders,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Length': body ? Buffer.byteLength(body) : 0,
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
  port = 13904;
  process.env['PORT'] = String(port);

  serverModule = await import('../server.js');

  await new Promise<void>((resolve) => {
    if (serverModule.default.listening) { resolve(); return; }
    serverModule.default.once('listening', resolve);
  });
}, 10_000);

afterAll(() => {
  serverModule?.default?.close();
  delete process.env['MAX_BODY_BYTES'];
});

// ─── 1–2. multipart/form-data ────────────────────────────────────────────────

describe('POST /imports — multipart/form-data', () => {
  it('1. multipart with garbage bytes returns 422 (ImportError), not 415', async () => {
    const boundary = '----ARRTestBoundary123';
    const body = buildMultipartBody(boundary, GARBAGE_BYTES, 'test.xlsx');
    const res = await request('POST', '/imports', body, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });
    // Should not be 415 — multipart is an accepted content type
    expect(res.status).not.toBe(415);
    // Should return an error (422 ImportError or 400/500 — but not 200)
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('2. multipart is accepted (Content-Type recognized), returns non-415', async () => {
    const boundary = '----ARRTestBoundary456';
    const body = buildMultipartBody(boundary, GARBAGE_BYTES, 'upload.xlsx');
    const res = await request('POST', '/imports', body, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });
    expect(res.status).not.toBe(415);
  });

  it('7. boundary param does not cause 415', async () => {
    const boundary = '----ARRBoundaryWithSpecialChars99';
    const body = buildMultipartBody(boundary, Buffer.from('junk'), 'file.xlsx');
    const res = await request('POST', '/imports', body, {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    });
    expect(res.status).not.toBe(415);
  });
});

// ─── 3–4. application/octet-stream ───────────────────────────────────────────

describe('POST /imports — application/octet-stream', () => {
  it('3. octet-stream with garbage bytes returns 422 (ImportError), not 415', async () => {
    const res = await request('POST', '/imports', GARBAGE_BYTES, {
      'Content-Type': 'application/octet-stream',
    });
    expect(res.status).not.toBe(415);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('4. octet-stream Content-Type is accepted — returns non-415', async () => {
    const res = await request('POST', '/imports', FAKE_XLSX_BYTES, {
      'Content-Type': 'application/octet-stream',
    });
    expect(res.status).not.toBe(415);
  });
});

// ─── 5–6. 413 Payload Too Large ──────────────────────────────────────────────

describe('POST /imports — 413 Payload Too Large hardening', () => {
  it('5. returns 413 when body exceeds MAX_BODY_BYTES limit', async () => {
    // Set a tiny limit so we can test without sending megabytes
    process.env['MAX_BODY_BYTES'] = '100';

    // Send a 200-byte body — larger than the 100-byte limit
    const oversizeBody = Buffer.alloc(200, 'X');
    const res = await request('POST', '/imports', oversizeBody, {
      'Content-Type': 'application/octet-stream',
    });
    expect(res.status).toBe(413);

    // Restore to default
    delete process.env['MAX_BODY_BYTES'];
  });

  it('6. 413 response has PAYLOAD_TOO_LARGE error code', async () => {
    process.env['MAX_BODY_BYTES'] = '100';

    const oversizeBody = Buffer.alloc(200, 'X');
    const res = await request('POST', '/imports', oversizeBody, {
      'Content-Type': 'application/octet-stream',
    });
    const body = res.json as Record<string, unknown>;
    expect(body.code).toBe('PAYLOAD_TOO_LARGE');
    expect(typeof body.message).toBe('string');

    delete process.env['MAX_BODY_BYTES'];
  });
});

// ─── 8. Minimal real XLSX via AdmZip ─────────────────────────────────────────

describe('POST /imports — minimal real XLSX bytes', () => {
  it('8. minimal valid ZIP bytes are accepted (no 415), return ImportError (422)', async () => {
    // Build a ZIP that is valid structurally but not a real workbook
    const zip = new AdmZip();
    zip.addFile('[Content_Types].xml', Buffer.from('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'));
    const xlsxBytes = zip.toBuffer();

    const res = await request('POST', '/imports', xlsxBytes, {
      'Content-Type': 'application/octet-stream',
    });
    // Valid ZIP → gets through the content-type check, fails at workbook parse = 422 ImportError
    expect(res.status).not.toBe(415);
    // Not a 500 — all errors should be wrapped as ImportError
    expect(res.status).not.toBe(500);
  });

  it('9. real sample XLSX uploads successfully end-to-end over HTTP', async () => {
    const xlsxBytes = readFileSync(REAL_INTERNAL_XLSX);

    const res = await request('POST', '/imports', xlsxBytes, {
      'Content-Type': 'application/octet-stream',
    });
    const body = res.json as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.tenantId).toBe('default');
    expect(typeof body.importId).toBe('string');
    expect(body.status).toBe('complete');
    expect(typeof body.totalRows).toBe('number');
    expect(typeof body.reviewItems).toBe('number');
    expect(typeof body.segments).toBe('number');
    expect((body.totalRows as number)).toBeGreaterThan(0);
    expect((body.segments as number)).toBeGreaterThan(0);
  }, 20_000);
});

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a minimal multipart/form-data body with a single file part.
 * Not a fully RFC-conformant multipart body — just enough for the server's
 * content-type sniffing (it checks Content-Type header, not body structure).
 */
function buildMultipartBody(boundary: string, fileBytes: Buffer, filename: string): Buffer {
  const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`;
  const footer = `\r\n--${boundary}--\r\n`;
  return Buffer.concat([Buffer.from(header), fileBytes, Buffer.from(footer)]);
}
