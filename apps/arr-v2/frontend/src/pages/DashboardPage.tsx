/**
 * DashboardPage — ARR timeseries chart + summary stats for a given import.
 * Includes date range filter and top-customers breakdown.
 */
import { useState, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { downloadArrCsv, downloadArrMovementsCsv } from '@/lib/api';
import { useImportSummary, useArrTimeseries, useArrMovements, useReviewStats, useCustomerList } from '@/lib/hooks';
import ArrWaterfallChart from '@/components/ArrWaterfallChart';
import MonthPuckRail from '@/components/MonthPuckRail';
import type { MonthPuckItem } from '@/components/MonthPuckRail';
import { DEMO_IMPORT_ID, demoCustomerCube, isDemoImportId } from '@/lib/demoData';
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

function buildDeltaMap(entries: Array<{ customer: string; arr: number }> | undefined): Map<string, number> {
  return new Map((entries ?? []).map((entry) => [entry.customer, entry.arr]));
}

function buildCategoryDeltaMap(entries: Array<{ category: string; arr: number }> | undefined): Map<string, number> {
  return new Map((entries ?? []).map((entry) => [entry.category, entry.arr]));
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

function formatMonthPuckLabel(period: string, previousPeriod?: string): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(date);
  const previousYear = previousPeriod ? Number(previousPeriod.slice(0, 4)) : null;
  return previousYear !== null && previousYear !== year ? `${monthLabel} '${String(year).slice(2)}` : monthLabel;
}

const LIVE_POLL_MS = 30_000;

export default function DashboardPage() {
  const { importId } = useParams<{ importId: string }>();
  const [searchParams] = useSearchParams();
  const { tenantId } = useArrSettings();
  const customerCubeRef = useRef<HTMLDivElement | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingKind, setDownloadingKind] = useState<'arr' | 'movements' | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const pollMs = autoRefreshEnabled ? LIVE_POLL_MS : 0;

  // ─── Date range state ──────────────────────────────────────────────────
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedMovementPeriod, setSelectedMovementPeriod] = useState<string | null>(null);
  const [hoveredMovementPeriod, setHoveredMovementPeriod] = useState<string | null>(null);

  const {
    data: summary,
    loading: sumLoading,
    error: sumErr,
    refetch: refetchSummary,
  } = useImportSummary(importId!, { pollMs });

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
    { pollMs },
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
    { pollMs },
  );
  const {
    data: reviewStats,
    loading: reviewStatsLoading,
    error: reviewStatsErr,
    refetch: refetchReviewStats,
  } = useReviewStats(importId!, { pollMs });
  const {
    data: customerList,
    loading: customerListLoading,
    error: customerListErr,
    refetch: refetchCustomerList,
  } = useCustomerList(importId!, { pollMs });

  useEffect(() => {
    if (summary || reviewStats || customerList || ts || movements) {
      setLastRefreshedAt(new Date());
    }
  }, [summary, reviewStats, customerList, ts, movements]);

  useEffect(() => {
    if (searchParams.get('focus') === 'cube' && customerCubeRef.current) {
      customerCubeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const movementEntries = movements?.movements ?? [];
  const movementPucks = useMemo<MonthPuckItem[]>(() => movementEntries.map((movement, index) => ({
    id: movement.period,
    value: movement.period,
    label: formatMonthPuckLabel(movement.period, movementEntries[index - 1]?.period),
    fullLabel: movement.period,
    metaLabel: `${movement.netMovement >= 0 ? '+' : ''}${formatArr(movement.netMovement)}`,
    index,
  })), [movementEntries]);

  useEffect(() => {
    const latestMovementPeriod = movementEntries[movementEntries.length - 1]?.period ?? null;
    setSelectedMovementPeriod((current) => {
      if (!latestMovementPeriod) return null;
      if (!current) return latestMovementPeriod;
      return movementEntries.some((movement) => movement.period === current) ? current : latestMovementPeriod;
    });
    setHoveredMovementPeriod((current) => (
      current && movementEntries.some((movement) => movement.period === current) ? current : null
    ));
  }, [movementEntries]);

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

  const periods = ts?.periods ?? [];
  const latestPeriod = periods[periods.length - 1];
  const firstPeriod = periods[0];
  const arrGrowth = latestPeriod && firstPeriod && firstPeriod.totalArr > 0
    ? (((latestPeriod.totalArr - firstPeriod.totalArr) / firstPeriod.totalArr) * 100).toFixed(1)
    : null;

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

  const cube = importId && isDemoImportId(importId) ? demoCustomerCube : null;
  const cubeSegmentTotals = useMemo(() => {
    if (!cube) return [];
    const totals = new Map<string, { segment: string; arr: number; customers: Set<string> }>();
    for (const row of cube.rows) {
      const item = totals.get(row.category) ?? { segment: row.category, arr: 0, customers: new Set<string>() };
      item.arr += row.closingArr;
      item.customers.add(row.customerName);
      totals.set(row.category, item);
    }
    return [...totals.values()]
      .map(item => ({ segment: item.segment, arr: item.arr, customers: item.customers.size }))
      .sort((a, b) => b.arr - a.arr);
  }, [cube]);
  const selectedMovement = movementEntries.find((movement) => movement.period === selectedMovementPeriod)
    ?? movementEntries[movementEntries.length - 1]
    ?? null;
  const customers = customerList?.customers ?? [];
  const customersWithReview = customers.filter(customer => customer.requiresReview);
  const customersWithCurrentArr = customers.filter(customer => customer.currentArr > 0);
  const reviewCustomersPreview = customersWithReview.slice(0, 6);
  const customerRosterPreview = customers.slice(0, 10);
  const movementHighlights = selectedMovement ? [
    selectedMovement.newArr > 75_000 ? `Strong new ARR month (${formatArr(selectedMovement.newArr)})` : null,
    selectedMovement.expansionArr > 100_000 ? `Large expansion wave (${formatArr(selectedMovement.expansionArr)})` : null,
    (selectedMovement.contractionArr + selectedMovement.churnArr) > 40_000 ? `Meaningful downside to inspect (${formatArr(selectedMovement.contractionArr + selectedMovement.churnArr)})` : null,
    selectedMovement.churnArr > 0 ? `${selectedMovement.churnedCustomers} churned customer${selectedMovement.churnedCustomers === 1 ? '' : 's'}` : null,
  ].filter(Boolean) as string[] : [];

  const selectedPeriodIndex = periods.findIndex((period) => period.period === selectedMovement?.period);
  const selectedPeriodSnapshot = selectedPeriodIndex >= 0 ? periods[selectedPeriodIndex] : null;
  const priorPeriodSnapshot = selectedPeriodIndex > 0 ? periods[selectedPeriodIndex - 1] : null;
  const headlinePeriod = selectedPeriodSnapshot ?? latestPeriod;
  const headlinePeriodLabel = headlinePeriod?.period ?? null;
  const isEndingImportedPeriod = Boolean(headlinePeriod && latestPeriod && headlinePeriod.period === latestPeriod.period);

  const customerMovementDrilldown = useMemo(() => {
    if (!selectedPeriodSnapshot) return [];
    const currentMap = buildDeltaMap(selectedPeriodSnapshot.byCustomer);
    const priorMap = buildDeltaMap(priorPeriodSnapshot?.byCustomer);
    const names = new Set([...currentMap.keys(), ...priorMap.keys()]);

    return [...names]
      .map((customer) => {
        const currentArr = currentMap.get(customer) ?? 0;
        const priorArr = priorMap.get(customer) ?? 0;
        const delta = currentArr - priorArr;
        const direction = currentArr > 0 && priorArr === 0
          ? 'new'
          : currentArr === 0 && priorArr > 0
            ? 'churn'
            : delta > 0
              ? 'expansion'
              : delta < 0
                ? 'contraction'
                : 'flat';
        return { customer, currentArr, priorArr, delta, direction };
      })
      .filter((row) => row.currentArr > 0 || row.priorArr > 0)
      .sort((a, b) => {
        if (Math.abs(b.delta) !== Math.abs(a.delta)) return Math.abs(b.delta) - Math.abs(a.delta);
        return b.currentArr - a.currentArr;
      })
      .slice(0, 8);
  }, [selectedPeriodSnapshot, priorPeriodSnapshot]);

  const categoryMovementDrilldown = useMemo(() => {
    if (!selectedPeriodSnapshot) return [];
    const currentMap = buildCategoryDeltaMap(selectedPeriodSnapshot.byCategory);
    const priorMap = buildCategoryDeltaMap(priorPeriodSnapshot?.byCategory);
    const categories = new Set([...currentMap.keys(), ...priorMap.keys()]);

    return [...categories]
      .map((category) => {
        const currentArr = currentMap.get(category) ?? 0;
        const priorArr = priorMap.get(category) ?? 0;
        const delta = currentArr - priorArr;
        return { category, currentArr, priorArr, delta };
      })
      .filter((row) => row.currentArr > 0 || row.priorArr > 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }, [selectedPeriodSnapshot, priorPeriodSnapshot]);

  if (sumLoading) return <div className="loading">Loading summary…</div>;
  if (sumErr) {
    return (
      <div className={styles.missingImportCard}>
        <div className={styles.missingEyebrow}>Import unavailable</div>
        <h1 className={styles.missingTitle}>This dashboard link can’t find its import data.</h1>
        <p className={styles.missingCopy}>
          The backend returned: <strong>{sumErr}</strong>. On staging, uploaded workbooks are file-backed and may disappear after a deploy, restart, or cold start until durable storage is configured.
        </p>
        <div className={styles.missingActions}>
          <Link to="/import"><button className="primary">Re-upload workbook</button></Link>
          <Link to={`/dashboard/${DEMO_IMPORT_ID}`}><button className="ghost">Open sample dashboard</button></Link>
        </div>
        <p className={styles.missingHint}>
          Demo/share links should use the hash-route form (<span className={styles.mono}>/#/dashboard/…</span>) and need a fresh upload unless persistence has been verified.
        </p>
      </div>
    );
  }
  if (!summary) return null;

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
            <div>{autoRefreshEnabled ? 'Auto refresh every 30s' : 'Auto refresh off'}</div>
            <div>{lastRefreshedAt ? `Last refresh ${lastRefreshedAt.toLocaleTimeString()}` : 'Waiting for first refresh…'}</div>
          </div>
          <button className="ghost" onClick={() => handleDownload('arr')} disabled={downloadingKind !== null}>
            {downloadingKind === 'arr' ? 'Exporting ARR…' : 'Export ARR CSV'}
          </button>
          <button className="ghost" onClick={() => handleDownload('movements')} disabled={downloadingKind !== null}>
            {downloadingKind === 'movements' ? 'Exporting movements…' : 'Export Movements CSV'}
          </button>
          {cube && (
            <Link to={`/customer-cube/${importId}`}>
              <button className="ghost">
                Customer Cube Download
              </button>
            </Link>
          )}
          <div className={styles.refreshControls}>
            <button className="ghost" onClick={handleRefreshNow}>Refresh now</button>
            <label className={styles.autoRefreshToggle}>
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={event => setAutoRefreshEnabled(event.target.checked)}
              />
              <span>Auto refresh</span>
            </label>
          </div>
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
      <div className={styles.semanticNote}>
        <strong>ARR recognition note:</strong> headline and roster ARR are period snapshots from the imported recognition schedule.{' '}
        The default is the ending imported period, not automatically today's calendar month. Use the waterfall month chips to inspect a specific month.
      </div>
      <div className={styles.statGrid}>
        <StatCard
          label={isEndingImportedPeriod ? 'Ending ARR' : 'Selected Period ARR'}
          value={headlinePeriod ? formatArr(headlinePeriod.totalArr) : '—'}
          sub={headlinePeriodLabel ? `${isEndingImportedPeriod ? 'ending imported period' : 'selected period'} ${headlinePeriodLabel}` : undefined}
        />
        <StatCard
          label={isEndingImportedPeriod ? 'Ending Active Customers' : 'Selected Active Customers'}
          value={headlinePeriod ? headlinePeriod.activeCustomers.toLocaleString() : '—'}
          sub={headlinePeriodLabel ? `recognized ARR in ${headlinePeriodLabel}` : undefined}
        />
        <StatCard
          label="ARR Growth"
          value={arrGrowth !== null ? `${arrGrowth}%` : '—'}
          sub={`Full imported range: ${firstPeriod?.period ?? '—'} → ${latestPeriod?.period ?? '—'}`}
        />
        <StatCard
          label="Rows Imported"
          value={summary.totalRows.toLocaleString()}
          sub={`${summary.mappedRows.toLocaleString()} mapped · ${summary.reviewItems} need review · ${summary.skippedRows} skipped`}
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
          </div>

          {reviewStats.topCustomersWithIssues.length > 0 && (
            <div className={`card ${styles.compactReviewPanel}`}>
              <h3 className={styles.panelTitle}>Customers With Open Issues</h3>
              <p className={styles.compactIssueText}>
                {reviewStats.topCustomersWithIssues.map(item => (
                  <span key={item.customerName} className={styles.compactIssueItem}>
                    {item.customerName} <span className={styles.compactIssueCount}>({item.openCount})</span>
                  </span>
                )).reduce<ReactNode[]>((nodes, node, index) => {
                  if (index > 0) nodes.push(', ');
                  nodes.push(node);
                  return nodes;
                }, [])}
              </p>
            </div>
          )}
        </>
      )}

      {/* ARR Movements waterfall */}
      {!movLoading && movements && movements.movements.length > 1 && (
        <div className={`card ${styles.chartCard}`}>
          <div className={styles.sectionHeader} style={{ marginTop: 0 }}>
            <div>
              <h2 className={styles.chartTitle}>ARR Movements + ARR Over Time</h2>
              <div className={styles.rangeInfo}>Left axis = movements. Right purple axis = ARR.</div>
            </div>
            <a href="/docs/saas/arr-rebuild/gui-demo/" className={styles.inlineLink}>← Back to Demo</a>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>Net movement: <strong style={{ color: movements.totalNetMovement >= 0 ? 'var(--success)' : 'var(--danger)' }}>{movements.totalNetMovement >= 0 ? '+' : ''}{formatArr(movements.totalNetMovement)}</strong></span>
            <span>New: <strong style={{ color: '#22c55e' }}>+{formatArr(movements.totalNewArr)}</strong></span>
            <span>Expansion: <strong style={{ color: '#86efac' }}>+{formatArr(movements.totalExpansionArr)}</strong></span>
            <span>Contraction: <strong style={{ color: '#f97316' }}>−{formatArr(movements.totalContractionArr)}</strong></span>
            <span>Churn: <strong style={{ color: '#ef4444' }}>−{formatArr(movements.totalChurnArr)}</strong></span>
            <span>Ending ARR: <strong style={{ color: '#6d28d9' }}>{formatArr(movementEntries[movementEntries.length - 1]?.closingArr ?? 0)}</strong></span>
          </div>
          <ArrWaterfallChart
            movements={movements.movements}
            selectedPeriod={hoveredMovementPeriod ?? selectedMovement?.period ?? null}
            onSelectPeriod={(period) => {
              setHoveredMovementPeriod(null);
              setSelectedMovementPeriod(period);
            }}
            onHoverPeriod={setHoveredMovementPeriod}
          />

          {selectedMovement && (
            <>
              <MonthPuckRail
                months={movementPucks}
                selectedValue={selectedMovement.period}
                hoveredValue={hoveredMovementPeriod}
                onSelect={setSelectedMovementPeriod}
                onHoverChange={setHoveredMovementPeriod}
                showCenterMarker={false}
              />

              <div className={styles.movementDrilldownGrid}>
                <div className={`card ${styles.movementDetailCard}`}>
                  <div className={styles.sectionHeader} style={{ marginTop: 0, marginBottom: 10 }}>
                    <div>
                      <h3 className={styles.panelTitle} style={{ marginBottom: 4 }}>Month drilldown — {selectedMovement.period}</h3>
                      <div className={styles.rangeInfo}>Click bars or month chips to inspect one month without relying on hover.</div>
                    </div>
                  </div>

                  <div className={styles.statGrid} style={{ marginBottom: 16 }}>
                    <StatCard label="Opening ARR" value={formatArr(selectedMovement.openingArr)} sub="Starting point for the month" />
                    <StatCard label="Net Movement" value={`${selectedMovement.netMovement >= 0 ? '+' : ''}${formatArr(selectedMovement.netMovement)}`} sub={`${formatArr(selectedMovement.closingArr)} closing ARR`} />
                    <StatCard label="Gross New + Expansion" value={formatArr(selectedMovement.newArr + selectedMovement.expansionArr)} sub={`${selectedMovement.newCustomers} new · ${selectedMovement.expandedCustomers} expanded`} />
                    <StatCard label="Contraction + Churn" value={formatArr(selectedMovement.contractionArr + selectedMovement.churnArr)} sub={`${selectedMovement.contractedCustomers} contracted · ${selectedMovement.churnedCustomers} churned`} />
                  </div>

                  <div className={styles.reviewPanels} style={{ marginBottom: 16 }}>
                    <div className={`card ${styles.reviewPanel}`}>
                      <h4 className={styles.panelTitle}>Positive movement</h4>
                      <div className={styles.issueList}>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>New ARR</span><span className={styles.issueCount}>+{formatArr(selectedMovement.newArr)}</span></div>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>Expansion ARR</span><span className={styles.issueCount}>+{formatArr(selectedMovement.expansionArr)}</span></div>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>Customer adds</span><span className={styles.issueCount}>{selectedMovement.newCustomers + selectedMovement.expandedCustomers}</span></div>
                      </div>
                    </div>
                    <div className={`card ${styles.reviewPanel}`}>
                      <h4 className={styles.panelTitle}>Downside movement</h4>
                      <div className={styles.issueList}>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>Contraction ARR</span><span className={styles.issueCount}>−{formatArr(selectedMovement.contractionArr)}</span></div>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>Churn ARR</span><span className={styles.issueCount}>−{formatArr(selectedMovement.churnArr)}</span></div>
                        <div className={styles.issueRow}><span className={styles.issueLabel}>Customer losses</span><span className={styles.issueCount}>{selectedMovement.contractedCustomers + selectedMovement.churnedCustomers}</span></div>
                      </div>
                    </div>
                  </div>

                  <div className={styles.movementEvidenceGrid}>
                    <div className={`card ${styles.reviewPanel}`}>
                      <h4 className={styles.panelTitle}>Top customer deltas</h4>
                      <div className={styles.rangeInfo} style={{ margin: '0 0 12px 0' }}>
                        Stable month-over-month comparison so evaluators can inspect spikes and downside without chasing hover targets.
                      </div>
                      {customerMovementDrilldown.length === 0 ? (
                        <div className={styles.emptyState}>Customer-level delta detail is not available for this month.</div>
                      ) : (
                        <table className={styles.compactTable}>
                          <thead>
                            <tr>
                              <th>Customer</th>
                              <th className={styles.compactTableNumeric}>Prior</th>
                              <th className={styles.compactTableNumeric}>Current</th>
                              <th className={`${styles.compactTableNumeric} ${styles.compactTableDelta}`}>Δ</th>
                              <th>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerMovementDrilldown.map((row) => (
                              <tr key={row.customer}>
                                <td>
                                  <Link to={`/customers/${importId}/${encodeURIComponent(row.customer)}`} className={styles.inlineLink}>
                                    {row.customer}
                                  </Link>
                                </td>
                                <td className={styles.compactTableNumeric}>{formatArr(row.priorArr)}</td>
                                <td className={styles.compactTableNumeric}>{formatArr(row.currentArr)}</td>
                                <td className={`${styles.compactTableNumeric} ${styles.compactTableDelta}`} style={{ color: row.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                  {row.delta >= 0 ? '+' : ''}{formatArr(row.delta)}
                                </td>
                                <td style={{ textTransform: 'capitalize' }}>{row.direction}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    <div className={`card ${styles.reviewPanel}`}>
                      <h4 className={styles.panelTitle}>Category bridge</h4>
                      {categoryMovementDrilldown.length === 0 ? (
                        <div className={styles.emptyState}>Category-level bridge unavailable for this month.</div>
                      ) : (
                        <table className={styles.compactTable}>
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th className={styles.compactTableNumeric}>Prior</th>
                              <th className={styles.compactTableNumeric}>Current</th>
                              <th className={`${styles.compactTableNumeric} ${styles.compactTableDelta}`}>Δ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {categoryMovementDrilldown.map((row) => (
                              <tr key={row.category}>
                                <td>{row.category}</td>
                                <td className={styles.compactTableNumeric}>{formatArr(row.priorArr)}</td>
                                <td className={styles.compactTableNumeric}>{formatArr(row.currentArr)}</td>
                                <td className={`${styles.compactTableNumeric} ${styles.compactTableDelta}`} style={{ color: row.delta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                  {row.delta >= 0 ? '+' : ''}{formatArr(row.delta)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`card ${styles.movementDetailCard}`}>
                  <h3 className={styles.panelTitle}>Evaluator notes</h3>
                  {movementHighlights.length === 0 ? (
                    <div className={styles.emptyState}>No extreme signal flags on this month; use the chips to scan for spikes or downside.</div>
                  ) : (
                    <div className={styles.movementHighlightList}>
                      {movementHighlights.map((highlight) => (
                        <span key={highlight} className={styles.movementHighlight}>{highlight}</span>
                      ))}
                    </div>
                  )}
                  <div className={styles.issueList} style={{ marginTop: 14 }}>
                    <div className={styles.issueRow}><span className={styles.issueLabel}>New ARR share of gross adds</span><span className={styles.issueCount}>{selectedMovement.newArr + selectedMovement.expansionArr > 0 ? `${((selectedMovement.newArr / (selectedMovement.newArr + selectedMovement.expansionArr)) * 100).toFixed(0)}%` : '0%'}</span></div>
                    <div className={styles.issueRow}><span className={styles.issueLabel}>Downside as % of opening ARR</span><span className={styles.issueCount}>{selectedMovement.openingArr > 0 ? `${(((selectedMovement.contractionArr + selectedMovement.churnArr) / selectedMovement.openingArr) * 100).toFixed(1)}%` : '0.0%'}</span></div>
                    <div className={styles.issueRow}><span className={styles.issueLabel}>Net change vs opening</span><span className={styles.issueCount}>{selectedMovement.openingArr > 0 ? `${((selectedMovement.netMovement / selectedMovement.openingArr) * 100).toFixed(1)}%` : '0.0%'}</span></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Category breakdown (latest period) */}
      {categoryData.length > 0 && (
        <div className={`card ${styles.chartCard}`}>
          <h2 className={styles.chartTitle}>ARR by Category — ending imported period {latestPeriod?.period}</h2>
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
          <h2 className={styles.chartTitle}>Top Customers by ARR — ending imported period {latestPeriod?.period}</h2>
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

      {cube && (
        <div ref={customerCubeRef} className={`card ${styles.tableCard} ${styles.customerCubeCard}`}>
          <div className={styles.sectionHeader} style={{ marginTop: 0 }}>
            <div>
              <h2 className={styles.sectionTitle}>Customer Cube</h2>
              <div className={styles.rangeInfo}>
                Structured customer-by-product ARR view for {cube.periods[0]} → {cube.periods[cube.periods.length - 1]}
              </div>
            </div>
            <div className={styles.cubeHeaderActions}>
              <Link to={`/customer-cube/${importId}`} className={styles.inlineLink}>Open full cube view →</Link>
              <span className={styles.cubeBadge}>Investor + audit ready concept</span>
            </div>
          </div>

          <div className={styles.statGrid}>
            <StatCard label="Tracked Customers" value={cube.summary.trackedCustomers.toLocaleString()} sub="Customer x product/service rows in the generated cube" />
            <StatCard label="Cube Rows" value={cube.summary.trackedRows.toLocaleString()} sub={`${cube.summary.trackedProductServices} product/service lines`} />
            <StatCard label="Opening ARR" value={formatArr(cube.summary.openingArr)} sub={cube.periods[0] ?? 'Start period'} />
            <StatCard label="Net Change" value={`${cube.summary.netChange >= 0 ? '+' : ''}${formatArr(cube.summary.netChange)}`} sub={`${formatArr(cube.summary.openingArr)} → ${formatArr(cube.summary.closingArr)}`} />
          </div>

          <div className={styles.cubeNarrativeGrid}>
            <div className={`card ${styles.cubeNarrativePanel}`}>
              <h3 className={styles.panelTitle}>Why it matters</h3>
              <div className={styles.issueList}>
                <div className={styles.issueRow}><span className={styles.issueLabel}>Generated from demo XLSX import</span><span className={styles.issueCount}>Yes</span></div>
                <div className={styles.issueRow}><span className={styles.issueLabel}>Segment rollups</span><span className={styles.issueCount}>{cubeSegmentTotals.length}</span></div>
                <div className={styles.issueRow}><span className={styles.issueLabel}>Traceable to invoice + mapping inputs</span><span className={styles.issueCount}>Yes</span></div>
              </div>
            </div>
            <div className={`card ${styles.cubeNarrativePanel}`}>
              <h3 className={styles.panelTitle}>Dimensions in this demo</h3>
              <div className={styles.cubeDimList}>
                <span>Customer</span>
                <span>Segment</span>
                <span>Product family</span>
                <span>Monthly periods</span>
                <span>Movement classification</span>
                <span>Invoice traceability note</span>
              </div>
            </div>
          </div>

          <div className={styles.cubeSegmentStrip}>
            {cubeSegmentTotals.map(segment => (
              <div key={segment.segment} className={styles.cubeSegmentPill}>
                <strong>{segment.segment}</strong>
                <span>{formatArr(segment.arr)} · {segment.customers} cust.</span>
              </div>
            ))}
          </div>

          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Category</th>
                <th>Product / Service</th>
                {cube.periods.map(period => <th key={period} style={{ textAlign: 'right' }}>{period}</th>)}
                <th style={{ textAlign: 'right' }}>Net Δ</th>
                <th>Movement</th>
                <th>Traceability</th>
              </tr>
            </thead>
            <tbody>
              {cube.rows.map(row => (
                <tr key={`${row.customerName}-${row.productService}-${row.category}`}>
                  <td>
                    <Link to={`/customers/${importId}/${encodeURIComponent(row.customerName)}`} className={styles.inlineLink}>{row.customerName}</Link>
                    {row.requiresReview && <div className={styles.cubeMeta}>Needs review</div>}
                  </td>
                  <td>{row.category}</td>
                  <td>
                    <div className={styles.cubeFamilyList}>
                      <span>{row.productService}</span>
                    </div>
                  </td>
                  {row.periods.map(period => <td key={`${row.customerName}-${row.productService}-${period.period}`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatArr(period.arr)}</td>)}
                  <td style={{ textAlign: 'right', color: row.netChange >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{row.netChange >= 0 ? '+' : ''}{formatArr(row.netChange)}</td>
                  <td>{row.movement}</td>
                  <td className={styles.cubeTrace}>{row.sourceInvoiceNumbers.length > 0 ? `Invoices: ${row.sourceInvoiceNumbers.join(', ')}` : `Rows: ${row.sourceRowNumbers.join(', ')}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live customer roster */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Customer Roster</h2>
        <span className={styles.rangeInfo}>
          {customerList ? `${customerList.total} customers · ${customersWithCurrentArr.length} with ending-period ARR` : 'Live API-backed roster'}
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
              sub={`${customersWithCurrentArr.length} contributing ARR in ending period`}
            />
            <StatCard
              label="Customers Needing Review"
              value={customersWithReview.length.toLocaleString()}
              sub={customersWithReview.length > 0 ? 'Data quality follow-up recommended' : 'No customer-level review flags'}
            />
            <StatCard
              label="Top Ending-Period Customer ARR"
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
                    <th style={{ textAlign: 'right' }}>Ending-Period ARR</th>
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
              <h2 className={styles.chartTitle}>Customer ARR Snapshot — ending imported period</h2>
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th style={{ textAlign: 'right' }}>Ending-Period ARR</th>
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
