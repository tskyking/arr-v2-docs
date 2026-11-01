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
    expect(html).toContain('intro-video.js?v=20261101-banner-presentations-v1');
    expect(css).toContain('.arr-intro-dialog');
    expect(css).toContain('.arr-intro-close');
    expect(handler).toContain('["intro-video.js", "application/javascript; charset=utf-8"]');
    expect(handler).toContain('["arr-concept-overview-final-marin-2026-10-14.mp4", "video/mp4"]');
  });

  it('links the two demonstration-banner phrases to the female and ElevenLabs presentations', async () => {
    const [html, handler] = await Promise.all([
      publicFile('production.html'),
      readFile(new URL('../handler.ts', import.meta.url), 'utf8'),
    ]);

    expect(html).toContain('class="demo-banner" role="group"');
    expect(html).toContain('id="simulation-presentation-female"');
    expect(html).toContain('>Fictional demonstration</button>');
    expect(html).toContain('id="simulation-presentation-male"');
    expect(html).toContain('>Synthetic data only · Not an official company system</button>');
    expect(html).toContain(
      'data-video-src="air-transfer-mattress-refurbishment-simulation-presentation-marin-2026-10-31.mp4',
    );
    expect(html).toContain(
      'data-video-src="air-transfer-mattress-refurbishment-simulation-presentation-elevenlabs-roger-2026-10-31.mp4',
    );
    expect(handler).toContain(
      '["air-transfer-mattress-refurbishment-simulation-presentation-marin-2026-10-31.mp4", "video/mp4"]',
    );
    expect(handler).toContain(
      '["air-transfer-mattress-refurbishment-simulation-presentation-elevenlabs-roger-2026-10-31.mp4", "video/mp4"]',
    );
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
        <button id="arr-intro-open" type="button" data-arr-video data-video-src="arr-concept-overview-final-marin-2026-10-14.mp4" data-video-title="Achievement Recognition Review" data-video-eyebrow="ARR concept overview">ARR</button>
        <button id="simulation-presentation-female" type="button" data-arr-video data-video-src="air-transfer-mattress-refurbishment-simulation-presentation-marin-2026-10-31.mp4" data-video-title="Air-transfer mattress refurbishment simulation" data-video-eyebrow="Female narration">Female presentation</button>
        <button id="simulation-presentation-male" type="button" data-arr-video data-video-src="air-transfer-mattress-refurbishment-simulation-presentation-elevenlabs-roger-2026-10-31.mp4" data-video-title="Air-transfer mattress refurbishment simulation" data-video-eyebrow="ElevenLabs male narration">Male presentation</button>
        <dialog id="arr-intro-dialog" class="arr-intro-dialog">
          <p id="arr-intro-eyebrow">ARR concept overview</p>
          <h2 id="arr-intro-title">Achievement Recognition Review</h2>
          <button id="arr-intro-close" class="arr-intro-close" type="button">Close</button>
          <video id="arr-intro-video" controls preload="metadata"><source id="arr-intro-source" src="arr-concept-overview-final-marin-2026-10-14.mp4" type="video/mp4"></video>
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
      expect(await page.locator('#arr-intro-source').getAttribute('src')).toBeNull();
      expect(await page.locator('#arr-intro-video').evaluate((node) => ({
        paused: (node as HTMLVideoElement).paused,
        currentTime: (node as HTMLVideoElement).currentTime,
      }))).toEqual({ paused: true, currentTime: 0 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('arr-intro-open');

      await page.click('#simulation-presentation-female');
      expect(await page.locator('#arr-intro-source').getAttribute('src')).toBe(
        'air-transfer-mattress-refurbishment-simulation-presentation-marin-2026-10-31.mp4',
      );
      expect(await page.locator('#arr-intro-eyebrow').textContent()).toBe('Female narration');
      await page.click('#arr-intro-close');
      expect(await page.locator('#arr-intro-source').getAttribute('src')).toBeNull();
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(
        'simulation-presentation-female',
      );

      await page.click('#simulation-presentation-male');
      expect(await page.locator('#arr-intro-source').getAttribute('src')).toBe(
        'air-transfer-mattress-refurbishment-simulation-presentation-elevenlabs-roger-2026-10-31.mp4',
      );
      expect(await page.locator('#arr-intro-eyebrow').textContent()).toBe(
        'ElevenLabs male narration',
      );
      expect(await page.locator('#underlying-state').inputValue()).toBe('TK draft remains here');
      await page.click('#arr-intro-stop');
      expect(await page.locator('#arr-intro-dialog').getAttribute('open')).toBeNull();
      expect(await page.locator('#arr-intro-source').getAttribute('src')).toBeNull();
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(
        'simulation-presentation-male',
      );
    } finally {
      await browser.close();
    }
  });
});
