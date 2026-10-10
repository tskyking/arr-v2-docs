import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const sourcePath = new URL('../public/production.js', import.meta.url);
const stylePath = new URL('../public/production.css', import.meta.url);

describe('gate quantity controls', () => {
  it('uses a caret-only accessible disclosure with editable Gate Passes and Gate Holds', async () => {
    const source = await readFile(sourcePath, 'utf8');
    expect(source).toContain('<summary aria-label="Gate quantities"></summary>');
    expect(source).not.toContain('<summary>Reported quantities</summary>');
    expect(source).toContain('data-gate-passes');
    expect(source).toContain('data-gate-holds');
    expect(source).toContain('Save gate quantities');
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
});
