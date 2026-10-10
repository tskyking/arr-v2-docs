import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);

describe('review queue filters', () => {
  it('applies non-date filters immediately', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('async function applyImmediateQueueFilter');
    expect(source).toContain("for(const name of ['form','dataSource','hideReviewed','hideCompleted'])");
    expect(source).toContain("addEventListener('change',()=>run(()=>applyImmediateQueueFilter(form,name)))");
  });

  it('keeps typed dates behind Apply dates and makes Last 14 days immediate', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('>Apply dates</button>');
    expect(source).toContain("for(const name of ['from','to'])");
    expect(source).toContain("$('#queue-filter-pending').hidden=false");
    expect(source).toContain('S.filters={...S.filters,from:dates.from,to:dates.to}');
  });
});
