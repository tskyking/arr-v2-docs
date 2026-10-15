import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { createAccessHandler } from '../handler.js';

const publicPath = new URL('../public/', import.meta.url);
const browserCandidates = [
  process.env.CHROME_PATH,
  chromium.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter((value): value is string => Boolean(value));
const browserExecutable = browserCandidates.find(existsSync);
const browserIt = browserExecutable ? it : it.skip;

async function publicFile(name: string) {
  return readFile(new URL(name, publicPath), 'utf8');
}

describe('legacy request-workspace navigation', () => {
  it('prominently links visitors to the current ARR production demo', async () => {
    const html = await publicFile('workspace.html');
    const css = await publicFile('workspace.css');

    expect(html).toContain('class="current-production-jump"');
    expect(html).toContain('href="https://access.arrweb.com/api/access-demo/production.html"');
    expect(html).toContain('Jump to the current ARR production demo');
    expect(css).toContain('.current-production-jump');
  });

  it('ships a CSP-compatible redirect asset with all explicit legacy exemptions', async () => {
    const [html, redirect, handler] = await Promise.all([
      publicFile('workspace.html'),
      publicFile('legacy-workspace-redirect.js'),
      readFile(new URL('../handler.ts', import.meta.url), 'utf8'),
    ]);

    expect(html).toContain('legacy-workspace-redirect.js?v=20261014-current-demo-auto-jump-v1');
    expect(html).not.toContain('window.location.replace(');
    expect(handler).toContain('["legacy-workspace-redirect.js", "application/javascript; charset=utf-8"]');
    expect(redirect).toContain("hash === '#staff'");
    expect(redirect).toContain("hash.startsWith('#activate=')");
    expect(redirect).toContain("searchParams.get('production') === '1'");
    expect(redirect).toContain('if (keepLegacyWorkspace()) return;');
    expect(redirect).toContain("window.location.replace('https://access.arrweb.com/api/access-demo/production.html')");
    expect(redirect).toContain('}, 1000);');
  });

  browserIt('redirects through the real CSP while preserving staff and activation routes', async () => {
    const handler = createAccessHandler(undefined, true);
    const server = createServer(async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://local').pathname.replace(/^\/api/, '');
      if (!(await handler(req, res, path))) res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test server address.');
    const root = `http://127.0.0.1:${address.port}/api/access-demo/workspace.html`;
    const target = 'https://access.arrweb.com/api/access-demo/production.html';
    const browser = await chromium.launch({ headless: true, executablePath: browserExecutable });
    const page = await browser.newPage();
    try {
      await page.route(target, route => route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<main id="current-arr">Current ARR</main>',
      }));
      const started = Date.now();
      await page.goto(root);
      await page.waitForURL(target, { timeout: 4000 });
      expect(Date.now() - started).toBeGreaterThanOrEqual(850);
      expect(await page.locator('#current-arr').isVisible()).toBe(true);

      for (const suffix of ['#staff', '?production=1']) {
        await page.goto(root + suffix);
        await page.waitForTimeout(1300);
        expect(page.url()).toBe(root + suffix);
      }
      await page.goto(root + '#activate=fictional-code');
      await page.waitForTimeout(1300);
      expect(page.url().startsWith(root + '#activate')).toBe(true);

      await page.goto(root);
      await page.waitForTimeout(200);
      await page.evaluate(() => { window.location.hash = '#staff'; });
      await page.waitForTimeout(1100);
      expect(page.url()).toBe(root + '#staff');
    } finally {
      await browser.close();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }, 15_000);
});
