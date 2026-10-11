import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);
const stylePath = new URL('../public/production.css', import.meta.url);

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

  it('darkens the full current-operation line without changing previous operations', async () => {
    const [source, styles] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(stylePath, 'utf8'),
    ]);
    expect(source).toContain("title==='Current'?'current-segment-row':''");
    expect(styles).toContain('.current-segment-row { color: #263c46; }');
    expect(styles).toContain('.current-segment-row .segment-kind { color: #263c46; }');
    expect(styles).not.toContain('.current-segment-row { color: #344b55; }');
    expect(styles).not.toContain('.shift-summary small { color: #263c46; }');
  });
});
