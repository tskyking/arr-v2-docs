import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAccessHandler } from '../handler.js';

const filename = 'arr-concept-overview-final-marin-2026-10-14.mp4';
const sourceUrl = new URL(`../public/${filename}`, import.meta.url);

describe('ARR introduction video delivery', () => {
  let server: Server;
  let baseUrl = '';
  let assetRoot = '';

  beforeAll(async () => {
    const handler = createAccessHandler(undefined, true);
    server = createServer(async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://local').pathname.replace(/^\/api/, '');
      if (!(await handler(req, res, path))) {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address.');
    assetRoot = `http://127.0.0.1:${address.port}/api/access-demo`;
    baseUrl = `${assetRoot}/${filename}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('supports Safari-compatible media metadata and byte-range requests', async () => {
    const source = await readFile(sourceUrl);

    const head = await fetch(baseUrl, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(head.headers.get('content-type')).toBe('video/mp4');
    expect(head.headers.get('accept-ranges')).toBe('bytes');
    expect(head.headers.get('content-length')).toBe(String(source.length));
    expect((await head.arrayBuffer()).byteLength).toBe(0);

    const range = await fetch(baseUrl, { headers: { Range: 'bytes=0-1' } });
    expect(range.status).toBe(206);
    expect(range.headers.get('content-type')).toBe('video/mp4');
    expect(range.headers.get('accept-ranges')).toBe('bytes');
    expect(range.headers.get('content-range')).toBe(`bytes 0-1/${source.length}`);
    expect(range.headers.get('content-length')).toBe('2');
    expect(Buffer.from(await range.arrayBuffer())).toEqual(source.subarray(0, 2));
  });

  it('accepts case-insensitive byte units and open-ended or suffix ranges', async () => {
    const source = await readFile(sourceUrl);
    for (const [header, expectedStart, expectedEnd] of [
      ['Bytes=0-1', 0, 1],
      ['bytes=2-', 2, source.length - 1],
      ['bytes=-2', source.length - 2, source.length - 1],
      [`bytes=0-${source.length + 100}`, 0, source.length - 1],
      ['bytes=0-99999999999999999999', 0, source.length - 1],
      ['bytes=-99999999999999999999', 0, source.length - 1],
    ] as const) {
      const response = await fetch(baseUrl, { headers: { Range: header } });
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe(
        `bytes ${expectedStart}-${expectedEnd}/${source.length}`,
      );
      expect(response.headers.get('content-length')).toBe(String(expectedEnd - expectedStart + 1));
      await response.body?.cancel();
    }
  });

  it('ignores unsupported units and multi-range sets instead of reporting them unsatisfiable', async () => {
    const source = await readFile(sourceUrl);
    for (const header of ['items=0-1', 'bytes=0-1,4-5', 'bytes=abc-def', 'bytes=-']) {
      const response = await fetch(baseUrl, { headers: { Range: header } });
      expect(response.status).toBe(200);
      expect(response.headers.get('content-length')).toBe(String(source.length));
      expect(response.headers.get('content-range')).toBeNull();
      await response.body?.cancel();
    }
  });

  it('returns 416 only for a syntactically valid but unsatisfiable byte range', async () => {
    const source = await readFile(sourceUrl);
    const response = await fetch(baseUrl, {
      headers: { Range: `bytes=${source.length}-` },
    });
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe(`bytes */${source.length}`);
    expect(response.headers.get('content-length')).toBe('0');
  });

  it('does not apply media ranges to ordinary static assets', async () => {
    const response = await fetch(`${assetRoot}/production.css`, {
      headers: { Range: 'bytes=0-1' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-range')).toBeNull();
    expect(Number(response.headers.get('content-length'))).toBeGreaterThan(2);
    await response.body?.cancel();
  });
});
