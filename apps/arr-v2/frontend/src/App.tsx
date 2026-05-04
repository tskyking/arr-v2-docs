import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import ImportPage from '@/pages/ImportPage';
import DashboardPage from '@/pages/DashboardPage';
import ReviewQueuePage from '@/pages/ReviewQueuePage';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import CustomerCubePage from '@/pages/CustomerCubePage';
import LoginPage from '@/pages/LoginPage';
import { auditInteractiveClick, trackAuditEvent } from '@/lib/audit';
import { useArrSettings } from '@/lib/settings';

function AuditRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    trackAuditEvent({
      eventType: 'page_view',
      route: `${location.pathname}${location.search}${location.hash}`,
      path: location.pathname,
      hash: location.hash,
    });
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handler = (event: MouseEvent) => auditInteractiveClick(event.target);
    document.addEventListener('click', handler, { capture: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, []);

  return null;
}

function RequireLogin({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { isLoggedIn } = useArrSettings();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

export default function App() {
  return (
    <>
    <AuditRouteTracker />
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireLogin><Layout /></RequireLogin>}>
        <Route index element={<Navigate to="/import" replace />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="dashboard/:importId" element={<DashboardPage />} />
        <Route path="review/:importId" element={<ReviewQueuePage />} />
        <Route path="customers/:importId/:customerName" element={<CustomerDetailPage />} />
        <Route path="customer-cube/:importId" element={<CustomerCubePage />} />
        {/* catch-all */}
        <Route path="*" element={<Navigate to="/import" replace />} />
      </Route>
    </Routes>
    </>
  );
}
