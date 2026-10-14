import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { describe, expect, it } from 'vitest';

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

describe('ARR introduction video overlay', () => {
  it('ships the approved video and responsive modal from the green ARR mark', async () => {
    const [html, css, handler] = await Promise.all([
      publicFile('production.html'),
      publicFile('production.css'),
      readFile(new URL('../handler.ts', import.meta.url), 'utf8'),
    ]);

    expect(html).toContain('id="arr-intro-open"');
    expect(html).toContain('id="arr-intro-dialog"');
    expect(html).toContain('arr-concept-overview-final-marin-2026-10-14.mp4?v=20261014-ios-safari-v2');
    expect(html).toContain('intro-video.js?v=20261014-arr-intro-video-v1');
    expect(css).toContain('.arr-intro-dialog');
    expect(css).toContain('.arr-intro-close');
    expect(handler).toContain('["intro-video.js", "application/javascript; charset=utf-8"]');
    expect(handler).toContain('["arr-concept-overview-final-marin-2026-10-14.mp4", "video/mp4"]');
  });

  browserIt('opens and closes without navigating or changing the underlying page state', async () => {
    const browser = await chromium.launch({
      headless: true,
      executablePath: browserExecutable,
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.setContent(`
        <input id="underlying-state" value="preserved">
        <button id="arr-intro-open" type="button">ARR</button>
        <dialog id="arr-intro-dialog" class="arr-intro-dialog">
          <button id="arr-intro-close" class="arr-intro-close" type="button">Close</button>
          <video id="arr-intro-video" controls preload="metadata"><source src="arr-concept-overview-final-marin-2026-10-14.mp4" type="video/mp4"></video>
          <button id="arr-intro-stop" type="button">Stop video</button>
        </dialog>
      `);
      await page.addScriptTag({ path: new URL('../public/intro-video.js', import.meta.url).pathname });
      await page.fill('#underlying-state', 'TK draft remains here');
      await page.click('#arr-intro-open');
      expect(await page.locator('#arr-intro-dialog').getAttribute('open')).toBe('');
      expect(await page.locator('#arr-intro-video').isVisible()).toBe(true);
      await page.click('#arr-intro-close');
      expect(await page.locator('#arr-intro-dialog').getAttribute('open')).toBeNull();
      expect(await page.locator('#underlying-state').inputValue()).toBe('TK draft remains here');
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('arr-intro-open');
    } finally {
      await browser.close();
    }
  });
});
