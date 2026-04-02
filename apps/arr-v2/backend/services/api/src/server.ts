/**
 * ARR V2 API Server
 * Minimal HTTP server using Node's built-in http module — no framework dependency yet.
 * Routes:
 *   POST /imports                     — upload and process a workbook
 *   GET  /imports                     — list imports
 *   GET  /imports/:id/summary         — import summary
 *   GET  /imports/:id/arr             — ARR timeseries
 *   GET  /imports/:id/arr/movements   — period-over-period ARR waterfall (new/expansion/contraction/churn)
 *   GET  /imports/:id/review          — review queue
 *   GET  /health                      — health check
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
  patchReviewItem,
  listImports,
} from './importService.js';
import { ImportError } from '../../imports/src/importErrors.js';

const PORT = Number(process.env.PORT ?? 3001);

function json(res: http.ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

function err(res: http.ServerResponse, status: number, code: string, message: string) {
  json(res, status, { code, message });
}

async function parseBody(req: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const method = req.method ?? 'GET';

  // OPTIONS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end();
    return;
  }

  try {
    // Health
    if (path === '/health' && method === 'GET') {
      json(res, 200, { status: 'ok', ts: new Date().toISOString() });
      return;
    }

    // List imports
    if (path === '/imports' && method === 'GET') {
      json(res, 200, { imports: listImports() });
      return;
    }

    // Upload + process import
    if (path === '/imports' && method === 'POST') {
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
        const result = processImport(filePath);
        json(res, 200, {
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

    // /imports/:id/*
    const importMatch = path.match(/^\/imports\/([^/]+)(\/.*)?$/);
    if (importMatch) {
      const importId = importMatch[1];
      const sub = importMatch[2] ?? '';

      if (sub === '/summary' && method === 'GET') {
        const summary = getImportSummary(importId);
        if (!summary) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, summary);
        return;
      }

      if (sub === '/arr' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const ts = getArrTimeseries(importId, from, to);
        if (!ts) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, ts);
        return;
      }

      // GET /imports/:id/arr/movements — period-over-period ARR waterfall
      if (sub === '/arr/movements' && method === 'GET') {
        const from = url.searchParams.get('from') ?? undefined;
        const to = url.searchParams.get('to') ?? undefined;
        const movements = getArrMovements(importId, from, to);
        if (!movements) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, movements);
        return;
      }

      if (sub === '/review' && method === 'GET') {
        const status = url.searchParams.get('status') ?? undefined;
        const queue = getReviewQueue(importId, status);
        if (!queue) { err(res, 404, 'NOT_FOUND', 'Import not found'); return; }
        json(res, 200, queue);
        return;
      }

      // PATCH /imports/:id/review/:itemId — resolve or override a review item
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

        const updated = patchReviewItem(importId, itemId, payload.action, payload.note);
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
