/**
 * ReviewQueuePage — finance-user review workflow.
 * Lists all open review items for an import with severity, reason, and context.
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReviewQueue } from '@/lib/hooks';
import styles from './ReviewQueuePage.module.css';
import type { ReviewItem } from '@/lib/api';

function SeverityBadge({ severity }: { severity: 'warning' | 'error' }) {
  return <span className={`badge ${severity}`}>{severity}</span>;
}

function formatAmount(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function ReviewRow({ item }: { item: ReviewItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        className={styles.row}
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: 'pointer' }}
      >
        <td><SeverityBadge severity={item.severity} /></td>
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
              </div>
              {/* Future: resolve/override actions will go here */}
              <div className={styles.expandedActions}>
                <button className="ghost" style={{ fontSize: 12 }} disabled>
                  ✓ Mark resolved (coming soon)
                </button>
                <button className="ghost" style={{ fontSize: 12 }} disabled>
                  ↩ Override (coming soon)
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function ReviewQueuePage() {
  const { importId } = useParams<{ importId: string }>();
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warning' | 'error'>('all');
  const { data: queue, loading, error } = useReviewQueue(importId!);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) return <div className="error-banner">Error: {error}</div>;
  if (!queue) return null;

  const filtered = queue.items.filter(
    item => severityFilter === 'all' || item.severity === severityFilter,
  );

  const errorCount = queue.items.filter(i => i.severity === 'error').length;
  const warnCount = queue.items.filter(i => i.severity === 'warning').length;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Review Queue</h1>
          <p className={styles.sub}>
            Import: <span className={styles.mono}>{importId?.slice(0, 8)}…</span>{' '}
            · {queue.total} items requiring attention
          </p>
        </div>
        <Link to={`/dashboard/${importId}`}>
          <button className="ghost">← Dashboard</button>
        </Link>
      </div>

      {/* Summary row */}
      <div className={styles.summaryRow}>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Total</div>
          <div className={styles.statValue}>{queue.total}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Errors</div>
          <div className={styles.statValue} style={{ color: 'var(--danger)' }}>{errorCount}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Warnings</div>
          <div className={styles.statValue} style={{ color: 'var(--warning)' }}>{warnCount}</div>
        </div>
        <div className="card" style={{ flex: 1 }}>
          <div className={styles.statLabel}>Resolved</div>
          <div className={styles.statValue} style={{ color: 'var(--success)' }}>{queue.resolvedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        {(['all', 'error', 'warning'] as const).map(f => (
          <button
            key={f}
            className={severityFilter === f ? 'primary' : 'ghost'}
            onClick={() => setSeverityFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f === 'all' ? `All (${queue.total})` : f === 'error' ? `Errors (${errorCount})` : `Warnings (${warnCount})`}
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
                <ReviewRow key={item.id} item={item} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
