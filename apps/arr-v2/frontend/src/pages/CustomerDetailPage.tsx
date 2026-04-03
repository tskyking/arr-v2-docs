import { Link, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { useCustomerDetail } from '@/lib/hooks';
import { useArrSettings } from '@/lib/settings';
import styles from './CustomerDetailPage.module.css';

function formatArr(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card">
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function CustomerDetailPage() {
  const { importId, customerName } = useParams<{ importId: string; customerName: string }>();
  const decodedCustomerName = decodeURIComponent(customerName ?? '');
  const { tenantId } = useArrSettings();
  const { data, loading, error } = useCustomerDetail(importId!, decodedCustomerName);

  if (loading) return <div className="loading">Loading customer detail…</div>;
  if (error) return <div className="error-banner">Customer detail error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>{data.name}</h1>
          <p className={styles.sub}>
            Tenant: <span className={styles.mono}>{tenantId}</span>
            {' '}· Import: <span className={styles.mono}>{importId?.slice(0, 8)}…</span>
          </p>
        </div>
        <Link to={`/dashboard/${importId}`}>
          <button className="ghost">← Dashboard</button>
        </Link>
      </div>

      <div className={styles.alertRow}>
        <div className={`${styles.alert} ${data.requiresReview ? styles.alertWarning : styles.alertNeutral}`}>
          {data.requiresReview ? 'Review attention needed' : 'No review flags on this customer'}
        </div>
        <div className={`${styles.alert} ${data.openReviewCount > 0 ? styles.alertWarning : styles.alertNeutral}`}>
          {data.openReviewCount > 0 ? `${data.openReviewCount} open review items` : 'No open review items'}
        </div>
      </div>

      <div className={styles.statGrid}>
        <StatCard label="Current ARR" value={formatArr(data.currentArr)} sub={data.lastActivePeriod ? `active in ${data.lastActivePeriod}` : 'No active ARR periods'} />
        <StatCard label="Peak ARR" value={formatArr(data.peakArr)} sub={data.firstSeenPeriod ? `since ${data.firstSeenPeriod}` : undefined} />
        <StatCard label="ARR Periods" value={data.arrHistory.length.toLocaleString()} sub={data.arrHistory.length > 0 ? `${data.arrHistory[0].period} → ${data.arrHistory[data.arrHistory.length - 1].period}` : 'No recognized ARR history'} />
        <StatCard label="Open Review Items" value={data.openReviewCount.toLocaleString()} sub={data.requiresReview ? 'Review queue may affect interpretation' : 'No current queue blockers'} />
      </div>

      <div className={`card ${styles.chartCard}`}>
        <h2 className={styles.chartTitle}>ARR History</h2>
        {data.arrHistory.length === 0 ? (
          <div className={styles.emptyState}>This customer exists in the import but has no recognized ARR history yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.arrHistory} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis tickFormatter={v => formatArr(v)} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={68} />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text)' }}
                formatter={(v: number) => [formatArr(v), 'ARR']}
              />
              <Line type="monotone" dataKey="arr" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={`card ${styles.tableCard}`}>
        <h2 className={styles.chartTitle}>Period Detail</h2>
        {data.arrHistory.length === 0 ? (
          <div className={styles.emptyState}>No period detail available.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th style={{ textAlign: 'right' }}>ARR</th>
              </tr>
            </thead>
            <tbody>
              {data.arrHistory.map(period => (
                <tr key={period.period}>
                  <td>{period.period}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatArr(period.arr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
