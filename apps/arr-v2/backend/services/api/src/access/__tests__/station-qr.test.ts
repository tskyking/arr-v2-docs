import printed from './fixtures/printed-station-qr.json';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {describe, expect, it} from 'vitest';

const modulePath = new URL('../public/station-qr.js', import.meta.url);

async function loadStationQr() {
  delete (globalThis as {ARRStationQR?: unknown}).ARRStationQR;
  // Add a query so each test receives a fresh module evaluation.
  await import(`${pathToFileURL(modulePath.pathname).href}?test=${crypto.randomUUID()}`);
  return (globalThis as {ARRStationQR?: {
    parse(value: string): {id: string; stage: string; product: string; demoReady: boolean} | null;
  }}).ARRStationQR;
}

describe('station QR payloads', () => {
  it('preserves every printed code and exact operation/product mapping', async () => {
    const api=await loadStationQr();
    expect(new Set(printed.map(p=>p.payload)).size).toBe(15);
    for(const {payload,...expected} of printed)expect(api?.parse(payload)).toEqual(expected);
  });
  it('maps the cleaning station code to the exact demo assignment', async () => {
    const api = await loadStationQr();
    expect(api?.parse('ARR-STATION:1:cleaning-air-transfer')).toEqual({
      id: 'cleaning-air-transfer',
      stage: 'Cleaning / Decontamination',
      product: 'Air-transfer products',
      demoReady: true,
    });
  });

  it('maps the inspection station code to the exact demo assignment', async () => {
    const api = await loadStationQr();
    expect(api?.parse('ARR-STATION:1:inspection-arthroscopic-shaver-blades')).toEqual({
      id: 'inspection-arthroscopic-shaver-blades',
      stage: 'Inspection',
      product: 'Arthroscopic shaver blades',
      demoReady: true,
    });
  });

  it('rejects unknown, malformed, and URL-like values', async () => {
    const api = await loadStationQr();
    expect(api?.parse('ARR-STATION:1:unknown')).toBeNull();
    expect(api?.parse('https://example.com/?stage=Inspection')).toBeNull();
    expect(api?.parse('ARR-STATION:1:cleaning-air-transfer<script>')).toBeNull();
    expect(api?.parse('')).toBeNull();
  });

  it('ships without embedding a password or login credential', async () => {
    const source = await readFile(modulePath, 'utf8');
    expect(source.toLowerCase()).not.toContain('password');
    expect(source.toLowerCase()).not.toContain('token');
  });
});
