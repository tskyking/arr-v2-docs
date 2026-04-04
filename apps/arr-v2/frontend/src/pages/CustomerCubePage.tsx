import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { downloadCustomerCubeCsv } from '@/lib/api';
import { useCustomerCube } from '@/lib/hooks';
import { useArrSettings } from '@/lib/settings';

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function CustomerCubePage() {
  const { importId } = useParams<{ importId: string }>();
  const { tenantId } = useArrSettings();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { data: cube, loading, error } = useCustomerCube(importId!);

  const movementCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of cube?.rows ?? []) {
      counts.set(row.movement, (counts.get(row.movement) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [cube]);

  async function handleDownload() {
    if (!importId) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await downloadCustomerCubeCsv(importId);
    } catch (err: any) {
      setDownloadError(err.message ?? 'Customer Cube export failed');
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="loading">Loading Customer Cube…</div>;
  if (error) return <div className="error-banner">Customer Cube error: {error}</div>;
  if (!cube) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Customer Cube</h1>
          <p style={{ color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
            Tenant: <span style={{ fontFamily: 'monospace' }}>{tenantId}</span>
            {' '}· Import: <span style={{ fontFamily: 'monospace' }}>{importId?.slice(0, 8)}…</span>
            {' '}· {cube.fromDate.slice(0, 7)} → {cube.toDate.slice(0, 7)}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Exporting Customer Cube…' : 'Download Customer Cube CSV'}
          </button>
          <Link to={`/dashboard/${importId}`} className="ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', padding: '10px 14px' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {downloadError && <div className="error-banner">{downloadError}</div>}

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Audit-friendly cube foundation</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
          This cube groups recurring ARR by customer, product/service, category, and month. Each row retains invoice-number and source-row traceability so finance, diligence, and audit reviewers can walk from a cube movement back to imported evidence.
        </p>
        <ul style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <li>Clear dimensions: customer, product/service, category, monthly period</li>
          <li>Traceability: invoice numbers + workbook source row numbers</li>
          <li>Movement labels: new, expansion, contraction, churn, flat</li>
          <li>Review awareness: rows still carrying import-review risk are flagged</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 18 }}>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Tracked Customers</div><div style={{ fontSize: 28, fontWeight: 700 }}>{cube.summary.trackedCustomers.toLocaleString()}</div></div>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Cube Rows</div><div style={{ fontSize: 28, fontWeight: 700 }}>{cube.summary.trackedRows.toLocaleString()}</div></div>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Product / Services</div><div style={{ fontSize: 28, fontWeight: 700 }}>{cube.summary.trackedProductServices.toLocaleString()}</div></div>
        <div className="card"><div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Net Change</div><div style={{ fontSize: 28, fontWeight: 700, color: cube.summary.netChange >= 0 ? 'var(--success)' : 'var(--danger)' }}>{cube.summary.netChange >= 0 ? '+' : ''}{fmt(cube.summary.netChange)}</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{fmt(cube.summary.openingArr)} → {fmt(cube.summary.closingArr)}</div></div>
      </div>

      {movementCounts.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>Movement mix</h2>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {movementCounts.map(([movement, count]) => (
              <div key={movement} style={{ padding: '10px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface-2, rgba(255,255,255,0.03))' }}>
                <strong>{movement}</strong> <span style={{ color: 'var(--text-muted)' }}>· {count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Customer × product recurring ARR matrix</h2>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Product / Service</th>
              <th>Category</th>
              {cube.periods.map(period => <th key={period} style={{ textAlign: 'right' }}>{period}</th>)}
              <th style={{ textAlign: 'right' }}>Net Δ</th>
              <th>Movement</th>
              <th>Review</th>
              <th>Traceability</th>
            </tr>
          </thead>
          <tbody>
            {cube.rows.map(row => (
              <tr key={`${row.customerName}-${row.productService}-${row.category}`}>
                <td>{row.customerName}</td>
                <td>{row.productService}</td>
                <td>{row.category}</td>
                {row.periods.map(period => (
                  <td key={`${row.customerName}-${row.productService}-${period.period}`} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(period.arr)}
                  </td>
                ))}
                <td style={{ textAlign: 'right', color: row.netChange >= 0 ? 'var(--success)' : 'var(--danger)', fontVariantNumeric: 'tabular-nums' }}>{row.netChange >= 0 ? '+' : ''}{fmt(row.netChange)}</td>
                <td>{row.movement}</td>
                <td>{row.requiresReview ? 'Needs review' : 'Clear'}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {row.sourceInvoiceNumbers.length > 0 ? `Invoices: ${row.sourceInvoiceNumbers.join(', ')}` : 'Demo traceability seed'}
                  {row.sourceRowNumbers.length > 0 ? <div>Rows: {row.sourceRowNumbers.join(', ')}</div> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
