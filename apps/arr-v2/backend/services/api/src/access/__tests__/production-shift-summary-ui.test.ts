import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);

describe('shift queue elapsed-time presentation', () => {
  it('shows a live bold shift total beside the crew', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('function shiftTotalDuration');
    expect(source).toContain('shift-total-duration');
    expect(source).toContain('data-shift-elapsed-start');
    expect(source).toContain(' · Shift total ');
  });

  it('bolds Current without bolding Previous', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("title==='Current'?'current-segment-label':''");
    expect(source).not.toContain('<b>${title}</b>');
  });
});
