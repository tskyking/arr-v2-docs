import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { AccessStore } from '../store.js';
import { createAccessHandler } from '../handler.js';
import { WorkspaceStore } from '../workspace/store.js';
import { WorkspaceService } from '../workspace/service.js';
import { hashPassword, sha256, type User } from '../workspace/model.js';
import { modelsSharedSecret } from '../workspace/models-sso.js';

const sharedSecret = 'test-only-models-sso-secret-32-characters';
const headers = { 'Content-Type': 'application/json', 'X-ARR-Request': '1' };

describe('ARR and Models one-time SSO exchange', () => {
  let db: PGlite;
  let pool: Pool;
  let workspaceStore: WorkspaceStore;
  let workspace: WorkspaceService;
  let server: Server;
  let base: string;
  let tail = Promise.resolve();
  const tokens = new Map<string, string>();
  const originalSecret = process.env.SSO_SHARED_SECRET;
  const realFetch = globalThis.fetch;

  const acquire = async () => {
    let release!: () => void;
    const previous = tail;
    tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    return release;
  };

  const saturateLimit = async (key: string, count: number) => {
    await pool.query(
      "INSERT INTO tschutes_arr_limits(key,count,expires_at) VALUES($1,$2,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=EXCLUDED.count,expires_at=EXCLUDED.expires_at",
      [key, count],
    );
  };
  const request = (path: string, init: RequestInit = {}) => realFetch(base + path, init);
  const cookie = (role: string) => `tschutes_workspace=${tokens.get(role)}`;
  const authorize = (role: string, state = 'state-from-models') => request(`sso/models/authorize?state=${encodeURIComponent(state)}`, {
    headers: { Cookie: cookie(role) },
    redirect: 'manual',
  });
  const codeFrom = (response: Response) => new URL(response.headers.get('location')!).searchParams.get('code')!;
  const credentials = (username: string, password: string, secret = sharedSecret) => request('sso/models/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ username, password }),
  });
  const revalidate = (identity: Record<string, unknown>, secret = sharedSecret) => request('sso/models/revalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(identity),
  });
  const exchange = (code: string, state: string, secret = sharedSecret) => request('sso/models/exchange', {
    method: 'POST',
    headers: { ...headers, Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ code, state }),
  });

  beforeAll(async () => {
    process.env.SSO_SHARED_SECRET = sharedSecret;
    db = new PGlite();
    const raw = async (sql: string, args?: unknown[]) => {
      if (sql.includes('CREATE TABLE') && !args) {
        await db.exec(sql);
        return { rows: [] };
      }
      return db.query(sql, args);
    };
    pool = {
      query: async (sql: string, args?: unknown[]) => {
        const release = await acquire();
        try { return await raw(sql, args); } finally { release(); }
      },
      connect: async () => {
        const release = await acquire();
        return { query: raw, release };
      },
    } as unknown as Pool;
    workspaceStore = new WorkspaceStore(pool);
    workspace = new WorkspaceService(workspaceStore);
    await workspaceStore.init();
    await workspaceStore.transaction(async (tx) => {
      await workspace.seed(tx);
      for (const role of ['manager', 'admin', 'owner', 'reviewer'] as const) {
        const user: User = {
          id: role,
          username: role,
          email: `${role}@example.com`,
          role,
          forms: [],
          active: true,
          generation: 1,
          password: hashPassword(`test-password-for-${role}`),
        };
        await tx.put('user', role, user);
      }
    });
    for (const role of ['manager', 'admin', 'owner', 'reviewer']) {
      const result = await workspace.execute('login', { username: role, password: `test-password-for-${role}` }, '');
      tokens.set(role, result.token);
    }
    const accessStore = new AccessStore(pool);
    await accessStore.init();
    const handlers = [createAccessHandler(accessStore, true), createAccessHandler(new AccessStore(pool), true)];
    let next = 0;
    server = createServer(async (req, res) => {
      const path = new URL(req.url!, 'http://local').pathname.replace(/^\/api/, '');
      if (!(await handlers[next++ % handlers.length](req, res, path))) res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/access-demo/`;
  }, 30_000);

  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    if (originalSecret === undefined) delete process.env.SSO_SHARED_SECRET;
    else process.env.SSO_SHARED_SECRET = originalSecret;
    server?.closeAllConnections();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    await db?.close();
  });

  it.each(['manager', 'admin', 'owner'])('authorizes active %s sessions and exchanges an exact minimal identity once', async (role) => {
    const state = `models-state-${role}`;
    const authorized = await authorize(role, state);
    expect(authorized.status).toBe(302);
    const location = new URL(authorized.headers.get('location')!);
    expect(location.origin + location.pathname).toBe('https://models.arrweb.com/sso/arr/callback');
    expect(location.searchParams.get('state')).toBe(state);
    expect([...location.searchParams.keys()].sort()).toEqual(['code', 'state']);

    const first = await exchange(location.searchParams.get('code')!, state);
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ id: role, username: role, role, generation: 1 });
    expect((await exchange(location.searchParams.get('code')!, state)).status).toBe(401);
  });

  it('authenticates Models credentials against ARR without creating an ARR session', async () => {
    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'manager');
      Object.assign(user!, { active: true, role: 'manager', generation: 1, suspendedAt: undefined, lastLoginAt: undefined, lastActivityAt: undefined });
      await tx.put('user', 'manager', user);
    });
    const before = Number((await pool.query("SELECT count(*) n FROM tschutes_v2_documents WHERE kind='session'")).rows[0].n);
    const response = await credentials('MANAGER', 'test-password-for-manager');
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toEqual({ id: 'manager', username: 'manager', role: 'manager', generation: 1 });
    const after = Number((await pool.query("SELECT count(*) n FROM tschutes_v2_documents WHERE kind='session'")).rows[0].n);
    expect(after).toBe(before);
    const user = await workspaceStore.transaction((tx) => tx.get<User>('user', 'manager'));
    expect(user?.lastLoginAt).toBeTruthy();
    expect(user?.lastActivityAt).toBe(user?.lastLoginAt);
  });

  it('returns one generic credential rejection for bad, inactive, suspended and disallowed accounts', async () => {
    const failures: Array<[string, string, Partial<User>]> = [
      ['manager', 'wrong-password', { active: true, role: 'manager', suspendedAt: undefined }],
      ['manager', 'test-password-for-manager', { active: false, role: 'manager', suspendedAt: undefined }],
      ['manager', 'test-password-for-manager', { active: true, role: 'manager', suspendedAt: '2026-01-01T00:00:00.000Z' }],
      ['reviewer', 'test-password-for-reviewer', { active: true, role: 'reviewer', suspendedAt: undefined }],
      ['unknown', 'not-a-real-password', {}],
    ];
    const results: Array<{ status: number; body: unknown; cookie: string | null }> = [];
    for (const [username, password, changes] of failures) {
      if (username !== 'unknown') {
        await workspaceStore.transaction(async (tx) => {
          const user = await tx.get<User>('user', username);
          Object.assign(user!, changes);
          await tx.put('user', username, user);
        });
      }
      const response = await credentials(username, password);
      results.push({ status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') });
    }
    expect(results).toEqual(results.map(() => ({
      status: 401,
      body: { error: 'Username or password is incorrect.' },
      cookie: null,
    })));
  });

  it('rejects credential backchannel requests without the shared Bearer secret', async () => {
    const missing = await request('sso/models/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'manager', password: 'test-password-for-manager' }),
    });
    expect(missing.status).toBe(401);
    expect((await credentials('manager', 'test-password-for-manager', 'wrong-secret-that-is-still-long-enough')).status).toBe(401);
  });

  it('revalidates the exact asserted Models identity without creating an ARR session', async () => {
    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'admin');
      Object.assign(user!, { active: true, role: 'admin', generation: 1, suspendedAt: undefined });
      await tx.put('user', 'admin', user);
    });
    const before = Number((await pool.query("SELECT count(*) n FROM tschutes_v2_documents WHERE kind='session'")).rows[0].n);
    const response = await revalidate({ id: 'admin', username: 'admin', role: 'admin', generation: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(await response.json()).toEqual({ id: 'admin', username: 'admin', role: 'admin', generation: 1 });
    const after = Number((await pool.query("SELECT count(*) n FROM tschutes_v2_documents WHERE kind='session'")).rows[0].n);
    expect(after).toBe(before);
  });

  it('rejects stale, changed, suspended, inactive and disallowed revalidation assertions', async () => {
    const baseline = { id: 'manager', username: 'manager', role: 'manager', generation: 1 };
    const scenarios: Array<{ user: Partial<User>; asserted?: Record<string, unknown> }> = [
      { user: { active: true, role: 'manager', generation: 1, suspendedAt: undefined }, asserted: { ...baseline, username: 'old-manager' } },
      { user: { active: true, role: 'admin', generation: 1, suspendedAt: undefined } },
      { user: { active: true, role: 'manager', generation: 2, suspendedAt: undefined } },
      { user: { active: true, role: 'manager', generation: 1, suspendedAt: '2026-01-01T00:00:00.000Z' } },
      { user: { active: false, role: 'manager', generation: 1, suspendedAt: undefined } },
      { user: { active: true, role: 'reviewer', generation: 1, suspendedAt: undefined } },
    ];
    for (const scenario of scenarios) {
      await workspaceStore.transaction(async (tx) => {
        const user = await tx.get<User>('user', 'manager');
        Object.assign(user!, scenario.user);
        await tx.put('user', 'manager', user);
      });
      const response = await revalidate(scenario.asserted ?? baseline);
      expect(response.status).toBe(403);
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect((await revalidate(baseline, 'wrong-secret-that-is-still-long-enough')).status).toBe(401);
  });

  it('rejects reviewer, production operator, unauthenticated, changed, suspended, expired and mismatched exchanges', async () => {
    await workspaceStore.transaction(async (tx) => {
      const manager = await tx.get<User>('user', 'manager');
      Object.assign(manager!, { role: 'manager', active: true, generation: 1, suspendedAt: undefined });
      await tx.put('user', 'manager', manager);
      await tx.put('session', sha256(tokens.get('manager')!), { user: 'manager', generation: 1, expires: '2099-01-01T00:00:00.000Z' });
    });
    expect((await authorize('reviewer')).status).toBe(403);
    expect((await request('sso/models/authorize?state=x', { headers: { Cookie: 'production_operator=fictional' }, redirect: 'manual' })).status).toBe(401);
    expect((await request('sso/models/authorize?state=x', { redirect: 'manual' })).status).toBe(401);

    const mismatchAuth = await authorize('manager', 'right-state');
    const mismatchCode = codeFrom(mismatchAuth);
    expect((await exchange(mismatchCode, 'wrong-state')).status).toBe(401);
    expect((await exchange(mismatchCode, 'right-state')).status).toBe(401);

    const expiredAuth = await authorize('manager', 'expired-state');
    const expiredCode = codeFrom(expiredAuth);
    await workspaceStore.transaction(async (tx) => {
      const record = await tx.get('models-sso-code', sha256(expiredCode));
      await tx.put('models-sso-code', sha256(expiredCode), { ...record, expires: '2000-01-01T00:00:00.000Z' });
    });
    expect((await exchange(expiredCode, 'expired-state')).status).toBe(401);

    for (const mutation of [
      (u: User) => { u.role = 'reviewer'; },
      (u: User) => { u.suspendedAt = new Date().toISOString(); },
      (u: User) => { u.active = false; },
      (u: User) => { u.generation += 1; },
    ]) {
      await workspaceStore.transaction(async (tx) => {
        const user = await tx.get<User>('user', 'manager');
        Object.assign(user!, { role: 'manager', active: true, generation: 1, suspendedAt: undefined });
        await tx.put('user', 'manager', user);
      });
      const response = await authorize('manager', 'changed-state');
      const code = codeFrom(response);
      await workspaceStore.transaction(async (tx) => {
        const user = await tx.get<User>('user', 'manager');
        mutation(user!);
        await tx.put('user', 'manager', user);
      });
      expect((await exchange(code, 'changed-state')).status).toBe(403);
    }
  });

  it('atomically permits exactly one concurrent exchange and stores no plaintext code', async () => {
    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'manager');
      Object.assign(user!, { role: 'manager', active: true, generation: 1 });
      await tx.put('user', 'manager', user);
      await tx.put('session', sha256(tokens.get('manager')!), { user: 'manager', generation: 1, expires: '2099-01-01T00:00:00.000Z' });
    });
    const authorized = await authorize('manager', 'race-state');
    const code = codeFrom(authorized);
    const rows = await pool.query("SELECT id,data FROM tschutes_v2_documents WHERE kind='models-sso-code'");
    expect(rows.rows.some((row: any) => row.id === code || JSON.stringify(row.data).includes(code))).toBe(false);
    const stored = rows.rows.find((row: any) => row.id === sha256(code)).data;
    expect(Date.parse(stored.expires) - Date.now()).toBeGreaterThan(0);
    expect(Date.parse(stored.expires) - Date.now()).toBeLessThanOrEqual(60_000);
    const responses = await Promise.all([exchange(code, 'race-state'), exchange(code, 'race-state')]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
  });

  it('persistently rate limits every public SSO navigation route before handling', async () => {
    const cases = [
      { route: 'start', path: 'sso/models/start', maximum: 60 },
      { route: 'callback', path: 'sso/models/callback?code=x&state=x', maximum: 120 },
      { route: 'authorize', path: 'sso/models/authorize?state=x', maximum: 120 },
    ];
    for (const [index, scenario] of cases.entries()) {
      const ip = `203.0.113.${index + 10}`;
      await saturateLimit(`sso:models:public:${scenario.route}:ip:${sha256(ip)}`, scenario.maximum);
      const response = await request(scenario.path, { headers: { 'CF-Connecting-IP': ip }, redirect: 'manual' });
      expect(response.status).toBe(429);
    }
    await saturateLimit('sso:models:public:start:global', 10_000);
    const globalLimited = await request('sso/models/start', { headers: { 'CF-Connecting-IP': '203.0.113.99' }, redirect: 'manual' });
    expect(globalLimited.status).toBe(429);
    await pool.query("DELETE FROM tschutes_arr_limits WHERE key='sso:models:public:start:global'");
    const normal = await request('sso/models/start', { headers: { 'CF-Connecting-IP': '203.0.113.100' }, redirect: 'manual' });
    expect(normal.status).toBe(302);
  });

  it('uses high persistent service ceilings for every authenticated backchannel route', async () => {
    for (const [index, route] of ['exchange', 'credentials', 'revalidate'].entries()) {
      const ip = `198.51.100.${index + 10}`;
      await saturateLimit(`sso:models:backchannel:${route}:service`, 20_000);
      const response = await request(`sso/models/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sharedSecret}`, 'CF-Connecting-IP': ip },
        body: '{}',
      });
      expect(response.status).toBe(429);
    }
    await pool.query("DELETE FROM tschutes_arr_limits WHERE key LIKE 'sso:models:backchannel:%:service'");
    await saturateLimit('sso:models:backchannel:global', 100_000);
    const globalLimited = await request('sso/models/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sharedSecret}`, 'CF-Connecting-IP': '198.51.100.98' },
      body: '{}',
    });
    expect(globalLimited.status).toBe(429);
    await pool.query("DELETE FROM tschutes_arr_limits WHERE key LIKE 'sso:models:backchannel:%'");
    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'owner');
      Object.assign(user!, { active: true, role: 'owner', suspendedAt: undefined });
      await tx.put('user', 'owner', user);
    });
    const normal = await request('sso/models/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sharedSecret}`, 'CF-Connecting-IP': '198.51.100.99' },
      body: JSON.stringify({ username: 'owner', password: 'test-password-for-owner' }),
    });
    expect(normal.status).toBe(200);
  });

  it('starts Models-first SSO with a short Lax state cookie and accepts only a matching authoritative identity', async () => {
    const started = await request('sso/models/start?return=https://evil.invalid', { redirect: 'manual' });
    expect(started.status).toBe(302);
    const startLocation = new URL(started.headers.get('location')!);
    expect(startLocation.origin + startLocation.pathname).toBe('https://models.arrweb.com/sso/arr/authorize');
    expect([...startLocation.searchParams.keys()]).toEqual(['state']);
    const state = startLocation.searchParams.get('state')!;
    const stateCookie = started.headers.get('set-cookie')!;
    expect(stateCookie).toContain('models_sso_state=');
    expect(stateCookie).toContain('HttpOnly');
    expect(stateCookie).toContain('SameSite=Lax');
    expect(stateCookie).toContain('Max-Age=60');
    expect(stateCookie).not.toContain('Secure');

    const outbound: Array<{ url: string; init?: RequestInit }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (!url.startsWith('https://models.arrweb.com/')) return realFetch(input, init);
      outbound.push({ url, init });
      return new Response(JSON.stringify({ id: 'manager', username: 'manager', role: 'manager', generation: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const callback = await request(`sso/models/callback?code=models-code&state=${encodeURIComponent(state)}&return=https://evil.invalid`, {
      headers: { Cookie: stateCookie.split(';')[0] },
      redirect: 'manual',
    });
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).toBe('/api/access-demo/production.html');
    expect(callback.headers.get('set-cookie')).toContain('tschutes_workspace=');
    expect(callback.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(callback.headers.get('set-cookie')).toContain('models_sso_state=;');
    expect(outbound).toHaveLength(1);
    expect(outbound[0].url).toBe('https://models.arrweb.com/sso/arr/exchange');
    expect(outbound[0].init?.headers).toMatchObject({ Authorization: `Bearer ${sharedSecret}`, 'Content-Type': 'application/json' });
    expect(JSON.parse(String(outbound[0].init?.body))).toEqual({ code: 'models-code', state });

    const staffCookie = callback.headers.get('set-cookie')!.match(/tschutes_workspace=[^;]+/)![0];
    const destination = await request(new URL(callback.headers.get('location')!, base).pathname.replace('/api/access-demo/', ''), {
      headers: { Cookie: staffCookie },
    });
    expect(destination.status).toBe(200);
    expect(await destination.text()).toContain('production.js');
    const catalog = await request('v2/catalog', { method: 'POST', headers: { ...headers, Cookie: staffCookie }, body: '{}' });
    expect((await catalog.json()).user.username).toBe('manager');
  });

  it('rejects wrong callback state, secret, identity, role, suspension and generation without creating a Staff session', async () => {
    const scenarios = [
      { identity: { id: 'missing', username: 'manager', role: 'manager', generation: 1 }, status: 403 },
      { identity: { id: 'manager', username: 'wrong', role: 'manager', generation: 1 }, status: 403 },
      { identity: { id: 'manager', username: 'manager', role: 'reviewer', generation: 1 }, status: 403 },
      { identity: { id: 'manager', username: 'manager', role: 'manager', generation: 999 }, status: 403 },
      { identity: { id: 'manager', username: 'manager', role: 'manager', generation: 1, active: true }, status: 401 },
    ];
    for (const scenario of scenarios) {
      const started = await request('sso/models/start', { redirect: 'manual' });
      const state = new URL(started.headers.get('location')!).searchParams.get('state')!;
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify(scenario.identity), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      const callback = await request(`sso/models/callback?code=code&state=${state}`, { headers: { Cookie: started.headers.get('set-cookie')!.split(';')[0] }, redirect: 'manual' });
      expect(callback.status).toBe(scenario.status);
      expect(callback.headers.get('set-cookie') ?? '').not.toContain('tschutes_workspace=');
      vi.restoreAllMocks();
    }

    const started = await request('sso/models/start', { redirect: 'manual' });
    const state = new URL(started.headers.get('location')!).searchParams.get('state')!;
    expect((await request(`sso/models/callback?code=code&state=wrong`, { headers: { Cookie: started.headers.get('set-cookie')!.split(';')[0] }, redirect: 'manual' })).status).toBe(401);
    expect((await exchange('code', 'state', 'wrong-secret-that-is-still-long-enough')).status).toBe(401);

    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'manager');
      user!.active = false;
      await tx.put('user', 'manager', user);
    });
    const suspendedStart = await request('sso/models/start', { redirect: 'manual' });
    const suspendedState = new URL(suspendedStart.headers.get('location')!).searchParams.get('state')!;
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ id: 'manager', username: 'manager', role: 'manager', generation: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect((await request(`sso/models/callback?code=code&state=${suspendedState}`, { headers: { Cookie: suspendedStart.headers.get('set-cookie')!.split(';')[0] }, redirect: 'manual' })).status).toBe(403);
  });

  it('rejects deployment placeholder secrets and declares an encrypted runtime secret', () => {
    process.env.SSO_SHARED_SECRET = 'REPLACE_WITH_SHARED_SSO_SECRET_AT_LEAST_32_CHARACTERS';
    try {
      expect(() => modelsSharedSecret()).toThrow('Models SSO is not configured.');
    } finally {
      process.env.SSO_SHARED_SECRET = sharedSecret;
    }
    const spec = readFileSync(resolve(process.cwd(), '../deploy/digitalocean-app.yaml'), 'utf8');
    expect(spec).toMatch(/- key: SSO_SHARED_SECRET\n\s+value: REPLACE_WITH_SHARED_SSO_SECRET_AT_LEAST_32_CHARACTERS\n\s+type: SECRET\n\s+scope: RUN_TIME/);
  });

  it('uses Lax only for Staff cookies, keeps operator Strict, and cleanup removes expired SSO codes', async () => {
    await workspaceStore.transaction(async (tx) => {
      const user = await tx.get<User>('user', 'manager');
      Object.assign(user!, { active: true, role: 'manager', generation: 1 });
      await tx.put('user', 'manager', user);
      await tx.put('models-sso-code', 'expired-code-hash', { expires: '2000-01-01T00:00:00.000Z' });
      await tx.cleanup();
      expect(await tx.get('models-sso-code', 'expired-code-hash')).toBeUndefined();
    });
    const login = await request('v2/login', { method: 'POST', headers, body: JSON.stringify({ username: 'manager', password: 'test-password-for-manager' }) });
    expect(login.headers.get('set-cookie')).toContain('SameSite=Lax');
    const operator = await request('v2/production-login', { method: 'POST', headers, body: JSON.stringify({ username: 'person-1', password: 'abc@123' }) });
    expect(operator.headers.get('set-cookie')).toContain('SameSite=Strict');

    const productionHandler = createAccessHandler(new AccessStore(pool), false);
    const productionServer = createServer(async (req, res) => {
      const path = new URL(req.url!, 'http://local').pathname.replace(/^\/api/, '');
      if (!(await productionHandler(req, res, path))) res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => productionServer.listen(0, '127.0.0.1', resolve));
    try {
      const productionBase = `http://127.0.0.1:${(productionServer.address() as { port: number }).port}/api/access-demo/`;
      const start = await realFetch(productionBase + 'sso/models/start', { redirect: 'manual' });
      expect(start.headers.get('set-cookie')).toContain('Secure');
    } finally {
      productionServer.closeAllConnections();
      await new Promise<void>((resolve) => productionServer.close(() => resolve()));
    }
  });
});
