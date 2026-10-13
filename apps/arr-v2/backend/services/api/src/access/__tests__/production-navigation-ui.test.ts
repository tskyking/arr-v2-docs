import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const publicPath = new URL('../public/', import.meta.url);

describe('legacy request-workspace navigation', () => {
  it('prominently links visitors to the current ARR production demo', async () => {
    const html = await readFile(new URL('workspace.html', publicPath), 'utf8');
    const css = await readFile(new URL('workspace.css', publicPath), 'utf8');

    expect(html).toContain('class="current-production-jump"');
    expect(html).toContain('href="https://access.arrweb.com/api/access-demo/production.html"');
    expect(html).toContain('Jump to the current ARR production demo');
    expect(css).toContain('.current-production-jump');
  });
});
