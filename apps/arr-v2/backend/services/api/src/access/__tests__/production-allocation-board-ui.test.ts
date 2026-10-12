import {readFile} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';

const jsPath = new URL('../public/production.js', import.meta.url);
const cssPath = new URL('../public/production.css', import.meta.url);

describe('lag-adjusted FGI allocation board UI', () => {
  it('renders one product row with Allocate between product and FGI', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain('function allocationProductRow');
    expect(source).toContain('class="allocation-product-row"');
    expect(source).toContain('data-expand-allocation');
    expect(source).toContain('Assumed FGI');
    expect(source).toContain('Remaining operations');
  });

  it('uses the staged expand calculate save workflow', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain("api('allocation-expand'");
    expect(source).toContain("api('allocation-calculate'");
    expect(source).toContain("api('allocation-run-save'");
    expect(source).toContain('Calculate proposed allocations');
    expect(source).toContain('Save balanced allocation');
    expect(source).toContain('Gate Passes');
    expect(source).toContain('Prior manager allocation');
    expect(source).toContain('Manager allocation');
  });

  it('reveals operation cards sequentially and keeps product rows single-column', async () => {
    const source = await readFile(jsPath, 'utf8');
    const css = await readFile(cssPath, 'utf8');
    expect(source).toContain('revealAllocationOperations');
    expect(source).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain('.allocation-product-list');
    expect(css).toContain('grid-template-columns:1fr');
    expect(css).toContain('.allocation-operation-card.revealed');
  });

  it('requires operation totals to remain balanced before save', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain('function recountAllocationBalance');
    expect(source).toContain('data-allocation-remaining');
    expect(source).toContain('data-save-allocation-run');
  });

  it('binds Calculate inside each expanded product rather than the first document match', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain("const calculate=$('[data-calculate-allocation]',root)");
    expect(source).not.toContain("bind('[data-calculate-allocation]'");
  });

  it('preserves independent product drafts and does not reload the whole board after save', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain('X.allocationDirty??=new Set()');
    expect(source).toContain('if(detail.hidden&&detail.innerHTML)');
    expect(source).toContain('refreshAllocationProductSummary');
    expect(source).toContain('Discard unsaved allocation drafts and change the FGI range?');
    const saveBody = source.slice(source.indexOf('async function runBusySaveAllocation'), source.indexOf('async function loadAllocationBoard'));
    expect(saveBody).not.toContain('loadAllocationBoard()');
  });

  it('keeps Save disabled after assumptions change until Calculate succeeds', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain("root.dataset.needsRecalculation!=='true'");
    expect(source).toContain("root.dataset.needsRecalculation='true'");
  });

  it('does not permit allocation without eligible time and preserves draft warnings after an FGI save', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain("calculated&&operation.canAllocate?'':'disabled'");
    expect(source).toContain('X.dirty=X.fgiDirty===true||allocationDirty().size>0');
  });

  it('keeps existing drafts and range state until a replacement board request succeeds', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain('function paintAllocationBoard(out)');
    expect(source).toContain("const out=await api('allocation-board',{from:nextFrom,to:nextTo})");
    expect(source).toContain('X.allocationFrom=nextFrom;X.allocationTo=nextTo;paintAllocationBoard(out)');
    expect(source).toContain('Apply range');
  });

  it('tracks Daily FGI edits separately from product allocation drafts', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain('X.fgiDirty=true');
    expect(source).toContain('X.fgiDirty=false');
    expect(source).toContain("X.dirty=X.fgiDirty===true||allocationDirty().size>0");
  });

  it('surfaces a stale saved run in the initial product summary', async () => {
    const source = await readFile(jsPath, 'utf8');
    expect(source).toContain("product.stale?'<span class=\"pill stale\">Needs refresh</span>':''");
    expect(source).toContain('product.stale=false');
  });

  it('reveals same-day product work context beside Daily FGI without associate rankings', async () => {
    const source = await readFile(jsPath, 'utf8');
    const css = await readFile(cssPath, 'utf8');
    expect(source).toContain('data-fgi-work-context');
    expect(source).toContain("api('fgi-work-context',{workDate:X.fgiDate||date(),family})");
    expect(source).toContain('Same-day completed production for ${esc(value.workDate)}:');
    expect(source).toContain("allocationForm=$('#allocation-form');if(allocationForm)");
    expect(source).toContain('Same-day completed production');
    expect(source).toContain('Allocation calculations use their displayed lag-adjusted source windows');
    expect(source).toContain('Gate Passes');
    expect(css).toContain('.fgi-work-context-detail');
  });
});
