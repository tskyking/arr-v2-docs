/**
 * DashboardPage — ARR timeseries chart + summary stats for a given import.
 * Includes date range filter and top-customers breakdown.
 */
import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts';
import { downloadArrCsv, downloadArrMovementsCsv } from '@/lib/api';
import { useImportSummary, useArrTimeseries, useArrMovements, useReviewStats, useCustomerList } from '@/lib/hooks';
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

const LIVE_POLL_MS = 30_000;

export default function DashboardPage() {
  const { importId } = useParams<{ importId: string }>();
  const { tenantId } = useArrSettings();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<'arr' | 'movements' | null>(null);

  // ─── Date range state ──────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const {
    data: summary,
    loading: sumLoading,
    error: sumErr,
    refetch: refetchSummary,
  } = useImportSummary(importId!, { pollMs: LIVE_POLL_MS });

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

  const {
    data: ts,
    loading: tsLoading,
    error: tsErr,
    refetch: refetchTimeseries,
  } = useArrTimeseries(
    importId!,
    fromParam,
    toParam,
    { pollMs: LIVE_POLL_MS },
  );

  const {
    data: movements,
    loading: movLoading,
    error: movErr,
    refetch: refetchMovements,
  } = useArrMovements(
    importId!,
    fromParam,
    toParam,
    { pollMs: LIVE_POLL_MS },
  );
  const {
    data: reviewStats,
    loading: reviewStatsLoading,
    error: reviewStatsErr,
    refetch: refetchReviewStats,
  } = useReviewStats(importId!, { pollMs: LIVE_POLL_MS });
  const {
    data: customerList,
    loading: customerListLoading,
    error: customerListErr,
    refetch: refetchCustomerList,
  } = useCustomerList(importId!, { pollMs: LIVE_POLL_MS });

  useEffect(() => {
    if (summary || reviewStats || customerList || ts || movements) {
      setLastRefreshedAt(new Date());
    }
  }, [summary, reviewStats, customerList, ts, movements]);

  function handleRefreshNow() {
    refetchSummary();
    refetchTimeseries();
    refetchMovements();
    refetchReviewStats();
    refetchCustomerList();
    setLastRefreshedAt(new Date());
  }

  async function handleDownload(kind: 'arr' | 'movements') {
    if (!importId) return;
    setDownloadError(null);
    setDownloadingKind(kind);
    try {
      if (kind === 'arr') {
        await downloadArrCsv(importId, fromParam ?? undefined, toParam ?? undefined);
      } else {
        await downloadArrMovementsCsv(importId, fromParam ?? undefined, toParam ?? undefined);
      }
    } catch (err: any) {
      setDownloadError(err.message ?? 'Export failed');
    } finally {
      setDownloadingKind(null);
    }
  }

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

  const reviewCompletion = reviewStats && reviewStats.total > 0
    ? Math.round(((reviewStats.resolvedCount + reviewStats.overriddenCount) / reviewStats.total) * 100)
    : null;

  const customers = customerList?.customers ?? [];
  const customersWithReview = customers.filter(customer => customer.requiresReview);
  const customersWithCurrentArr = customers.filter(customer => customer.currentArr > 0);
  const reviewCustomersPreview = customersWithReview.slice(0, 6);
  const customerRosterPreview = customers.slice(0, 10);

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
        <div className={styles.headerActions}>
          <div className={styles.refreshMeta}>
            <div>Live refresh every 30s</div>
            <div>{lastRefreshedAt ? `Last refresh ${lastRefreshedAt.toLocaleTimeString()}` : 'Waiting for first refresh…'}</div>
          </div>
          <button className="ghost" onClick={() => handleDownload('arr')} disabled={downloadingKind !== null}>
            {downloadingKind === 'arr' ? 'Exporting ARR…' : 'Export ARR CSV'}
          </button>
          <button className="ghost" onClick={() => handleDownload('movements')} disabled={downloadingKind !== null}>
            {downloadingKind === 'movements' ? 'Exporting movements…' : 'Export Movements CSV'}
          </button>
          <button className="ghost" onClick={handleRefreshNow}>Refresh now</button>
          <Link to={`/review/${importId}`}>
            <button className="ghost">
              Review Queue ({summary.reviewItems})
            </button>
          </Link>
        </div>
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

      {downloadError && <div className="error-banner">Export error: {downloadError}</div>}
      {tsLoading && <div className={styles.tsLoading}>Updating…</div>}
      {tsErr && <div className="error-banner">Timeseries error: {tsErr}</div>}
      {movErr && <div className="error-banner">ARR movement error: {movErr}</div>}

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

      {/* Review progress */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Review Progress</h2>
        <Link to={`/review/${importId}`} className={styles.inlineLink}>Open review queue →</Link>
      </div>

      {reviewStatsLoading && <div className={styles.tsLoading}>Loading review stats…</div>}
      {reviewStatsErr && <div className="error-banner">Review stats error: {reviewStatsErr}</div>}
      {reviewStats && (
        <>
          <div className={styles.statGrid}>
            <StatCard
              label="Review Completion"
              value={reviewCompletion !== null ? `${reviewCompletion}%` : '—'}
              sub={reviewStats.allResolved ? 'All items cleared' : `${reviewStats.openCount} still open`}
            />
            <StatCard
              label="Open Issues"
              value={reviewStats.openCount.toLocaleString()}
              sub={`${reviewStats.errorCount} errors · ${reviewStats.warningCount} warnings`}
            />
            <StatCard
              label="Resolved"
              value={reviewStats.resolvedCount.toLocaleString()}
              sub={`${reviewStats.overriddenCount} overridden`}
            />
            <StatCard
              label="Most Common Issue"
              value={reviewStats.openByReasonCode[0]?.reasonCode ?? '—'}
              sub={reviewStats.openByReasonCode[0] ? `${reviewStats.openByReasonCode[0].count} open items` : 'No open issues'}
            />
          </div>

          {(reviewStats.openByReasonCode.length > 0 || reviewStats.topCustomersWithIssues.length > 0) && (
            <div className={styles.reviewPanels}>
              <div className={`card ${styles.reviewPanel}`}>
                <h3 className={styles.panelTitle}>Open Issues by Reason</h3>
                {reviewStats.openByReasonCode.length === 0 ? (
                  <div className={styles.emptyState}>No open issues.</div>
                ) : (
                  <div className={styles.issueList}>
                    {reviewStats.openByReasonCode.slice(0, 6).map(item => (
                      <div key={item.reasonCode} className={styles.issueRow}>
                        <span className={styles.issueLabel}>{item.reasonCode}</span>
                        <span className={styles.issueCount}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`card ${styles.reviewPanel}`}>
                <h3 className={styles.panelTitle}>Customers With Open Issues</h3>
                {reviewStats.topCustomersWithIssues.length === 0 ? (
                  <div className={styles.emptyState}>No customers blocked.</div>
                ) : (
                  <div className={styles.issueList}>
                    {reviewStats.topCustomersWithIssues.slice(0, 6).map(item => (
                      <div key={item.customerName} className={styles.issueRow}>
                        <span className={styles.issueLabel}>{item.customerName}</span>
                        <span className={styles.issueCount}>{item.openCount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

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
                  <td>
                    <Link to={`/customers/${importId}/${encodeURIComponent(c.customer)}`} className={styles.inlineLink}>
                      {c.customer}
                    </Link>
                  </td>
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

      {/* Live customer roster */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Customer Roster</h2>
        <span className={styles.rangeInfo}>
          {customerList ? `${customerList.total} customers · ${customersWithCurrentArr.length} with current ARR` : 'Live API-backed roster'}
        </span>
      </div>

      {customerListLoading && <div className={styles.tsLoading}>Loading customer roster…</div>}
      {customerListErr && <div className="error-banner">Customer roster error: {customerListErr}</div>}
      {customerList && (
        <>
          <div className={styles.statGrid}>
            <StatCard
              label="Customers in Import"
              value={customerList.total.toLocaleString()}
              sub={`${customersWithCurrentArr.length} currently contributing ARR`}
            />
            <StatCard
              label="Customers Needing Review"
              value={customersWithReview.length.toLocaleString()}
              sub={customersWithReview.length > 0 ? 'Data quality follow-up recommended' : 'No customer-level review flags'}
            />
            <StatCard
              label="Top Customer ARR"
              value={customers[0] ? formatArr(customers[0].currentArr) : '—'}
              sub={customers[0]?.name ?? 'No customer data'}
            />
            <StatCard
              label="Most Recent Invoice"
              value={customers[0]?.lastInvoiceDate ? customers.reduce((latest, customer) => customer.lastInvoiceDate > latest ? customer.lastInvoiceDate : latest, '') : '—'}
              sub="Across all customers"
            />
          </div>

          {reviewCustomersPreview.length > 0 && (
            <div className={`card ${styles.tableCard}`}>
              <h2 className={styles.chartTitle}>Customers With Open Review Risk</h2>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Current ARR</th>
                    <th style={{ textAlign: 'right' }}>Contracts</th>
                    <th style={{ textAlign: 'right' }}>Last Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewCustomersPreview.map(customer => (
                    <tr key={customer.name}>
                      <td>
                        <Link to={`/customers/${importId}/${encodeURIComponent(customer.name)}`} className={styles.inlineLink}>
                          {customer.name}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatArr(customer.currentArr)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{customer.activeContracts.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{customer.lastInvoiceDate || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customersWithReview.length > reviewCustomersPreview.length && (
                <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                  + {customersWithReview.length - reviewCustomersPreview.length} more customers with review flags
                </div>
              )}
            </div>
          )}

          {customerRosterPreview.length > 0 && (
            <div className={`card ${styles.tableCard}`}>
              <h2 className={styles.chartTitle}>Customer ARR Snapshot</h2>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Current ARR</th>
                    <th style={{ textAlign: 'right' }}>Contracts</th>
                    <th style={{ textAlign: 'right' }}>Last Invoice</th>
                    <th style={{ textAlign: 'right' }}>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRosterPreview.map(customer => (
                    <tr key={customer.name}>
                      <td>
                        <Link to={`/customers/${importId}/${encodeURIComponent(customer.name)}`} className={styles.inlineLink}>
                          {customer.name}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatArr(customer.currentArr)}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{customer.activeContracts.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{customer.lastInvoiceDate || '—'}</td>
                      <td style={{ textAlign: 'right', color: customer.requiresReview ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {customer.requiresReview ? 'Needs review' : 'Clear'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length > customerRosterPreview.length && (
                <div style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>
                  + {customers.length - customerRosterPreview.length} more customers available in the API roster
                </div>
              )}
            </div>
          )}
        </>
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
