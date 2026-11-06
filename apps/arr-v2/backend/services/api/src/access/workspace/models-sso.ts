import { timingSafeEqual } from 'node:crypto';
import { AccessError } from '../domain.js';
import { WorkspaceStore, type WorkspaceTx } from './store.js';
import { check, hashPassword, now, secret, sha256, verifyPassword, type User } from './model.js';

export const MODELS_ORIGIN = 'https://models.arrweb.com';
export const MODELS_STATE_COOKIE = 'models_sso_state';
const ALLOWED_ROLES = new Set(['manager', 'admin', 'owner']);
const CODE_LIFETIME_MS = 60_000;
const DUMMY_PASSWORD = hashPassword('models-credential-timing-placeholder');

type ModelsIdentity = Pick<User, 'id' | 'username' | 'role' | 'generation'>;
type StoredCode = { user: string; state: string; generation: number; expires: string };

const expires = () => new Date(Date.now() + CODE_LIFETIME_MS).toISOString();
const allowed = (user: User | undefined): user is User => Boolean(
  user?.active && !user.suspendedAt && ALLOWED_ROLES.has(user.role),
);

function opaque(value: unknown, label: string) {
  check(typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\x00-\x20]/.test(value), `Invalid ${label}.`);
  return value;
}

function configuredSecret() {
  const value = process.env.SSO_SHARED_SECRET;
  const normalized = value?.trim().toUpperCase() ?? '';
  if (
    !value ||
    value.length < 32 ||
    /^REPLACE(?:_|$)/.test(normalized) ||
    ['CHANGEME', 'CHANGE_ME', 'PLACEHOLDER', 'YOUR_SECRET_HERE'].includes(normalized)
  ) throw new AccessError(503, 'Models SSO is not configured.');
  return value;
}

export function verifyModelsBearer(header: string | undefined) {
  const expected = configuredSecret();
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const expectedBytes = Buffer.from(sha256(expected), 'hex');
  const suppliedBytes = Buffer.from(sha256(supplied), 'hex');
  if (!timingSafeEqual(expectedBytes, suppliedBytes))
    throw new AccessError(401, 'Models SSO authentication failed.');
}

export async function authenticateModelsCredentials(
  store: WorkspaceStore,
  input: Record<string, unknown>,
): Promise<ModelsIdentity> {
  const username = typeof input.username === 'string' && input.username.length <= 200
    ? input.username.toLowerCase()
    : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const result = await store.transaction(async (tx) => {
    const users = await tx.list<User>('user');
    const user = users.find((candidate) =>
      candidate.username.toLowerCase() === username || candidate.email.toLowerCase() === username,
    );
    const passwordMatches = verifyPassword(password, user?.password ?? DUMMY_PASSWORD);
    if (!user || !passwordMatches || !allowed(user)) return undefined;
    const at = now();
    user.lastLoginAt = at;
    user.lastActivityAt = at;
    await tx.put('user', user.id, user);
    return { id: user.id, username: user.username, role: user.role, generation: user.generation };
  });
  if (!result) throw new AccessError(401, 'Username or password is incorrect.');
  return result;
}

async function sessionUser(tx: WorkspaceTx, token: string) {
  const session = await tx.get<{ user: string; generation: number; expires: string }>('session', sha256(token));
  if (!session || session.expires <= now()) throw new AccessError(401, 'Please sign in to the staff workspace.');
  const user = await tx.get<User>('user', session.user);
  if (!user?.active || user.suspendedAt || user.generation !== session.generation)
    throw new AccessError(401, 'Please sign in to the staff workspace.');
  if (!ALLOWED_ROLES.has(user.role)) throw new AccessError(403, 'Models access requires Manager or higher.');
  return user;
}

export async function authorizeModels(store: WorkspaceStore, token: string, requestedState: unknown) {
  const state = opaque(requestedState, 'state');
  const code = secret();
  await store.transaction(async (tx) => {
    const user = await sessionUser(tx, token);
    await tx.put('models-sso-code', sha256(code), {
      user: user.id,
      state,
      generation: user.generation,
      expires: expires(),
    } satisfies StoredCode);
  });
  return { code, state };
}

export async function exchangeModelsCode(store: WorkspaceStore, input: Record<string, unknown>): Promise<ModelsIdentity> {
  const code = opaque(input.code, 'code');
  const state = opaque(input.state, 'state');
  const result = await store.transaction(async (tx) => {
    const key = sha256(code);
    const record = await tx.get<StoredCode>('models-sso-code', key);
    if (!record) return { status: 401 as const };
    await tx.remove('models-sso-code', key);
    if (record.expires <= now() || record.state !== state) return { status: 401 as const };
    const user = await tx.get<User>('user', record.user);
    if (!allowed(user) || user.generation !== record.generation) return { status: 403 as const };
    return {
      status: 200 as const,
      identity: { id: user.id, username: user.username, role: user.role, generation: user.generation },
    };
  });
  if (result.status !== 200) throw new AccessError(result.status, result.status === 401 ? 'SSO code is invalid or expired.' : 'Account is no longer eligible for Models.');
  return result.identity;
}

export function newModelsState() {
  return secret();
}

export function parseModelsIdentity(value: unknown): ModelsIdentity {
  check(Boolean(value) && typeof value === 'object' && !Array.isArray(value), 'Models identity is invalid.', 401);
  const identity = value as Record<string, unknown>;
  check(
    Object.keys(identity).sort().join(',') === 'generation,id,role,username',
    'Models identity is invalid.',
    401,
  );
  check(typeof identity.id === 'string' && identity.id.length > 0 && identity.id.length <= 160, 'Models identity is invalid.', 401);
  check(typeof identity.username === 'string' && identity.username.length > 0 && identity.username.length <= 160, 'Models identity is invalid.', 401);
  check(typeof identity.role === 'string' && ALLOWED_ROLES.has(identity.role), 'Models identity is not authorized.', 403);
  check(Number.isInteger(identity.generation) && Number(identity.generation) > 0, 'Models identity is invalid.', 401);
  return identity as ModelsIdentity;
}

export async function revalidateModelsIdentity(
  store: WorkspaceStore,
  input: Record<string, unknown>,
): Promise<ModelsIdentity> {
  const asserted = parseModelsIdentity(input);
  const current = await store.transaction(async (tx) => {
    const user = await tx.get<User>('user', asserted.id);
    if (!allowed(user) ||
        user.username !== asserted.username ||
        user.role !== asserted.role ||
        user.generation !== asserted.generation) return undefined;
    return { id: user.id, username: user.username, role: user.role, generation: user.generation };
  });
  if (!current) throw new AccessError(403, 'ARR account is no longer eligible for Models.');
  return current;
}

export async function createStaffSessionFromModels(store: WorkspaceStore, asserted: ModelsIdentity) {
  const session = secret();
  await store.transaction(async (tx) => {
    const user = await tx.get<User>('user', asserted.id);
    check(
      allowed(user) &&
        user.username === asserted.username &&
        user.role === asserted.role &&
        user.generation === asserted.generation,
      'ARR account is no longer eligible for shared sign-in.',
      403,
    );
    const at = now();
    user.lastLoginAt = at;
    user.lastActivityAt = at;
    await tx.put('user', user.id, user);
    await tx.put('session', sha256(session), {
      user: user.id,
      generation: user.generation,
      expires: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    });
  });
  return session;
}

export function modelsSharedSecret() {
  return configuredSecret();
}
