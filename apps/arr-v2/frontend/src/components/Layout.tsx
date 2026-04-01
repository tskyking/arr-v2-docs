import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import { useImportList } from '@/lib/hooks';

export default function Layout() {
  const { data: imports } = useImportList();
  const navigate = useNavigate();

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
          {imports && imports.length > 0 && (
            <>
              <NavLink
                to={`/dashboard/${imports[imports.length - 1].importId}`}
                className={({ isActive }) => isActive ? styles.activeLink : styles.link}
              >
                Dashboard
              </NavLink>
              <NavLink
                to={`/review/${imports[imports.length - 1].importId}`}
                className={({ isActive }) => isActive ? styles.activeLink : styles.link}
              >
                Review Queue
              </NavLink>
            </>
          )}
        </div>
        {imports && imports.length > 0 && (
          <div className={styles.importSelect}>
            <label className={styles.selectLabel}>Import</label>
            <select
              className={styles.select}
              onChange={e => {
                const id = e.target.value;
                const current = window.location.pathname;
                if (current.startsWith('/dashboard')) navigate(`/dashboard/${id}`);
                else if (current.startsWith('/review')) navigate(`/review/${id}`);
              }}
            >
              {[...imports].reverse().map(imp => (
                <option key={imp.importId} value={imp.importId}>
                  {new Date(imp.importedAt).toLocaleDateString()} — {imp.totalRows} rows
                </option>
              ))}
            </select>
          </div>
        )}
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
