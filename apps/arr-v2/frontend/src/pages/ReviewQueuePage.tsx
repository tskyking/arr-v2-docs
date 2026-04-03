/**
 * ReviewQueuePage — finance-user review workflow.
 * Lists all open review items for an import with severity, reason, and context.
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReviewQueue } from '@/lib/hooks';
import { resolveReviewItem, overrideReviewItem, bulkResolveReviewItems } from '@/lib/api';
import { useArrSettings } from '@/lib/settings';
import styles from './ReviewQueuePage.module.css';
import type { ReviewItem } from '@/lib/api';

function SeverityBadge({ severity }: { severity: 'warning' | 'error' }) {
  return <span className={`badge ${severity}`}>{severity}</span>;
}

function formatAmount(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function ReviewRow({
  item,
  onUpdated,
}: {
  item: ReviewItem;
  onUpdated: (updated: ReviewItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');

  const isOpen = item.status === 'open';

  async function handleResolve(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isOpen) return;
    setActing(true);
    setActionError(null);
    try {
      const updated = await resolveReviewItem(item.importId, item.id);
      onUpdated(updated);
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to resolve');
    } finally {
      setActing(false);
    }
  }

  async function handleOverrideSubmit(e: React.MouseEvent) {
    e.stopPropagation();
    if (!overrideNote.trim()) { setActionError('A note is required for overrides.'); return; }
    setActing(true);
    setActionError(null);
    try {
      const updated = await overrideReviewItem(item.importId, item.id, overrideNote.trim());
      onUpdated(updated);
      setShowOverride(false);
      setOverrideNote('');
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to override');
    } finally {
      setActing(false);
    }
  }

  const statusPill = item.status !== 'open'
    ? <span className={`badge ${item.status === 'resolved' ? 'success' : 'warning'}`}>{item.status}</span>
    : null;

  return (
    <>
      <tr
        className={styles.row}
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: 'pointer', opacity: item.status !== 'open' ? 0.6 : 1 }}
      >
        <td><SeverityBadge severity={item.severity} />{statusPill && <> {statusPill}</>}</td>
        <td className={styles.mono}>{item.reasonCode}</td>
        <td>{item.customerName || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
        <td>{item.productService || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
        <td style={{ textAlign: 'right' }}>{formatAmount(item.amount)}</td>
        <td>{item.invoiceDate || '—'}</td>
        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
          row {item.sourceRowNumber}
        </td>
        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {expanded ? '▲' : '▼'}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={8} className={styles.expandedCell}>
            <div className={styles.expandedContent}>
              <div className={styles.expandedMessage}>{item.message}</div>
              <div className={styles.expandedMeta}>
                ID: <span className={styles.mono}>{item.id}</span>
                {item.resolvedAt && (
                  <span style={{ marginLeft: 16, color: 'var(--text-muted)' }}>
                    {item.status === 'overridden' ? 'Overridden' : 'Resolved'} at{' '}
                    {new Date(item.resolvedAt).toLocaleString()}
                    {item.overrideNote && ` — "${item.overrideNote}"`}
                  </span>
                )}
              </div>

              {actionError && (
                <div className="error-banner" style={{ marginTop: 8, fontSize: 12 }}>{actionError}</div>
              )}

              {isOpen && !showOverride && (
                <div className={styles.expandedActions}>
                  <button
                    className="ghost"
                    style={{ fontSize: 12 }}
                    onClick={handleResolve}
                    disabled={acting}
                  >
                    {acting ? '…' : '✓ Mark resolved'}
                  </button>
                  <button
                    className="ghost"
                    style={{ fontSize: 12 }}
                    onClick={e => { e.stopPropagation(); setShowOverride(true); }}
                    disabled={acting}
                  >
                    ↩ Override
                  </button>
                </div>
              )}

              {isOpen && showOverride && (
                <div className={styles.overrideForm} onClick={e => e.stopPropagation()}>
                  <textarea
                    className={styles.overrideNote}
                    placeholder="Explain why this item is being overridden…"
                    value={overrideNote}
                    onChange={e => setOverrideNote(e.target.value)}
                    rows={2}
                    disabled={acting}
                  />
                  <div className={styles.expandedActions}>
                    <button className="primary" style={{ fontSize: 12 }} onClick={handleOverrideSubmit} disabled={acting || !overrideNote.trim()}>
                      {acting ? '…' : 'Submit override'}
                    </button>
                    <button className="ghost" style={{ fontSize: 12 }} onClick={e => { e.stopPropagation(); setShowOverride(false); setOverrideNote(''); }} disabled={acting}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReviewQueuePage() {
  const { importId } = useParams<{ importId: string }>();
  const { tenantId, userEmail } = useArrSettings();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warning' | 'error'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved' | 'overridden'>('all');
  const { data: queue, loading, error, refetch } = useReviewQueue(importId!);
  const [localItems, setLocalItems] = useState<ReviewItem[] | null>(null);
  const [bulkActing, setBulkActing] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Merge server-refreshed items with any local optimistic updates
  const items = localItems ?? queue?.items ?? [];

  function handleItemUpdated(updated: ReviewItem) {
    const base = localItems ?? queue?.items ?? [];
    setLocalItems(base.map(i => i.id === updated.id ? updated : i));
    // Trigger a background refetch to sync counts
    refetch();
  }

  async function handleResolveAllOpen() {
    if (!importId) return;
    setBulkActing(true);
    setBulkError(null);
    try {
      const result = await bulkResolveReviewItems(importId);
      if (result.items.length > 0) {
        const base = localItems ?? queue?.items ?? [];
        const updates = new Map(result.items.map(item => [item.id, item]));
        setLocalItems(base.map(item => updates.get(item.id) ?? item));
      }
      refetch();
    } catch (err: any) {
      setBulkError(err.message ?? 'Failed to resolve all open items');
    } finally {
      setBulkActing(false);
    }
  }

  if (loading && !queue) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-banner">Error: {error}</div>;
  if (!queue) return null;

  const filtered = items.filter(item => {
    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const errorCount = items.filter(i => i.severity === 'error').length;
  const warnCount = items.filter(i => i.severity === 'warning').length;
  const openCount = items.filter(i => i.status === 'open').length;
  const resolvedCount = items.filter(i => i.status !== 'open').length;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Review Queue</h1>
          <p className={styles.sub}>
            Tenant: <span className={styles.mono}>{tenantId}</span>
            {' '}· User: <span className={styles.mono}>{userEmail}</span>
            {' '}· Import: <span className={styles.mono}>{importId?.slice(0, 8)}…</span>{' '}
            · {queue.total} items requiring attention
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            className="ghost"
            onClick={handleResolveAllOpen}
            disabled={bulkActing || openCount === 0}
          >
            {bulkActing ? 'Resolving…' : `Mark All Open Resolved (${openCount})`}
          </button>
          <Link to={`/dashboard/${importId}`}>
            <button className="ghost">← Dashboard</button>
          </Link>
        </div>
      </div>

      {bulkError && <div className="error-banner">{bulkError}</div>}

      {/* Summary row */}
      <div className={styles.summaryRow}>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Total</div>
          <div className={styles.statValue}>{items.length}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Open</div>
          <div className={styles.statValue} style={{ color: openCount > 0 ? 'var(--danger)' : undefined }}>{openCount}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Errors</div>
          <div className={styles.statValue} style={{ color: 'var(--danger)' }}>{errorCount}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Resolved / Overridden</div>
          <div className={styles.statValue} style={{ color: 'var(--success)' }}>{resolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12, alignSelf: 'center', marginRight: 4 }}>Severity:</span>
        {(['all', 'error', 'warning'] as const).map(f => (
          <button
            key={f}
            className={severityFilter === f ? 'primary' : 'ghost'}
            onClick={() => setSeverityFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? `All (${items.length})` : f === 'error' ? `Errors (${errorCount})` : `Warnings (${warnCount})`}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: 12, alignSelf: 'center', marginLeft: 12, marginRight: 4 }}>Status:</span>
        {(['all', 'open', 'resolved', 'overridden'] as const).map(s => (
          <button
            key={s}
            className={statusFilter === s ? 'primary' : 'ghost'}
            onClick={() => setStatusFilter(s)}
            style={{ textTransform: 'capitalize' }}
          >
            {s === 'all' ? `All` : s === 'open' ? `Open (${openCount})` : s === 'resolved' ? `Resolved (${resolvedCount})` : `Overridden`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
          No items match the current filter.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Severity</th>
                <th>Reason</th>
                <th>Customer</th>
                <th>Product / Service</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Invoice Date</th>
                <th style={{ textAlign: 'right' }}>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <ReviewRow key={item.id} item={item} onUpdated={handleItemUpdated} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
