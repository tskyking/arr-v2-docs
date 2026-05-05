import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildAdminApiPath, useArrSettings } from '@/lib/settings';
import styles from './AdminAuditPage.module.css';

interface AuditTenantSummary {
  tenantId: string;
  lastTouchedAt: string;
  lastEventType: string;
  lastUserEmail?: string;
  eventCount: number;
  lastUploadAt?: string;
  lastUploadEventType?: string;
  links: Record<string, string>;
}

interface AuditEvent {
  id?: string | number;
  timestamp: string;
  tenantId: string;
  eventType: string;
  userEmail?: string;
  route?: string;
  path?: string;
  targetLabel?: string;
  filename?: string;
  rowCount?: number;
  importId?: string;
  errorCode?: string;
  errorMessage?: string;
}

type DrilldownFilter = 'events' | 'uploads' | 'uploadErrors' | 'pageViews' | 'clicks';

const FILTER_LABELS: Record<DrilldownFilter, string> = {
  events: 'last 100 touches',
  uploads: 'uploads',
  uploadErrors: 'upload errors',
  pageViews: 'page views',
  clicks: 'clicks',
};

const FILTER_TYPES: Partial<Record<DrilldownFilter, string>> = {
  uploads: 'upload_success',
  uploadErrors: 'upload_error',
  pageViews: 'page_view',
  clicks: 'ui_click',
};

function formatPacific(value?: string, withSeconds = false): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
    hour12: false,
  }).formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  const seconds = withSeconds ? `:${parts.second}` : '';
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}${seconds} PT`;
}

function shortImportId(importId?: string): string {
  return importId ? importId.slice(0, 8) : 'unknown';
}

function eventSentence(event: AuditEvent): string {
  const tenant = event.tenantId || 'unknown tenant';
  const user = event.userEmail || 'unknown user';
  const target = event.targetLabel || event.route || event.path || '';
  switch (event.eventType) {
    case 'login_success':
      return `Tenant ${tenant} login success by ${user}`;
    case 'login_error':
      return `Tenant ${tenant} login error ${event.errorCode || 'unknown'} by ${user}`;
    case 'page_view':
      return `Tenant ${tenant} viewed ${event.route || event.path || 'unknown route'} by ${user}`;
    case 'ui_click':
      return `Tenant ${tenant} clicked ${event.targetLabel || 'unknown target'} by ${user}`;
    case 'upload_start':
      return `Tenant ${tenant} started upload ${event.filename || event.targetLabel || 'unknown file'} by ${user}`;
    case 'upload_success':
      return `Tenant ${tenant} uploaded ${event.filename || event.targetLabel || 'unknown file'}; ${event.rowCount ?? 'unknown'} rows; import ${shortImportId(event.importId)} by ${user}`;
    case 'upload_error':
      return `Tenant ${tenant} upload error ${event.errorCode || 'unknown'}: ${event.errorMessage || 'unknown error'} by ${user}`;
    case 'month_selection':
      return `Tenant ${tenant} selected month ${target || 'unknown'} by ${user}`;
    case 'chart_selection':
      return `Tenant ${tenant} selected chart period ${target || 'unknown'} by ${user}`;
    case 'export_download':
      return `Tenant ${tenant} downloaded export ${target || 'unknown'} by ${user}`;
    default:
      return `Tenant ${tenant} ${event.eventType} ${target} by ${user}`.replace(/\s+/g, ' ').trim();
  }
}

export default function AdminAuditPage() {
  const navigate = useNavigate();
  const { logout, userEmail } = useArrSettings();
  const [tenants, setTenants] = useState<AuditTenantSummary[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | undefined>();
  const [selectedFilter, setSelectedFilter] = useState<DrilldownFilter>('events');
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [lastRefreshed, setLastRefreshed] = useState<string | undefined>();
  const [autoRefresh, setAutoRefresh] = useState(false);

  const drilldownTitle = useMemo(() => (
    selectedTenant ? `Latest DO Touch Log History Tenant: ${selectedTenant}` : undefined
  ), [selectedTenant]);

  const loadTenants = useCallback(async () => {
    setLoadingTenants(true);
    setError(undefined);
    try {
      const res = await fetch(buildAdminApiPath('/audit/tenants?limit=100'), {
        headers: { 'X-User-Email': userEmail },
      });
      if (!res.ok) throw new Error('Unable to load tenant touch history from staging.');
      const data = await res.json() as { tenants: AuditTenantSummary[] };
      setTenants(data.tenants);
      setLastRefreshed(new Date().toISOString());
    } catch {
      setError('Unable to load tenant touch history from staging.');
    } finally {
      setLoadingTenants(false);
    }
  }, [userEmail]);

  const loadEvents = useCallback(async (tenantId: string, filter: DrilldownFilter) => {
    setLoadingEvents(true);
    setError(undefined);
    try {
      const params = new URLSearchParams({ tenantId, limit: '100' });
      const eventType = FILTER_TYPES[filter];
      if (eventType) params.set('type', eventType);
      const res = await fetch(buildAdminApiPath(`/audit/events?${params}`), {
        headers: { 'X-User-Email': userEmail },
      });
      if (!res.ok) throw new Error('Unable to load tenant touch history from staging.');
      const data = await res.json() as { events: AuditEvent[] };
      setEvents(data.events);
      setLastRefreshed(new Date().toISOString());
    } catch {
      setError('Unable to load tenant touch history from staging.');
    } finally {
      setLoadingEvents(false);
    }
  }, [userEmail]);

  const refresh = useCallback(() => {
    void loadTenants();
    if (selectedTenant) void loadEvents(selectedTenant, selectedFilter);
  }, [loadEvents, loadTenants, selectedFilter, selectedTenant]);

  useEffect(() => { void loadTenants(); }, [loadTenants]);

  useEffect(() => {
    if (!selectedTenant) return;
    void loadEvents(selectedTenant, selectedFilter);
  }, [loadEvents, selectedFilter, selectedTenant]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, refresh]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function drillInto(tenantId: string, filter: DrilldownFilter) {
    setSelectedTenant(tenantId);
    setSelectedFilter(filter);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>ARR-V2 Admin Audit</h1>
          <p className={styles.subtitle}>Staging admin audit view. Shows privacy-safe activity metadata only; no workbook contents or typed spreadsheet data.</p>
        </div>
        <button className="ghost" onClick={handleLogout}>Logout</button>
      </header>

      <div className={styles.warning}>
        Staging-only admin view. Access is controlled only by reserved tenant name <code>admin</code>; this is not production authentication.
      </div>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div>
            <h2 className={styles.sectionTitle}>Latest DO Tenant Touch Log History — All Tenants</h2>
            <p className={styles.muted}>Last refreshed: {lastRefreshed ? formatPacific(lastRefreshed, true) : '—'}</p>
          </div>
          <div className={styles.actions}>
            <label className={styles.autoRefresh}>
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
              Auto-refresh every 60 seconds
            </label>
            <button className="primary" onClick={refresh}>Refresh</button>
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {loadingTenants && <div className="loading">Loading tenant touch history…</div>}
        {!loadingTenants && tenants.length === 0 && <div className={styles.empty}>No tenant activity logged yet.</div>}
        {!loadingTenants && tenants.length > 0 && (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Last touched time</th>
                  <th>Tenant ID/name</th>
                  <th>Latest user email</th>
                  <th>Last event type</th>
                  <th>Event count</th>
                  <th>Last upload time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(tenant => (
                  <tr key={tenant.tenantId}>
                    <td>{formatPacific(tenant.lastTouchedAt)}</td>
                    <td>
                      <button className={styles.linkButton} onClick={() => drillInto(tenant.tenantId, 'events')}>
                        {tenant.tenantId}
                      </button>
                    </td>
                    <td>{tenant.lastUserEmail || 'unknown user'}</td>
                    <td>{tenant.lastEventType}</td>
                    <td>{tenant.eventCount}</td>
                    <td>{formatPacific(tenant.lastUploadAt)}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {(Object.keys(FILTER_LABELS) as DrilldownFilter[]).map(filter => (
                          <button key={filter} className="ghost" onClick={() => drillInto(tenant.tenantId, filter)}>
                            View {FILTER_LABELS[filter]}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedTenant && (
        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <div>
              <h2 className={styles.sectionTitle}>{drilldownTitle}</h2>
              <p className={styles.muted}>Showing {FILTER_LABELS[selectedFilter]}, newest first.</p>
            </div>
            <button className="ghost" onClick={() => setSelectedTenant(undefined)}>Close drilldown</button>
          </div>
          {loadingEvents && <div className="loading">Loading tenant touch history…</div>}
          {!loadingEvents && events.length === 0 && <div className={styles.empty}>No tenant activity logged yet.</div>}
          {!loadingEvents && events.length > 0 && (
            <div className={styles.eventList}>
              {events.map((event, index) => (
                <div className={styles.eventRow} key={`${event.id ?? 'event'}-${event.timestamp}-${index}`}>
                  <div>{formatPacific(event.timestamp)} — {eventSentence(event)}</div>
                  <div className={styles.meta}>event: {event.eventType}{event.route ? ` · route: ${event.route}` : ''}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
