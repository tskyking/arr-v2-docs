/**
 * ImportPage — upload a workbook or specify a local file path.
 * On success, navigates to the dashboard for the new import.
 */
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadImportFile, uploadImportPath } from '@/lib/api';
import { useImportList } from '@/lib/hooks';
import { useArrSettings } from '@/lib/settings';
import styles from './ImportPage.module.css';

export default function ImportPage() {
  const navigate = useNavigate();
  const { tenantId } = useArrSettings();
  const { data: imports, refetch } = useImportList();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      {/* Prior imports */}
      {imports && imports.length > 0 && (
        <div className={styles.history}>
          <h2 className={styles.historyHeading}>Previous Imports</h2>
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
              {[...imports].reverse().map(imp => (
                <tr key={imp.importId}>
                  <td>{new Date(imp.importedAt).toLocaleString()}</td>
                  <td>{imp.totalRows.toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>
                    {imp.importId.slice(0, 8)}…
                  </td>
                  <td>
                    <button className="ghost" style={{ fontSize: 12 }} onClick={() => navigate(`/dashboard/${imp.importId}`)}>
                      Dashboard →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
