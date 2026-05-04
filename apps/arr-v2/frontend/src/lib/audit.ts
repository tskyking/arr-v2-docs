import { buildApiPath } from './settings';

const CLIENT_ID_KEY = 'arr-v2.audit.clientId';
const SESSION_ID_KEY = 'arr-v2.audit.sessionId';
const LAST_EVENT_KEY = 'arr-v2.audit.lastEvent';

export type AuditEventType =
  | 'page_view'
  | 'navigation'
  | 'ui_click'
  | 'dashboard_action'
  | 'import_action'
  | 'review_action'
  | 'customer_action'
  | 'chart_selection'
  | 'month_selection'
  | 'export_download'
  | 'upload_start'
  | 'upload_success'
  | 'upload_error';

export interface ClientAuditEvent {
  eventType: AuditEventType;
  route?: string;
  path?: string;
  hash?: string;
  importId?: string;
  targetLabel?: string;
  targetId?: string;
}

function randomId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

export function getAuditClientId(): string {
  try {
    let value = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!value) {
      value = randomId('client');
      window.localStorage.setItem(CLIENT_ID_KEY, value);
    }
    return value;
  } catch {
    return randomId('client');
  }
}

function getAuditSessionId(): string {
  try {
    let value = window.sessionStorage.getItem(SESSION_ID_KEY);
    if (!value) {
      value = randomId('session');
      window.sessionStorage.setItem(SESSION_ID_KEY, value);
    }
    return value;
  } catch {
    return randomId('session');
  }
}

function shouldThrottle(event: ClientAuditEvent): boolean {
  const key = `${event.eventType}|${event.route ?? ''}|${event.targetId ?? ''}|${event.targetLabel ?? ''}`;
  const now = Date.now();
  try {
    const raw = window.sessionStorage.getItem(LAST_EVENT_KEY);
    const last = raw ? JSON.parse(raw) as { key: string; at: number } : undefined;
    if (last?.key === key && now - last.at < 1500) return true;
    window.sessionStorage.setItem(LAST_EVENT_KEY, JSON.stringify({ key, at: now }));
  } catch {
    // If storage is unavailable, still allow low-volume explicit events.
  }
  return false;
}

export function trackAuditEvent(event: ClientAuditEvent): void {
  if (typeof window === 'undefined') return;
  if (shouldThrottle(event)) return;

  const payload = {
    eventType: event.eventType,
    clientId: getAuditClientId(),
    sessionId: getAuditSessionId(),
    route: event.route ?? `${window.location.pathname}${window.location.search}${window.location.hash}`,
    path: event.path ?? window.location.pathname,
    hash: event.hash ?? window.location.hash,
    importId: event.importId,
    targetLabel: event.targetLabel,
    targetId: event.targetId,
  };

  // Fire-and-forget by design: telemetry must never slow down the app UX.
  fetch(buildApiPath('/audit/activity'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}

export function auditInteractiveClick(target: EventTarget | null): void {
  if (!(target instanceof Element)) return;
  const interactive = target.closest('a,button,[role="button"],input[type="submit"],input[type="button"]');
  if (!(interactive instanceof HTMLElement)) return;

  const label = interactive.dataset.auditLabel
    || interactive.getAttribute('aria-label')
    || interactive.textContent
    || interactive.getAttribute('title')
    || interactive.id
    || interactive.tagName.toLowerCase();

  trackAuditEvent({
    eventType: 'ui_click',
    targetId: interactive.dataset.auditId || interactive.id || undefined,
    targetLabel: label.replace(/\s+/g, ' ').trim().slice(0, 120),
  });
}
