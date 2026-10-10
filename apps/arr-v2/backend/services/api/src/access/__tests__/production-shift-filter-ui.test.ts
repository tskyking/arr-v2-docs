import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);

describe('production shift filters', () => {
  it('applies Crew and Hide closed immediately', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('async function applyImmediateShiftFilter');
    expect(source).toContain("$('[name=team]',form)?.addEventListener('change'");
    expect(source).toContain("$('[name=hideClosed]',form).addEventListener('change'");
  });

  it('keeps date edits pending until Apply filters while All dates remains immediate', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("for(const name of ['from','to'])");
    expect(source).toContain("$('#filter-pending').hidden=false");
    expect(source).toContain("bind('#shift-all-dates',async()=>");
    expect(source).toContain('await shiftQueue();');
    expect(source).not.toContain("form.onchange=()=>{$('#filter-pending').hidden=false;}");
  });
});
