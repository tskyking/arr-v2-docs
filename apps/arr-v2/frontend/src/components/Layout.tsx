import { useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useMatch, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import { useImportList } from '@/lib/hooks';
import { useArrSettings } from '@/lib/settings';

export default function Layout() {
  const { tenantId, userEmail, displayName, updateSettings, logout } = useArrSettings();
  const { data: imports } = useImportList();
  const sortedImports = useMemo(() => [...(imports ?? [])].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  ), [imports]);
  const latestImport = sortedImports[0];
  const navigate = useNavigate();
  const location = useLocation();

  // Extract importId from any matching route
  const dashboardMatch = useMatch('/dashboard/:importId');
  const reviewMatch = useMatch('/review/:importId');
  const customerMatch = useMatch('/customers/:importId/:customerName');
  const cubeMatch = useMatch('/customer-cube/:importId');
  const activeImportId =
    dashboardMatch?.params?.importId ??
    reviewMatch?.params?.importId ??
    customerMatch?.params?.importId ??
    cubeMatch?.params?.importId ??
    latestImport?.importId;

  function handleImportChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const current = location.pathname;
    if (current.startsWith('/review')) navigate(`/review/${id}`);
    else if (current.startsWith('/customer-cube')) navigate(`/customer-cube/${id}`);
    else navigate(`/dashboard/${id}`);
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={styles.root}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoText}>ARR V2</span>
          <span className={styles.logoBeta}>beta</span>
        </div>
        <div className={styles.links}>
          <NavLink to="/import" className={({ isActive }) => isActive ? styles.activeLink : styles.link}>
            Import
          </NavLink>
          {activeImportId && (
            <>
              <NavLink
                to={`/dashboard/${activeImportId}`}
                className={({ isActive }) => isActive ? styles.activeLink : styles.link}
              >
                Dashboard
              </NavLink>
              <NavLink
                to={`/review/${activeImportId}`}
                className={({ isActive }) => isActive ? styles.activeLink : styles.link}
              >
                Review Queue
              </NavLink>
            </>
          )}
        </div>
        <div className={styles.importSelect}>
          <span className={styles.sessionBadge} title={displayName}>Signed in: {displayName}</span>
          <label className={styles.selectLabel}>Tenant</label>
          <input
            className={styles.textInput}
            type="text"
            value={tenantId}
            onChange={e => updateSettings({ tenantId: e.target.value })}
            spellCheck={false}
          />
          <label className={styles.selectLabel}>User</label>
          <input
            className={styles.textInput}
            type="email"
            value={userEmail}
            onChange={e => updateSettings({ userEmail: e.target.value })}
            spellCheck={false}
          />
          {sortedImports.length > 0 && (
            <>
            <label className={styles.selectLabel}>Import</label>
            <select
              className={styles.select}
              value={activeImportId ?? ''}
              onChange={handleImportChange}
            >
              {sortedImports.map(imp => (
                <option key={imp.importId} value={imp.importId}>
                  {new Date(imp.importedAt).toLocaleDateString()} — {imp.totalRows} rows
                </option>
              ))}
            </select>
            </>
          )}
          <button className={`ghost ${styles.logoutButton}`} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
