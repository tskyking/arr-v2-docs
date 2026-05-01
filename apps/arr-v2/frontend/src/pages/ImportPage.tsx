/**
 * ImportPage — upload a workbook or specify a local file path.
 * On success, navigates to the dashboard for the new import.
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { uploadImportFile, uploadImportPath } from '@/lib/api';
import { useImportList } from '@/lib/hooks';
import { isStaticDemoEnvironment, useArrSettings } from '@/lib/settings';
import { DEMO_IMPORT_ID, demoImports } from '@/lib/demoData';
import styles from './ImportPage.module.css';

function formatImportDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ImportPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenantId } = useArrSettings();
  const demoMode = isStaticDemoEnvironment();
  const { data: imports, refetch } = useImportList();
  const historyRef = useRef<HTMLDivElement | null>(null);
  const sampleHistoryRef = useRef<HTMLDivElement | null>(null);
  const sortedImports = useMemo(() => [...(imports ?? [])].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  ), [imports]);
  const sortedSampleImports = useMemo(() => [...demoImports].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  ), []);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusTarget = searchParams.get('focus');
    const target = focusTarget === 'sample-history' ? sampleHistoryRef.current : focusTarget === 'history' ? historyRef.current : null;
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams, sortedImports.length]);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const result = await uploadImportFile(file);
      await refetch();
      navigate(`/dashboard/${result.importId}`);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleLocalPath() {
    if (!localPath.trim()) return;
    setError(null);
    setUploading(true);
    try {
      const result = await uploadImportPath(localPath.trim());
      await refetch();
      navigate(`/dashboard/${result.importId}`);
    } catch (e: any) {
      setError(e.message ?? 'Import failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Import Workbook</h1>
      <p className={styles.sub}>
        Upload an XLSX workbook to start an ARR analysis run.
        <span className={styles.tenantTag}>Tenant: {tenantId}</span>
      </p>

      {error && <div className="error-banner">{error}</div>}

      {/* Prior imports */}
      <div id="import-history" ref={historyRef} className={styles.history}>
        <div className={styles.historyHeaderRow}>
          <div>
            <h2 className={styles.historyHeading}>Current tenant import history</h2>
            <p className={styles.historySub}>Uploads stored for tenant <span className={styles.mono}>{tenantId}</span>.</p>
          </div>
          <span className={styles.historyCount}>{sortedImports.length} import{sortedImports.length === 1 ? '' : 's'}</span>
        </div>
        {sortedImports.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Rows</th>
                <th>Import ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedImports.map(imp => (
                <tr key={imp.importId}>
                  <td>{formatImportDate(imp.importedAt)}</td>
                  <td>{imp.totalRows.toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                    {imp.importId.slice(0, 8)}…
                  </td>
                  <td>
                    <Link className="ghost" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex' }} to={`/dashboard/${imp.importId}`}>
                      Dashboard →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyHistoryState}>
            No uploaded workbooks are stored for this tenant yet. Use the seeded sample history below to compare distinct imports without changing tenants.
          </div>
        )}
      </div>

      <div id="sample-history" ref={sampleHistoryRef} className={`${styles.history} ${styles.sampleHistory}`}>
        <div className={styles.historyHeaderRow}>
          <div>
            <h2 className={styles.historyHeading}>Seeded sample import history</h2>
            <p className={styles.historySub}>Stable walkthrough imports that work in any tenant, so Brian can compare one uploaded data set versus another.</p>
          </div>
          <span className={styles.historyCount}>Sample</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Rows</th>
              <th>Sample</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedSampleImports.map(imp => (
              <tr key={imp.importId}>
                <td>{formatImportDate(imp.importedAt)}</td>
                <td>{imp.totalRows.toLocaleString()}</td>
                <td>
                  <span className={styles.sampleName}>{imp.importId === DEMO_IMPORT_ID ? 'Current showcase import' : 'Prior imported snapshot'}</span>
                  <span className={styles.sampleId}>{imp.importId}</span>
                </td>
                <td>
                  <Link className="ghost" style={{ fontSize: 12, textDecoration: 'none', display: 'inline-flex' }} to={`/dashboard/${imp.importId}`}>
                    View dashboard →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drop zone */}
      <div
        className={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <div className={styles.dropIcon}>📂</div>
        <div className={styles.dropLabel}>
          {uploading ? 'Processing…' : 'Drop XLSX here, or click to browse'}
        </div>
        <div className={styles.dropHint}>.xlsx files only</div>
      </div>

      {/* Local path (for dev) */}
      <div className={styles.orRow}>
        <span className={styles.orLine} />
        <span className={styles.orText}>or enter a local file path</span>
        <span className={styles.orLine} />
      </div>

      <div className={styles.pathRow}>
        <input
          className={styles.pathInput}
          type="text"
          placeholder="/path/to/workbook.xlsx"
          value={localPath}
          onChange={e => setLocalPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLocalPath()}
          disabled={uploading}
        />
        <button
          className="primary"
          onClick={handleLocalPath}
          disabled={uploading || !localPath.trim()}
        >
          Import
        </button>
      </div>

      <div className={`${styles.demoPanel} card`}>
        <div className={styles.demoHeaderRow}>
          <div>
            <div className={styles.demoEyebrow}>Static Product Walkthrough</div>
            <h2 className={styles.demoHeading}>Jump to seeded finance-review states</h2>
            <p className={styles.demoCopy}>
              Use these polished example screens for Todd/Brian walkthroughs, manual screenshots, and quick review of the import-to-dashboard flow.
            </p>
          </div>
          {demoMode && <span className={styles.demoBadge}>Public demo mode</span>}
        </div>
        <div className={styles.demoGrid}>
          <a className={styles.demoCard} href={`${import.meta.env.BASE_URL}demo/arr-v2-demo-import.xlsx`} download>
            <span className={styles.demoTitle}>Download demo import workbook</span>
            <span className={styles.demoText}>Real 3-sheet XLSX template with seeded transactions, mapping coverage, and recognition assumptions.</span>
          </a>
          <div className={`${styles.demoCard} ${styles.historyDemoCard}`}>
            <span className={styles.demoTitle}>Sample import history</span>
            <span className={styles.demoText}>Compare seeded imports with different dates, row counts, ARR periods, and dashboard totals.</span>
            <div className={styles.historyDemoLinks}>
              <Link to="/import?focus=sample-history">Open seeded sample history ↓</Link>
              {sortedSampleImports.map(imp => (
                <Link key={imp.importId} to={`/dashboard/${imp.importId}`}>
                  {imp.importId === DEMO_IMPORT_ID ? 'Current showcase' : 'Prior snapshot'} — {imp.totalRows.toLocaleString()} rows
                </Link>
              ))}
            </div>
          </div>
          <Link className={styles.demoCard} to={`/dashboard/${DEMO_IMPORT_ID}`}>
            <span className={styles.demoTitle}>Sample dashboard metrics</span>
            <span className={styles.demoText}>ARR trend, waterfall movement summary, customer mix, and review progress panels.</span>
          </Link>
          <Link className={styles.demoCard} to={`/review/${DEMO_IMPORT_ID}`}>
            <span className={styles.demoTitle}>Sample review queue rows</span>
            <span className={styles.demoText}>Open vs resolved examples with finance-friendly reason codes and seeded customer context.</span>
          </Link>
          <Link className={styles.demoCard} to={`/review/${DEMO_IMPORT_ID}?demoItem=rq-104`}>
            <span className={styles.demoTitle}>Sample expanded detail state</span>
            <span className={styles.demoText}>Opens a realistic ambiguous-product case with the detail drawer already expanded.</span>
          </Link>
          <Link className={styles.demoCard} to={`/customer-cube/${DEMO_IMPORT_ID}`}>
            <span className={styles.demoTitle}>Customer Cube demo view</span>
            <span className={styles.demoText}>Investor-friendly customer x segment x product ARR matrix with traceability notes back to imports.</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
