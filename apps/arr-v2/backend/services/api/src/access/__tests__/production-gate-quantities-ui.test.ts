import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);
const stylePath = new URL('../public/production.css', import.meta.url);
const browserCandidates = [process.env.CHROME_PATH, chromium.executablePath(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].filter((value): value is string => Boolean(value));
const browserExecutable = browserCandidates.find(existsSync);
const browserIt = browserExecutable ? it : it.skip;

describe('gate quantity controls', () => {
  it('uses a caret-only accessible disclosure with editable Gate Passes and Gate Holds', async () => {
    const [source, styles] = await Promise.all([readFile(sourcePath, 'utf8'), readFile(stylePath, 'utf8')]);
    expect(source).toContain('<summary><small>${timing}<span class="sr-only"> · Gate quantities</span><span class="segment-quantity-caret" aria-hidden="true">▸</span></small></summary>');
    expect(source).not.toContain('<summary>Reported quantities</summary>');
    expect(source).toContain('data-gate-passes');
    expect(source).toContain('data-gate-holds');
    expect(source).toContain('Save gate quantities');
    expect(styles).toContain('.segment-quantity-caret{display:inline-block;');
    expect(styles).toContain('.reported-quantities[open] .segment-quantity-caret{transform:rotate(90deg)}');
    expect(styles).toContain('.assignment-summary::before{content:\'▸\';flex:0 0 auto;font-size:1.45rem;');
  });

  it('places each production-segment caret on its timing line instead of a third row', async () => {
    const [source, styles] = await Promise.all([readFile(sourcePath, 'utf8'), readFile(stylePath, 'utf8')]);
    expect(source).toContain("reportedQuantities(v,editable&&s.status!=='closed',segmentTiming(v))");
    expect(source).toContain("v.kind==='production'?reportedQuantities");
    expect(styles).toContain('.reported-quantities{margin-top:0;');
    expect(styles).toContain('.reported-quantities summary{cursor:pointer;display:flex;align-items:center;');
    expect(styles).toContain('.gate-quantity-content{margin-top:.4rem;}');
  });

  it('uses the same Gate Passes and Gate Holds labels in Feedback and synchronizes the active station', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain("uiInput('reportedMoves','Gate Passes'");
    expect(source).toContain("uiInput('rejected','Gate Holds'");
    expect(source).toContain('function bindGateQuantitySync');
    expect(source).toContain('saveGateQuantities');
  });

  it('saves from either location without rerendering open carets and keeps the two fields side by side', async () => {
    const [source, styles] = await Promise.all([readFile(sourcePath, 'utf8'), readFile(stylePath, 'utf8')]);
    expect(source).toContain('id="save-feedback-gate-quantities"');
    expect(source).toContain('async function saveGateQuantities');
    expect(source).toContain("action:'segment-counts'");
    expect(source).not.toContain("await action('segment-counts'");
    expect(styles).toContain('.gate-quantity-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr));');
  });

  browserIt('renders an accessible inline caret that toggles Gate controls without overflow or losing open state', async () => {
    const styles = await readFile(stylePath, 'utf8');
    const browser = await chromium.launch({headless: true, executablePath: browserExecutable});
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    try {
      await page.setContent(`<style>${styles}</style><main><details class="assignment-disclosure"><summary class="assignment-summary"><span>Station selection</span></summary></details><ol class="shift-timeline"><li><strong>Packaging · · Compression sleeves</strong><details class="reported-quantities"><summary><small>10/20/2026 9:02 AM — Now · · <span class="segment-kind">Production · <strong class="segment-duration">1h 16m</strong> elapsed</span><span class="sr-only"> · Gate quantities</span><span class="segment-quantity-caret" aria-hidden="true">▸</span></small></summary><div class="gate-quantity-content"><div class="gate-quantity-grid"><label>Gate Passes<input data-gate-passes type="number"></label><label>Gate Holds<input data-gate-holds type="number"></label></div><button type="button" data-save-gate-quantities>Save gate quantities</button><small data-gate-status role="status"></small></div></details></li></ol></main>`);
      await page.locator('[data-save-gate-quantities]').evaluate((button) => button.addEventListener('click', () => { button.parentElement!.querySelector('[data-gate-status]')!.textContent = 'Gate quantities saved.'; }));
      const summary = page.locator('.reported-quantities summary');
      expect(await summary.getAttribute('aria-label')).toBeNull();
      expect(await page.getByText('▸').getAttribute('aria-hidden')).toBe('true');
      const accessibility = await summary.ariaSnapshot();
      expect(accessibility).toContain('1h 16m');
      expect(accessibility).toContain('elapsed · Gate quantities');
      expect(accessibility).not.toContain('▸');
      await summary.click();
      expect(await page.locator('.reported-quantities').getAttribute('open')).toBe('');
      expect(await page.locator('[data-gate-passes]').isVisible()).toBe(true);
      await page.locator('[data-save-gate-quantities]').click();
      expect(await page.locator('.reported-quantities').getAttribute('open')).toBe('');
      expect(await page.locator('[data-gate-status]').textContent()).toBe('Gate quantities saved.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(await page.locator('.segment-quantity-caret').evaluate((node) => getComputedStyle(node).fontSize)).toBe(await page.locator('.assignment-summary').evaluate((node) => getComputedStyle(node, '::before').fontSize));
    } finally {
      await browser.close();
    }
  }, 15000);
});
