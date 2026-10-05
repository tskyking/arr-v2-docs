import { AccessError } from '../domain.js';
import { sha256, text } from './model.js';
import type { WorkspaceTx } from './store.js';

export const PRODUCTION_LOGIN_FAILURE_POLICY = { account: 30, accountIp: 8, windowMs: 15 * 60_000 } as const;
const KIND = 'production-login-failure';
type FailureWindow = { count: number; expires: string };
/** Internal outcome: throw only AFTER commit, so rejected credentials don't roll back counters. */
export class ProductionLoginRejected {
  constructor(public readonly error: AccessError) {}
}

/** Called inside the workspace's database row-lock transaction (shared across instances).
 * The IP hash is supplied by the HTTP handler, never read from the request body.
 * Successful authentication clears failure windows; it never increments them.
 */
export async function protectProductionLogin(
  tx: WorkspaceTx, username: unknown, ipHash: string,
  authenticate: () => Promise<any>, at = Date.now(),
): Promise<any> {
  const account = sha256(text(username, 80).toLowerCase());
  const keys = [`account:${account}`, `account-ip:${sha256(account + ':' + ipHash)}`];
  const maxima = [PRODUCTION_LOGIN_FAILURE_POLICY.account, PRODUCTION_LOGIN_FAILURE_POLICY.accountIp];
  const windows = await Promise.all(keys.map(key => tx.get<FailureWindow>(KIND, key)));
  const active = windows.map(w => w && Date.parse(w.expires) > at ? w : undefined);
  if (active.some((w, i) => w && w.count >= maxima[i]))
    return new ProductionLoginRejected(new AccessError(429, 'Too many unsuccessful sign-in attempts for this account. Please try again in 15 minutes.'));
  try {
    const result = await authenticate();
    for (const key of keys) await tx.remove(KIND, key);
    return result;
  } catch (error) {
    if (!(error instanceof AccessError) || error.status !== 401) throw error;
    for (let i = 0; i < keys.length; i++) {
      const old = active[i];
      await tx.put(KIND, keys[i], { count: (old?.count || 0) + 1,
        expires: old?.expires || new Date(at + PRODUCTION_LOGIN_FAILURE_POLICY.windowMs).toISOString() });
    }
    return new ProductionLoginRejected(error);
  }
}
