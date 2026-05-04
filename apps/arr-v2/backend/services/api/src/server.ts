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
 *   GET  /imports/:id/customer-cube           — customer x product x category x period ARR cube
 *   GET  /imports/:id/customer-cube/export.csv — customer cube CSV export
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
import { basename, join } from 'node:path';
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
  getCustomerCube,
  exportArrCsv,
  exportMovementsCsv,
  exportCustomerCubeCsv,
} from './importService.js';
import { ImportError } from '../../imports/src/importErrors.js';
import { getStorageDiagnostics, initStorage, listAuditEvents, saveAuditEvent, type AuditEvent } from './store.js';

const PORT = Number(process.env.PORT ?? 3001);
const API_PREFIX = normalizeApiPrefix(process.env.API_PREFIX ?? '');

function normalizeApiPrefix(prefix: string): string {
  const trimmed = prefix.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function stripApiPrefix(path: string): string {
  if (!API_PREFIX) return path;
  if (path === API_PREFIX) return '/';
  if (path.startsWith(`${API_PREFIX}/`)) return path.slice(API_PREFIX.length) || '/';
  return path;
}

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

function redirect(res: http.ServerResponse, location: string) {
  res.writeHead(302, {
    Location: location,
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(`Redirecting to ${location}`);
}

function getSpaHashRedirect(path: string, search: string): string | undefined {
  const spaRoutePrefixes = ['/import', '/dashboard', '/review', '/customers', '/customer-cube'];
  if (!spaRoutePrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return undefined;
  }
  return `/#${path}${search}`;
}

function getUserEmail(req: http.IncomingMessage): string | undefined {
  const header = req.headers['x-user-email'];
  if (Array.isArray(header)) return header[0];
  return header;
}

function firstHeader(req: http.IncomingMessage, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getRequestMeta(req: http.IncomingMessage): Pick<AuditEvent, 'sourceIp' | 'userAgent'> {
  const forwardedFor = firstHeader(req, 'x-forwarded-for')?.split(',')[0]?.trim();
  const sourceIp = forwardedFor
    || firstHeader(req, 'x-real-ip')
    || firstHeader(req, 'cf-connecting-ip')
    || req.socket.remoteAddress
    || undefined;
  return {
    ...(sourceIp ? { sourceIp: safeText(sourceIp, 80) } : {}),
    ...(req.headers['user-agent'] ? { userAgent: safeText(String(req.headers['user-agent']), 300) } : {}),
  };
}

function safeText(value: unknown, max = 160): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/[\r\n\t]+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

function safeAuditFilename(req: http.IncomingMessage, filePath?: string): string | undefined {
  const explicit = safeText(firstHeader(req, 'x-arr-filename') ?? firstHeader(req, 'x-upload-filename'), 240);
  if (explicit) {
    try { return basename(decodeURIComponent(explicit)); } catch { return basename(explicit); }
  }

  const disposition = firstHeader(req, 'content-disposition');
  const match = disposition?.match(/filename\*?=(?:UTF-8''|\")?([^";]+)/i);
  if (match?.[1]) {
    try { return basename(decodeURIComponent(match[1].replace(/"/g, ''))); } catch { return basename(match[1].replace(/"/g, '')); }
  }

  return filePath ? basename(filePath) : undefined;
}

function safeError(e: unknown): { errorCode: string; errorMessage: string } {
  if (e instanceof ImportError) {
    return { errorCode: e.code, errorMessage: e.userMessage };
  }
  if (e instanceof Error && (e as Error & { tooLarge?: boolean }).tooLarge) {
    return { errorCode: 'PAYLOAD_TOO_LARGE', errorMessage: `Request body exceeds the ${getMaxBodyBytes()}-byte limit.` };
  }
  if (e instanceof SyntaxError) {
    return { errorCode: 'INVALID_JSON', errorMessage: 'Request body was not valid JSON.' };
  }
  return { errorCode: 'INTERNAL_ERROR', errorMessage: 'An unexpected error occurred. Please try again or contact support.' };
}

function recordAudit(event: AuditEvent): void {
  try {
    saveAuditEvent({ ...event, timestamp: event.timestamp || new Date().toISOString() });
  } catch (e) {
    console.warn('[audit] Failed to write audit event:', e);
  }
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
  const rawPath = url.pathname.replace(/\/$/, '') || '/';
  const path = stripApiPrefix(rawPath).replace(/\/$/, '') || '/';
  const method = req.method ?? 'GET';

  // OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-Email, X-ARR-Filename, X-ARR-Client-Id',
    });
    res.end();
    return;
  }

  // DigitalOcean static-site catchall has proven environment-sensitive. If a direct
  // SPA URL is routed to the API service, turn it into the hash route the frontend
  // actually owns instead of returning the API's JSON 404.
  if (method === 'GET') {
    const hashRedirect = getSpaHashRedirect(path, url.search);
    if (hashRedirect) {
      redirect(res, hashRedirect);
      return;
    }
  }

  try {
    // Health
    if (path === '/health' && method === 'GET') {
      json(res, 200, {
        status: 'ok',
        ts: new Date().toISOString(),
        storage: getStorageDiagnostics(),
      });
      return;
    }

    if (path === '/health/storage' && method === 'GET') {
      json(res, 200, getStorageDiagnostics());
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

    if (routePath === '/health/storage' && method === 'GET') {
      json(res, 200, { tenantId, ...getStorageDiagnostics(tenantId) });
      return;
    }

    // Privacy-safe future-only audit event inspection. Intended for staging QA/debugging.
    if (routePath === '/audit/events' && method === 'GET') {
      const eventType = url.searchParams.get('eventType') ?? url.searchParams.get('type') ?? undefined;
      const limit = Number(url.searchParams.get('limit') ?? '100');
      const events = await listAuditEvents({ tenantId, eventType, limit: isNaN(limit) ? 100 : limit });
      json(res, 200, { tenantId, events });
      return;
    }

    // Client-side activity telemetry. Only a small allowlisted shape is accepted;
    // no form values, workbook contents, or arbitrary payloads are persisted.
    if (routePath === '/audit/activity' && method === 'POST') {
      const body = await parseBody(req);
      let payload: Record<string, unknown> = {};
      try { payload = JSON.parse(body.toString()); } catch { err(res, 400, 'INVALID_JSON', 'Request body must be JSON'); return; }

      const eventType = safeText(payload.eventType ?? payload.type, 80);
      const clientId = safeText(payload.clientId, 120);
      if (!eventType || !clientId) {
        err(res, 400, 'INVALID_AUDIT_EVENT', 'eventType and clientId are required'); return;
      }

      recordAudit({
        timestamp: new Date().toISOString(),
        tenantId,
        eventType,
        clientId,
        sessionId: safeText(payload.sessionId, 120),
        route: safeText(payload.route, 240),
        path: safeText(payload.path, 240),
        hash: safeText(payload.hash, 240),
        importId: safeText(payload.importId, 120),
        targetLabel: safeText(payload.targetLabel, 160),
        targetId: safeText(payload.targetId, 120),
        ...getRequestMeta(req),
      });
      json(res, 202, { ok: true });
      return;
    }

    // List imports
    if (routePath === '/imports' && method === 'GET') {
      json(res, 200, { tenantId, imports: listImports(tenantId) });
      return;
    }

    // Upload + process import
    if (routePath === '/imports' && method === 'POST') {
      const contentType = req.headers['content-type'] ?? '';
      let filePath: string | undefined;
      let tempFile = false;
      let filename: string | undefined;

      try {
        if (contentType.includes('application/json')) {
          // Accept { filePath: "..." } for local testing
          const body = await parseBody(req);
          const data = JSON.parse(body.toString());
          if (!data.filePath) { err(res, 400, 'MISSING_FILE_PATH', 'filePath required'); return; }
          filePath = data.filePath;
          filename = safeAuditFilename(req, filePath);
        } else if (contentType.includes('multipart/form-data') || contentType.includes('application/octet-stream')) {
          // Save uploaded file to tmp. Do not inspect or persist workbook contents beyond import processing.
          const tmpPath = join(tmpdir(), `arr-import-${randomUUID()}.xlsx`);
          const body = await parseBody(req);
          await writeFile(tmpPath, body);
          filePath = tmpPath;
          tempFile = true;
          filename = safeAuditFilename(req);
        } else {
          recordAudit({
            timestamp: new Date().toISOString(),
            tenantId,
            eventType: 'upload_error',
            filename: safeAuditFilename(req),
            rowCount: 0,
            success: false,
            errorCode: 'UNSUPPORTED_MEDIA_TYPE',
            errorMessage: 'Send JSON {filePath} or multipart/form-data',
            ...getRequestMeta(req),
          });
          err(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Send JSON {filePath} or multipart/form-data'); return;
        }

        if (!filePath) throw new Error('Import file path was not initialized');
        const result = processImport(tenantId, filePath);
        const rowCount = result.bundle.normalizedRows.length;
        recordAudit({
          timestamp: new Date().toISOString(),
          tenantId,
          eventType: 'upload_success',
          importId: result.importId,
          filename,
          rowCount,
          success: true,
          ...getRequestMeta(req),
        });
        json(res, 200, {
          tenantId,
          importId: result.importId,
          status: 'complete',
          totalRows: rowCount,
          reviewItems: result.bundle.reviewItems.length,
          segments: result.segments.length,
        });
      } catch (e) {
        const safe = safeError(e);
        recordAudit({
          timestamp: new Date().toISOString(),
          tenantId,
          eventType: 'upload_error',
          filename: filename ?? safeAuditFilename(req, filePath),
          rowCount: 0,
          success: false,
          ...safe,
          ...getRequestMeta(req),
        });
        throw e;
      } finally {
        if (tempFile && filePath) await unlink(filePath).catch(() => {});
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

      if (sub === '/customer-cube' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const cube = getCustomerCube(tenantId, importId, from, to);
        if (!cube) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, cube);
        return;
      }

      if (sub === '/customer-cube/export.csv' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const csv = exportCustomerCubeCsv(tenantId, importId, from, to);
        if (!csv) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        csvResponse(res, `customer-cube-${importId.slice(0, 8)}.csv`, csv);
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
        const result = bulkResolveReview(
          tenantId,
          importId,
          payload.action,
          payload.itemIds,
          payload.note,
          getUserEmail(req),
        );
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
        const updated = patchReviewItem(
          tenantId,
          importId,
          itemId,
          payload.action,
          payload.note,
          getUserEmail(req),
        );
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

await initStorage();

server.listen(PORT, '0.0.0.0', () => {
  const prefixLabel = API_PREFIX ? ` with API_PREFIX=${API_PREFIX}` : '';
  console.log(`ARR V2 API running on http://0.0.0.0:${PORT}${prefixLabel}`);
});

export default server;
