import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const publicPath = new URL('../public/', import.meta.url);
const source = () => readFile(new URL('production.js', publicPath), 'utf8');
const styles = () => readFile(new URL('production.css', publicPath), 'utf8');
const html = () => readFile(new URL('production.html', publicPath), 'utf8');

describe('Models links in the production UI', () => {
  it('shows a visible Models login link outside both credential forms', async () => {
    const js = await source();
    expect(js).toContain('class="models-login-link"');
    expect(js).toContain('href="https://models.arrweb.com/"');
    const showLogin = js.match(/function showLogin\(\)[\s\S]*?\nasync function loadSession/)?.[0] ?? '';
    expect(showLogin).toContain('</form><p class="models-login-link"');
  });

  it('places Models after FGI for managers and before Administration for admin or owner without FGI', async () => {
    const js = await source();
    const shell = js.match(/function shell\(\)[\s\S]*?\nasync function render/)?.[0] ?? '';
    expect(shell).toContain("...(canManage()?[['fgi','FGI & allocations']]:[]),...(['manager','admin','owner'].includes(S.user?.role)?[['models','Models']]:[]),...(['admin','owner'].includes(S.user?.role)?[['administration','Administration']]:[])");
    expect(shell).toContain("href=\"https://models.arrweb.com/sso/arr/start\"");
    expect(shell).not.toContain("S.tab==='models'");
  });

  it('renders the required role-specific link order', async () => {
    const js = await source();
    const match = js.match(/function shell\(\)[\s\S]*?\nasync function render/);
    expect(match).not.toBeNull();
    const functionSource = match![0].replace(/\nasync function render$/, '');
    const renderFor = (role: string, fgi: boolean) => {
      const main = { innerHTML: '' };
      const S = { user: { role }, tab: 'shifts', selected: null, draft: null };
      const X = { dirty: false, open: null };
      const shell = new Function(
        'identity', 'document', 'S', 'X', 'isOperator', 'isLead', 'canManage', 'main', '$$', 'run', 'allowLeave', 'closeEntry',
        `${functionSource}; return shell;`,
      )(
        () => undefined,
        { body: { dataset: {} } },
        S,
        X,
        () => role === 'operator',
        () => role === 'reviewer',
        () => fgi,
        main,
        () => [],
        (fn: () => unknown) => fn(),
        () => true,
        async () => true,
      );
      shell();
      return main.innerHTML;
    };

    const manager = renderFor('manager', true);
    expect(manager.indexOf('FGI & allocations')).toBeLessThan(manager.indexOf('>Models<'));
    const admin = renderFor('admin', false);
    expect(admin).not.toContain('FGI & allocations');
    expect(admin.indexOf('>Models<')).toBeLessThan(admin.indexOf('Administration'));
    const owner = renderFor('owner', false);
    expect(owner.indexOf('>Models<')).toBeLessThan(owner.indexOf('Administration'));
    expect(renderFor('reviewer', false)).not.toContain('models.arrweb.com');
    expect(renderFor('operator', false)).not.toContain('models.arrweb.com');
  });

  it('keeps reviewer and manufacturing associate navigation free of Models', async () => {
    const js = await source();
    const shell = js.match(/function shell\(\)[\s\S]*?\nasync function render/)?.[0] ?? '';
    expect(shell).toContain("['manager','admin','owner'].includes(S.user?.role)");
    expect(shell).not.toContain("['reviewer','manager','admin','owner'].includes(S.user?.role)");
  });

  it('right-aligns only the Website tickets utility link, not Models app links', async () => {
    const [js, css] = await Promise.all([source(), styles()]);
    expect(js).toContain('class="tabs-utility"');
    expect(js).toContain('Website tickets');
    expect(css).not.toContain('.tabs>a{align-self:center;margin-left:auto');
    expect(css).toContain('.tabs>a.tabs-utility{margin-left:auto');
  });

  it('cache-busts the changed production assets', async () => {
    const page = await html();
    expect(page).toContain('production.css?v=20261111-test-c-bulk-v1');
    expect(page).toContain('production.js?v=20261111-test-c-bulk-v1');
  });
});
