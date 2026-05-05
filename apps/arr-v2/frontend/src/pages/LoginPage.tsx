import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { trackAuditEvent } from '@/lib/audit';
import { useArrSettings } from '@/lib/settings';
import { validateStagingLogin } from '@/lib/stagingLogin';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, login, tenantId } = useArrSettings();
  const [name, setName] = useState('Brian Demo User');
  const [email, setEmail] = useState('brian@example.com');
  const [companyName, setCompanyName] = useState('default');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (isLoggedIn) {
    const next = tenantId === 'admin'
      ? '/admin/audit'
      : ((location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/import');
    return <Navigate to={next} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);

    const validation = validateStagingLogin(email, password, companyName);
    if (!validation.ok) {
      setError(validation.message);
      if (validation.normalizedTenantId && validation.errorCode) {
        trackAuditEvent({
          eventType: 'login_error',
          tenantId: validation.normalizedTenantId,
          userEmail: validation.normalizedEmail ?? email.trim(),
          errorCode: validation.errorCode,
          targetLabel: validation.errorCode,
        });
      }
      return;
    }

    const normalizedEmail = validation.normalizedEmail ?? email.trim();
    const normalizedTenantId = validation.normalizedTenantId ?? companyName.trim();
    login({
      displayName: name,
      userEmail: normalizedEmail,
      tenantId: normalizedTenantId,
    });
    trackAuditEvent({
      eventType: 'login_success',
      tenantId: normalizedTenantId,
      userEmail: normalizedEmail,
    });
    navigate(normalizedTenantId === 'admin' ? '/admin/audit' : '/import', { replace: true });
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
          Prototype staging login for walkthroughs. Use a lowercase email-style username and the matching demo password pattern.
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
          {error && <div className={styles.error} role="alert">{error}</div>}
          <p className={styles.note}>
            Staging/demo auth only. Todd uses <code>todd@DEF</code>, Brian uses <code>brian@ABC</code>, and other lowercase users use <code>{'{username}@XYZ'}</code>.
          </p>
          <button className={`primary ${styles.submit}`} type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
