import { NavLink, Outlet, useNavigate, useMatch, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import { useImportList } from '@/lib/hooks';
import { useArrSettings } from '@/lib/settings';

export default function Layout() {
  const { tenantId, userEmail, updateSettings } = useArrSettings();
  const { data: imports } = useImportList();
  const navigate = useNavigate();
  const location = useLocation();

  // Extract importId from any matching route
  const dashboardMatch = useMatch('/dashboard/:importId');
  const reviewMatch = useMatch('/review/:importId');
  const customerMatch = useMatch('/customers/:importId/:customerName');
  const activeImportId =
    dashboardMatch?.params?.importId ??
    reviewMatch?.params?.importId ??
    customerMatch?.params?.importId ??
    (imports && imports.length > 0 ? imports[imports.length - 1].importId : undefined);

  function handleImportChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const current = location.pathname;
    if (current.startsWith('/review')) navigate(`/review/${id}`);
    else navigate(`/dashboard/${id}`);
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
          {imports && imports.length > 0 && (
            <>
            <label className={styles.selectLabel}>Import</label>
            <select
              className={styles.select}
              value={activeImportId ?? ''}
              onChange={handleImportChange}
            >
              {[...imports].reverse().map(imp => (
                <option key={imp.importId} value={imp.importId}>
                  {new Date(imp.importedAt).toLocaleDateString()} — {imp.totalRows} rows
                </option>
              ))}
            </select>
            </>
          )}
        </div>
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
