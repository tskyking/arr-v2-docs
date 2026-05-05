import { normalizeTenantId } from './settings';

export type StagingLoginErrorCode =
  | 'USERNAME_UPPERCASE'
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_PASSWORD'
  | 'ADMIN_RESTRICTED';

export interface StagingLoginValidation {
  ok: boolean;
  normalizedEmail?: string;
  username?: string;
  normalizedTenantId?: string;
  errorCode?: StagingLoginErrorCode;
  message?: string;
  isAdminAllowed?: boolean;
}

const DEMO_EMAIL_RE = /^([a-z]+)@[a-z0-9-]+\.[a-z0-9.-]+$/;

export function validateStagingLogin(email: string, password: string, tenantId: string): StagingLoginValidation {
  const trimmedEmail = email.trim();
  const normalizedTenantId = normalizeTenantId(tenantId);

  if (/[A-Z]/.test(trimmedEmail)) {
    return {
      ok: false,
      normalizedTenantId,
      errorCode: 'USERNAME_UPPERCASE',
      message: 'Please use lowercase in username.',
    };
  }

  const match = trimmedEmail.match(DEMO_EMAIL_RE);
  if (!match) {
    return {
      ok: false,
      normalizedTenantId,
      errorCode: 'INVALID_EMAIL_FORMAT',
      message: 'Use demo email format like brian@example.com.',
    };
  }

  const username = match[1];
  const requiredPassword = username === 'todd'
    ? 'todd@DEF'
    : username === 'brian'
      ? 'brian@ABC'
      : `${username}@XYZ`;

  if (password !== requiredPassword) {
    return {
      ok: false,
      normalizedEmail: trimmedEmail,
      username,
      normalizedTenantId,
      errorCode: 'INVALID_PASSWORD',
      message: 'Invalid staging password for this user.',
    };
  }

  if (normalizedTenantId === 'admin' && username !== 'todd' && username !== 'brian') {
    return {
      ok: false,
      normalizedEmail: trimmedEmail,
      username,
      normalizedTenantId,
      errorCode: 'ADMIN_RESTRICTED',
      message: 'Admin tenant is restricted to Todd and Brian in staging.',
    };
  }

  return {
    ok: true,
    normalizedEmail: trimmedEmail,
    username,
    normalizedTenantId,
    isAdminAllowed: normalizedTenantId === 'admin',
  };
}
