/**
 * DashboardPage — ARR timeseries chart + summary stats for a given import.
 * Includes date range filter and top-customers breakdown.
 */
import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { useImportSummary, useArrTimeseries, useArrMovements } from '@/lib/hooks';
import ArrWaterfallChart from '@/components/ArrWaterfallChart';
import { useArrSettings } from '@/lib/settings';
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

// ─── Date range preset helpers ─────────────────────────────────────────────

type Preset = 'all' | '1y' | '2y' | 'custom';

function monthOffset(date: Date, months: number): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function toMonthStr(s: string): string {
  // Accepts YYYY-MM or YYYY-MM-DD, returns YYYY-MM
  return s.slice(0, 7);
}

export default function DashboardPage() {
  const { importId } = useParams<{ importId: string }>();
  const { tenantId } = useArrSettings();

  // ─── Date range state ──────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const { data: summary, loading: sumLoading, error: sumErr } = useImportSummary(importId!);

  // Derive from/to for API based on preset
  const { fromParam, toParam } = useMemo(() => {
    if (preset === 'all') return { fromParam: null, toParam: null };
    if (preset === 'custom') {
      return {
        fromParam: customFrom || null,
        toParam: customTo || null,
      };
    }
    const months = preset === '1y' ? -12 : -24;
    const now = new Date();
    return {
      fromParam: monthOffset(now, months),
      toParam: null,
    };
  }, [preset, customFrom, customTo]);

  const { data: ts, loading: tsLoading, error: tsErr } = useArrTimeseries(
    importId!,
    fromParam,
    toParam,
  );

  const { data: movements, loading: movLoading } = useArrMovements(
    importId!,
    fromParam,
    toParam,
  );

  if (sumLoading) return <div className="loading">Loading summary…</div>;
  if (sumErr) return <div className="error-banner">Summary error: {sumErr}</div>;
  if (!summary) return null;

  const periods = ts?.periods ?? [];
  const latestPeriod = periods[periods.length - 1];
  const firstPeriod = periods[0];
  const arrGrowth = latestPeriod && firstPeriod && firstPeriod.totalArr > 0
    ? (((latestPeriod.totalArr - firstPeriod.totalArr) / firstPeriod.totalArr) * 100).toFixed(1)
    : null;

  // Chart data
  const chartData = periods.map(p => ({
    period: p.period,
    arr: p.totalArr,
    customers: p.activeCustomers,
  }));

  // Category breakdown from latest period
  const categoryData = (latestPeriod?.byCategory ?? [])
    .filter(c => c.arr > 0)
    .slice(0, 8);

  // Top customers from latest period
  const topCustomers = (latestPeriod?.byCustomer ?? [])
    .filter(c => c.arr > 0)
    .slice(0, 10);

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>ARR Dashboard</h1>
          <p className={styles.sub}>
            Tenant: <span className={styles.mono}>{tenantId}</span>
            {' '}· Import: <span className={styles.mono}>{importId?.slice(0, 8)}…</span>{' '}
            · {new Date(summary.importedAt).toLocaleString()}
          </p>
        </div>
        <Link to={`/review/${importId}`}>
          <button className="ghost">
            Review Queue ({summary.reviewItems})
          </button>
        </Link>
      </div>

      {/* Date range filter */}
      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>Period:</span>
        {(['all', '1y', '2y', 'custom'] as Preset[]).map(p => (
          <button
            key={p}
            className={preset === p ? 'primary' : 'ghost'}
            style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={() => setPreset(p)}
          >
            {p === 'all' ? 'All time' : p === '1y' ? 'Last 12 mo' : p === '2y' ? 'Last 24 mo' : 'Custom'}
          </button>
        ))}
        {preset === 'custom' && (
          <span className={styles.customRange}>
            <input
              className={styles.dateInput}
              type="month"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              placeholder="From"
            />
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <input
              className={styles.dateInput}
              type="month"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              placeholder="To"
            />
          </span>
        )}
        {ts && (
          <span className={styles.rangeInfo}>
            {toMonthStr(ts.fromDate)} → {toMonthStr(ts.toDate)}
            {' '}({periods.length} periods)
          </span>
        )}
      </div>

      {tsLoading && <div className={styles.tsLoading}>Updating…</div>}
      {tsErr && <div className="error-banner">Timeseries error: {tsErr}</div>}

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
          sub={`${firstPeriod?.period ?? '—'} → ${latestPeriod?.period ?? '—'}`}
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

      {/* ARR Movements waterfall */}
      {!movLoading && movements && movements.movements.length > 1 && (
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>ARR Movements (New / Expansion / Contraction / Churn)</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 16 }}>
            <span>Net movement: <strong style={{ color: movements.totalNetMovement >= 0 ? 'var(--success)' : 'var(--danger)' }}>{movements.totalNetMovement >= 0 ? '+' : ''}{formatArr(movements.totalNetMovement)}</strong></span>
            <span>New: <strong style={{ color: '#22c55e' }}>+{formatArr(movements.totalNewArr)}</strong></span>
            <span>Expansion: <strong style={{ color: '#86efac' }}>+{formatArr(movements.totalExpansionArr)}</strong></span>
            <span>Contraction: <strong style={{ color: '#f97316' }}>−{formatArr(movements.totalContractionArr)}</strong></span>
            <span>Churn: <strong style={{ color: '#ef4444' }}>−{formatArr(movements.totalChurnArr)}</strong></span>
          </div>
          <ArrWaterfallChart movements={movements.movements} />
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

      {/* Top customers (latest period) */}
      {topCustomers.length > 0 && (
        <div className={`card ${styles.tableCard}`}>
          <h2 className={styles.chartTitle}>Top Customers by ARR — {latestPeriod?.period}</h2>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th style={{ textAlign: 'right' }}>ARR</th>
                <th style={{ textAlign: 'right' }}>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.customer}>
                  <td style={{ color: 'var(--text-muted)', width: 32 }}>{i + 1}</td>
                  <td>{c.customer}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatArr(c.arr)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {latestPeriod && latestPeriod.totalArr > 0
                      ? `${((c.arr / latestPeriod.totalArr) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(latestPeriod?.byCustomer?.length ?? 0) > 10 && (
            <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
              + {(latestPeriod!.byCustomer.length - 10)} more customers
            </div>
          )}
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
