import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useArrSettings } from '@/lib/settings';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, login } = useArrSettings();
  const [name, setName] = useState('Brian Demo User');
  const [email, setEmail] = useState('brian@example.com');
  const [companyName, setCompanyName] = useState('default');
  const [password, setPassword] = useState('demo');

  if (isLoggedIn) {
    const next = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/import';
    return <Navigate to={next} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login({
      displayName: name,
      userEmail: email,
      tenantId: companyName,
    });
    navigate('/import', { replace: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brandRow}>
          <span className={styles.brand}>ARR V2</span>
          <span className={styles.badge}>staging demo</span>
        </div>
        <h1 className={styles.heading}>Sign in to ARR review</h1>
        <p className={styles.copy}>
          Prototype login for walkthroughs. Any username/password works; company sets the demo tenant and email is used for review audit actions.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Username
            <input className={styles.input} value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </label>
          <label className={styles.label}>
            Email / user field
            <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </label>
          <label className={styles.label}>
            Company / tenant
            <input className={styles.input} value={companyName} onChange={e => setCompanyName(e.target.value)} autoComplete="organization" />
          </label>
          <label className={styles.label}>
            Password
            <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          <p className={styles.note}>
            This is not production authentication yet. It only stores local demo context in this browser.
          </p>
          <button className={`primary ${styles.submit}`} type="submit">
            Continue to import workflow
          </button>
        </form>
      </div>
    </div>
  );
}
