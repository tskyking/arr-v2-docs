import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);
const stylePath = new URL('../public/production.css', import.meta.url);
const browserCandidates = [
  process.env.CHROME_PATH,
  chromium.executablePath(),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter((value): value is string => Boolean(value));
const browserExecutable = browserCandidates.find(existsSync);
const browserIt = browserExecutable ? it : it.skip;

async function productionSource() {
  return readFile(sourcePath, 'utf8');
}

describe('compact shift feedback and station scan affordance', () => {
  it('uses one Feedback disclosure instead of separate optional disclosures', async () => {
    const source = await productionSource();
    expect(source).toContain('<details class="feedback-section"');
    expect(source).toContain('<summary><span class="feedback-title">Feedback</span>');
    expect(source).not.toContain('<summary>Any other issues or comments to note?</summary>');
    expect(source).not.toContain('<summary>Quantities &amp; lot details (optional)</summary>');
  });

  it('places a compact QR scanner symbol between the prompt and access button', async () => {
    const source = await productionSource();
    const prompt = source.indexOf('station-qr-copy');
    const icon = source.indexOf('station-qr-icon');
    const button = source.indexOf('station-qr-button');
    expect(prompt).toBeGreaterThan(-1);
    expect(icon).toBeGreaterThan(prompt);
    expect(button).toBeGreaterThan(icon);
    expect(source).toContain('station-scan-line');
  });

  it('combines transition station selection and QR scanning into one compact disclosure row', async () => {
    const [source, styles] = await Promise.all([
      productionSource(),
      readFile(stylePath, 'utf8'),
    ]);
    expect(source).toContain('<summary class="assignment-summary" aria-label="Select or review the next station and SOP readiness"><span class="assignment-summary-label">Select or review the next station and SOP readiness</span>${!last?.end?stationQrControls(true):\'\'}</summary>');
    expect(source).toContain('<button type="button" id="access-station-qr" class="primary station-qr-button" aria-label="Open QR reader for station selection">QR reader</button>');
    expect(source).not.toContain('Scan the next station/product, or scan End Shift to review and finish your day.');
    expect(styles).toContain('.assignment-disclosure{border:2px solid #89b9b8;border-radius:12px;background:#edf8f7;overflow:hidden}');
    expect(styles).toContain('.assignment-summary::before{content:\'▸\'');
    expect(styles).toContain('.assignment-scan-actions{margin-left:auto;display:flex;align-items:center;gap:.65rem}');
  });

  it('prevents the QR button event from toggling its parent disclosure', async () => {
    const source = await productionSource();
    const match = source.match(/function bindStationScanner\([\s\S]*?\n\nfunction assignment/);
    expect(match).not.toBeNull();
    const functionSource = match![0].replace(/\n\nfunction assignment$/, '');
    const button: Record<string, unknown> = {};
    const input = {addEventListener: () => undefined};
    const form = {};
    let scannerForm: unknown;
    const bindStationScanner = new Function('$', 'run', 'beginStationScanner', `${functionSource}; return bindStationScanner;`)(
      (selector: string) => selector === '#access-station-qr' ? button : input,
      (fn: () => unknown) => fn(),
      (value: unknown) => { scannerForm = value; },
    );
    bindStationScanner(form);
    let prevented = false;
    let stopped = false;
    (button.onclick as (event: {preventDefault: () => void; stopPropagation: () => void}) => void)({
      preventDefault: () => { prevented = true; },
      stopPropagation: () => { stopped = true; },
    });
    expect(prevented).toBe(true);
    expect(stopped).toBe(true);
    expect(scannerForm).toBe(form);
  });

  browserIt('keeps scanner selection usable when the combined row is collapsed, expanded, or on Begin Shift', async () => {
    const [source, styles] = await Promise.all([productionSource(), readFile(stylePath, 'utf8')]);
    const match = source.match(/function bindStationScanner\([\s\S]*?\n\nfunction assignment/);
    expect(match).not.toBeNull();
    const functionSource = match![0].replace(/\n\nfunction assignment$/, '');
    const browser = await chromium.launch({headless: true, executablePath: browserExecutable});
    const page = await browser.newPage({viewport: {width: 390, height: 844}});
    try {
      await page.setContent(`
        <style>${styles}</style>
        <form id="transition-form">
          <fieldset class="next-assignment">
            <details class="assignment-disclosure">
              <summary class="assignment-summary" aria-label="Select or review the next station and SOP readiness">
                <span class="assignment-summary-label">Select or review the next station and SOP readiness</span>
                <span class="station-qr-actions assignment-scan-actions">
                  <span class="station-qr-icon" aria-hidden="true"><svg viewBox="0 0 64 64"><path d="M5 21V9h16M43 5h16v16M59 43v16H43M21 59H5V43" fill="none" stroke="currentColor" stroke-width="4"/></svg></span>
                  <button type="button" id="access-station-qr" class="primary station-qr-button" aria-label="Open QR reader for station selection">QR reader</button>
                </span>
              </summary>
              <fieldset class="next-assignment-fields"><label>Stage<select name="stage"><option>Cleaning / Decontamination</option><option>Packaging</option></select></label><label>Product<input name="productChoice" value="Manifolds"></label></fieldset>
            </details>
          </fieldset>
          <input name="actualTime">
        </form>
        <form id="begin-form">
          <section class="station-qr-launch"><div class="station-qr-copy">Station selection</div><span class="station-qr-actions"><button type="button" id="access-station-qr" class="primary station-qr-button">Access station QR reader</button></span></section>
          <label>Stage<select name="stage"><option>Cleaning / Decontamination</option><option>Packaging</option></select></label><label>Product<input name="productChoice" value="Manifolds"></label><input name="actualTime">
        </form>
      `);
      await page.addScriptTag({content: `
        const $=(selector,root=document)=>root.querySelector(selector);
        const run=fn=>fn();
        let pendingForm=null;
        window.cameraRequests=0;
        function beginStationScanner(form){ window.cameraRequests+=1; pendingForm=form; }
        ${functionSource}
        const transition=document.querySelector('#transition-form');
        transition.onStationQr=station=>{transition.querySelector('[name=stage]').value=station.stage;transition.querySelector('[name=productChoice]').value=station.product;transition.querySelector('details').open=true;};
        const begin=document.querySelector('#begin-form');
        bindStationScanner(transition);bindStationScanner(begin);
        window.completeScan=()=>{const station={stage:'Packaging',product:'Compression sleeves'};if(pendingForm.onStationQr)pendingForm.onStationQr(station);else{pendingForm.querySelector('[name=stage]').value=station.stage;pendingForm.querySelector('[name=productChoice]').value=station.product;}pendingForm=null;};
      `});

      expect(await page.locator('#transition-form summary').getAttribute('aria-label')).toBe('Select or review the next station and SOP readiness');
      expect(await page.getByRole('button', {name: 'Open QR reader for station selection', exact: true}).count()).toBe(1);
      const details = page.locator('#transition-form details');
      await page.click('#transition-form #access-station-qr');
      expect(await details.getAttribute('open')).toBeNull();
      expect(await page.evaluate(() => (window as any).cameraRequests)).toBe(1);
      await page.evaluate(() => (window as any).completeScan());
      expect(await details.getAttribute('open')).toBe('');
      expect(await page.locator('#transition-form [name=stage]').inputValue()).toBe('Packaging');
      expect(await page.locator('#transition-form [name=productChoice]').inputValue()).toBe('Compression sleeves');

      await page.click('#transition-form #access-station-qr');
      expect(await details.getAttribute('open')).toBe('');
      await page.evaluate(() => (window as any).completeScan());
      expect(await details.getAttribute('open')).toBe('');

      await page.click('#begin-form #access-station-qr');
      expect(await page.evaluate(() => (window as any).cameraRequests)).toBe(3);
      await page.evaluate(() => (window as any).completeScan());
      expect(await page.locator('#begin-form [name=stage]').inputValue()).toBe('Packaging');
      expect(await page.locator('#begin-form [name=productChoice]').inputValue()).toBe('Compression sleeves');
      expect(await page.locator('#begin-form #access-station-qr').textContent()).toBe('Access station QR reader');
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    } finally {
      await browser.close();
    }
  }, 15000);
});
