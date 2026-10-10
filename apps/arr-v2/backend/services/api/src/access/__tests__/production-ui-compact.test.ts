import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);

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
});
