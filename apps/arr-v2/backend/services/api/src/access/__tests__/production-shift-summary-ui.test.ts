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
    expect(source).toContain("title==='Current'?'current-segment-row':title==='Previous'?'previous-segment-row':''");
    expect(styles).toContain('.current-segment-row { color: #263c46; font-weight: 600; background: #f2f7f6; border-left: 2px solid #8aafa9; border-radius: 4px; padding: .12rem .35rem; }');
    expect(styles).toContain('.current-segment-row .segment-kind { color: #263c46; }');
    expect(styles).not.toContain('.shift-summary small { background: #f2f7f6; }');
  });

  it('slightly enlarges Shift total while softening only the bold Previous duration', async () => {
    const [source, styles] = await Promise.all([
      readFile(sourcePath, 'utf8'),
      readFile(stylePath, 'utf8'),
    ]);
    expect(source).toContain("title==='Previous'?'previous-segment-row':''");
    expect(styles).toContain('.queue-summary .shift-total-duration { display:inline; font-size:1.06em; margin:0; }');
    expect(styles).toContain('.previous-segment-row .segment-duration { color: #61727a; }');
    expect(styles).toContain('.segment-duration { color: #263c46; font-weight: 700; }');
    expect(styles).toContain('.current-segment-row .segment-kind { color: #263c46; }');
  });

  it('binds Queue to its own expanded shift and removes collapsed detail markup', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('function bind(id,fn,root=document){const el=$(id,root);');
    expect(source).toContain("return openShift(s.id);},el);");
    expect(source).toContain("if(old){await animateDetail(old,false);old.innerHTML='';}");
  });
});
