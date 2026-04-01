/**
 * DashboardPage — ARR timeseries chart + summary stats for a given import.
 */
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { useImportSummary, useArrTimeseries } from '@/lib/hooks';
import styles from './DashboardPage.module.css';

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

export default function DashboardPage() {
  const { importId } = useParams<{ importId: string }>();
  const { data: summary, loading: sumLoading, error: sumErr } = useImportSummary(importId!);
  const { data: ts, loading: tsLoading, error: tsErr } = useArrTimeseries(importId!);

  if (sumLoading || tsLoading) return <div className="loading">Loading…</div>;
  if (sumErr) return <div className="error-banner">Summary error: {sumErr}</div>;
  if (tsErr) return <div className="error-banner">Timeseries error: {tsErr}</div>;
  if (!summary || !ts) return null;

  const latestPeriod = ts.periods[ts.periods.length - 1];
  const firstPeriod = ts.periods[0];
  const arrGrowth = latestPeriod && firstPeriod && firstPeriod.totalArr > 0
    ? (((latestPeriod.totalArr - firstPeriod.totalArr) / firstPeriod.totalArr) * 100).toFixed(1)
    : null;

  // Build chart data
  const chartData = ts.periods.map(p => ({
    period: p.period,
    arr: p.totalArr,
    customers: p.activeCustomers,
  }));

  // Category breakdown from latest period
  const categoryData = latestPeriod?.byCategory
    .filter(c => c.arr > 0)
    .slice(0, 8)
    ?? [];

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>ARR Dashboard</h1>
          <p className={styles.sub}>
            Import: <span className={styles.mono}>{importId?.slice(0, 8)}…</span>{' '}
            · {new Date(summary.importedAt).toLocaleString()}
          </p>
        </div>
        <Link to={`/review/${importId}`}>
          <button className="ghost">
            Review Queue ({summary.reviewItems})
          </button>
        </Link>
      </div>

      {/* Stat row */}
      <div className={styles.statGrid}>
        <StatCard
          label="Latest ARR"
          value={latestPeriod ? formatArr(latestPeriod.totalArr) : '—'}
          sub={latestPeriod ? `as of ${latestPeriod.period}` : undefined}
        />
        <StatCard
          label="Active Customers"
          value={latestPeriod ? latestPeriod.activeCustomers.toLocaleString() : '—'}
        />
        <StatCard
          label="ARR Growth"
          value={arrGrowth !== null ? `${arrGrowth}%` : '—'}
          sub={`${firstPeriod?.period} → ${latestPeriod?.period}`}
        />
        <StatCard
          label="Rows Imported"
          value={summary.totalRows.toLocaleString()}
          sub={`${summary.reviewItems} need review · ${summary.skippedRows} skipped`}
        />
      </div>

      {/* ARR timeseries chart */}
      {chartData.length > 0 && (
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>ARR Over Time</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="period" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis
                tickFormatter={v => formatArr(v)}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                width={68}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                labelStyle={{ color: 'var(--text)' }}
                formatter={(v: number) => [formatArr(v), 'ARR']}
              />
              <Line
                type="monotone"
                dataKey="arr"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdown (latest period) */}
      {categoryData.length > 0 && (
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>ARR by Category — {latestPeriod?.period}</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={categoryData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="category"
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tickFormatter={v => formatArr(v)}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                width={68}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}
                formatter={(v: number) => [formatArr(v), 'ARR']}
              />
              <Bar dataKey="arr" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category table */}
      {summary.categoryBreakdown.length > 0 && (
        <div className={`card ${styles.tableCard}`}>
          <h2 className={styles.chartTitle}>Category Breakdown (all rows)</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Rows</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {summary.categoryBreakdown.map(c => (
                <tr key={c.category}>
                  <td>{c.category}</td>
                  <td style={{ textAlign: 'right' }}>{c.rowCount.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{formatArr(c.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
