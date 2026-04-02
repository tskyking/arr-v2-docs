/**
 * ARR V2 API Server
 * Minimal HTTP server using Node's built-in http module — no framework dependency yet.
 * Routes:
 *   POST /imports                              — upload and process a workbook
 *   GET  /imports                              — list imports
 *   GET  /imports/:id/summary                 — import summary
 *   GET  /imports/:id/arr                     — ARR timeseries (JSON)
 *   GET  /imports/:id/arr/export.csv          — ARR timeseries CSV export
 *   GET  /imports/:id/arr/movements           — period-over-period ARR waterfall (new/expansion/contraction/churn)
 *   GET  /imports/:id/arr/movements/export.csv — ARR movements CSV export
 *   GET  /imports/:id/review                  — review queue
 *   GET  /imports/:id/review/stats            — review queue statistics (open/resolved/by-reason)
 *   PATCH /imports/:id/review/:itemId          — resolve or override a review item
 *   POST /imports/:id/review/bulk-resolve      — bulk-resolve open review items
 *   GET  /imports/:id/customers               — customer list with current ARR
 *   GET  /imports/:id/customers/:name         — customer detail: ARR history + review summary
 *   DELETE /imports/:id                       — remove an import
 *   GET  /health                              — health check
 *
 * Hardening:
 *   - Request body size limit: MAX_BODY_BYTES (default 50 MB). Requests exceeding this
 *     receive a 413 Payload Too Large before the body is fully buffered.
 */

import http from 'node:http';
import { createReadStream } from 'node:fs';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  processImport,
  getImportSummary,
  getArrTimeseries,
  getArrMovements,
  getReviewQueue,
  getReviewStats,
  patchReviewItem,
  bulkResolveReview,
  listImports,
  removeImport,
  getCustomerList,
  getCustomerDetail,
  exportArrCsv,
  exportMovementsCsv,
} from './importService.js';
import { ImportError } from '../../imports/src/importErrors.js';

const PORT = Number(process.env.PORT ?? 3001);

/**
 * Maximum allowed request body size in bytes (default 50 MB).
 * Prevents unbounded memory allocation on large or malicious uploads.
 * Override via MAX_BODY_BYTES env var for deployments with different limits.
 * Read per-request so tests can override the value via process.env without reloading the module.
 */
function getMaxBodyBytes(): number {
  const v = process.env['MAX_BODY_BYTES'];
  if (v !== undefined) {
    const n = Number(v);
    if (!isNaN(n) && n > 0) return n;
  }
  return 50 * 1024 * 1024; // 50 MB default
}

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function csvResponse(res: http.ServerResponse, filename: string, csvBody: string) {
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(csvBody);
}

function err(res: http.ServerResponse, status: number, code: string, message: string) {
  json(res, status, { code, message });
}

/**
 * Buffer the full request body up to MAX_BODY_BYTES.
 *
 * Size enforcement strategy:
 *   1. Fast path: if Content-Length header is present and exceeds the limit, reject immediately
 *      without buffering any data (drain the socket to prevent connection hang).
 *   2. Streaming path: accumulate chunks; reject as soon as the running total exceeds the limit
 *      (drains remaining data so the connection is cleanly closed and the caller can still
 *      write a 413 response on the same socket).
 */
async function parseBody(req: http.IncomingMessage): Promise<Buffer> {
  const maxBytes = getMaxBodyBytes();

  // Fast path: check Content-Length header before reading anything
  const contentLength = Number(req.headers['content-length']);
  if (!isNaN(contentLength) && contentLength > maxBytes) {
    // Drain the socket so the connection can be cleanly reused / closed
    req.resume();
    const e = new Error('Request body exceeds size limit') as Error & { tooLarge: boolean };
    e.tooLarge = true;
    return Promise.reject(e);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let limitExceeded = false;

    req.on('data', (chunk: Buffer) => {
      if (limitExceeded) return; // drain only — don't accumulate
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        limitExceeded = true;
        // Drain remaining data so the response can still be sent on the same socket
        req.resume();
        const e = new Error('Request body exceeds size limit') as Error & { tooLarge: boolean };
        e.tooLarge = true;
        reject(e);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!limitExceeded) resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      if (!limitExceeded) reject(err);
    });
  });
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method ?? 'GET';

  // OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    // Health
    if (path === '/health' && method === 'GET') {
      json(res, 200, { status: 'ok', ts: new Date().toISOString() });
      return;
    }

    // ── Tenant-scoped routes (/tenants/:tenantId/...) ──────────────────────
    // All data access requires a tenantId. No cross-tenant access is possible.
    // For MVP single-tenant deployments, use tenantId = 'default'.

    // Extract tenant from path: /tenants/:tenantId/... or legacy /imports/... (default tenant)
    let tenantId = 'default';
    let routePath = path;

    const tenantMatch = path.match(/^\/tenants\/([^/]+)(\/.*)$/);
    if (tenantMatch) {
      const rawTenantId = tenantMatch[1];
      // Validate tenantId — must be alphanumeric/hyphen/underscore only
      if (!/^[a-zA-Z0-9_-]+$/.test(rawTenantId)) {
        err(res, 400, 'INVALID_TENANT_ID', 'Tenant ID must be alphanumeric (hyphens and underscores allowed)'); return;
      }
      tenantId = rawTenantId;
      routePath = tenantMatch[2]; // strip /tenants/:tenantId prefix
    }

    // List imports
    if (routePath === '/imports' && method === 'GET') {
      json(res, 200, { tenantId, imports: listImports(tenantId) });
      return;
    }

    // Upload + process import
    if (routePath === '/imports' && method === 'POST') {
      const contentType = req.headers['content-type'] ?? '';
      let filePath: string;
      let tempFile = false;

      if (contentType.includes('application/json')) {
        // Accept { filePath: "..." } for local testing
        const body = await parseBody(req);
        const data = JSON.parse(body.toString());
        if (!data.filePath) { err(res, 400, 'MISSING_FILE_PATH', 'filePath required'); return; }
        filePath = data.filePath;
      } else if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
        // Save uploaded file to tmp
        const tmpPath = join(tmpdir(), `arr-import-${randomUUID()}.xlsx`);
        const body = await parseBody(req);
        await writeFile(tmpPath, body);
        filePath = tmpPath;
        tempFile = true;
      } else {
        err(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON {filePath} or multipart/form-data'); return;
      }

      try {
        const result = processImport(tenantId, filePath);
        json(res, 200, {
          tenantId,
          importId: result.importId,
          status: 'complete',
          totalRows: result.bundle.normalizedRows.length,
          reviewItems: result.bundle.reviewItems.length,
          segments: result.segments.length,
        });
      } finally {
        if (tempFile) await unlink(filePath).catch(() => {});
      }
      return;
    }

    // /imports/:id/*  (tenant context already resolved above)
    const importMatch = routePath.match(/^\/imports\/([^/]+)(\/.*)?$/);
    if (importMatch) {
      const importId = importMatch[1];
      const sub = importMatch[2] ?? '';

      if (sub === '/summary' && method === 'GET') {
        const summary = getImportSummary(tenantId, importId);
        if (!summary) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, summary);
        return;
      }

      if (sub === '/arr' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const ts = getArrTimeseries(tenantId, importId, from, to);
        if (!ts) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, ts);
        return;
      }

      if (sub === '/arr/movements' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const movements = getArrMovements(tenantId, importId, from, to);
        if (!movements) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, movements);
        return;
      }

      if (sub === '/arr/export.csv' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const csv = exportArrCsv(tenantId, importId, from, to);
        if (!csv) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        csvResponse(res, `arr-${importId.slice(0, 8)}.csv`, csv);
        return;
      }

      if (sub === '/arr/movements/export.csv' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const csv = exportMovementsCsv(tenantId, importId, from, to);
        if (!csv) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        csvResponse(res, `arr-movements-${importId.slice(0, 8)}.csv`, csv);
        return;
      }

      if (sub === '/review' && method === 'GET') {
        const status = url.searchParams.get('status') ?? undefined;
        const queue = getReviewQueue(tenantId, importId, status);
        if (!queue) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, queue);
        return;
      }

      if (sub === '' && method === 'DELETE') {
        const removed = removeImport(tenantId, importId);
        if (!removed) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, { deleted: true, importId });
        return;
      }

      if (sub === '/customers' && method === 'GET') {
        const list = getCustomerList(tenantId, importId);
        if (!list) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, list);
        return;
      }

      const customerDetailMatch = sub.match(/^\/customers\/(.+)$/);
      if (customerDetailMatch && method === 'GET') {
        const customerName = decodeURIComponent(customerDetailMatch[1]);
        const detail = getCustomerDetail(tenantId, importId, customerName);
        if (!detail) { err(res, 404, 'NOT_FOUND', 'Customer not found in this import'); return; }
        json(res, 200, detail);
        return;
      }

      if (sub === '/review/stats' && method === 'GET') {
        const stats = getReviewStats(tenantId, importId);
        if (!stats) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, stats);
        return;
      }

      if (sub === '/review/bulk-resolve' && method === 'POST') {
        const body = await parseBody(req);
        let payload: { action?: string; note?: string; itemIds?: string[] } = {};
        try { payload = JSON.parse(body.toString()); } catch { /* ignore */ }

        if (payload.action !== 'resolve' && payload.action !== 'override') {
          err(res, 400, 'INVALID_ACTION', 'action must be "resolve" or "override"'); return;
        }
        if (payload.action === 'override' && !payload.note?.trim()) {
          err(res, 400, 'NOTE_REQUIRED', 'override requires a note'); return;
        }
        const result = bulkResolveReview(tenantId, importId, payload.action, payload.itemIds, payload.note);
        if (!result) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, result);
        return;
      }

      const reviewPatchMatch = sub.match(/^\/review\/(.+)$/);
      if (reviewPatchMatch && method === 'PATCH') {
        const itemId = reviewPatchMatch[1];
        const body = await parseBody(req);
        let payload: { action?: string; note?: string } = {};
        try { payload = JSON.parse(body.toString()); } catch { /* ignore */ }

        if (payload.action !== 'resolve' && payload.action !== 'override') {
          err(res, 400, 'INVALID_ACTION', 'action must be "resolve" or "override"'); return;
        }
        if (payload.action === 'override' && !payload.note?.trim()) {
          err(res, 400, 'NOTE_REQUIRED', 'override requires a note'); return;
        }
        const updated = patchReviewItem(tenantId, importId, itemId, payload.action, payload.note);
        if (!updated) { err(res, 404, 'NOT_FOUND', 'Review item not found'); return; }
        json(res, 200, updated);
        return;
      }
    }

    err(res, 404, 'NOT_FOUND', `No route: ${method} ${path}`);
  } catch (e: unknown) {
    if (e instanceof ImportError) {
      // Return human-readable import errors as 422 Unprocessable Entity — never expose raw internals
      console.warn('Import error:', e.code, e.detail ?? '');
      json(res, 422, e.toJSON());
    } else if (e instanceof Error && (e as Error & { tooLarge?: boolean }).tooLarge) {
      // Body exceeded MAX_BODY_BYTES — return 413 before any processing
      json(res, 413, { code: 'PAYLOAD_TOO_LARGE', message: `Request body exceeds the ${getMaxBodyBytes()}-byte limit.` });
    } else {
      // Unexpected server errors — log internally, return safe generic message
      console.error('Unexpected API error:', e);
      json(res, 500, {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again or contact support.',
      });
    }
  }
}

const server = http.createServer(handleRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ARR V2 API running on http://0.0.0.0:${PORT}`);
});

export default server;
