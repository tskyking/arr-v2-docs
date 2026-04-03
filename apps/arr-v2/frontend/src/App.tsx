import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import ImportPage from '@/pages/ImportPage';
import DashboardPage from '@/pages/DashboardPage';
import ReviewQueuePage from '@/pages/ReviewQueuePage';
import CustomerDetailPage from '@/pages/CustomerDetailPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/import" replace />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="dashboard/:importId" element={<DashboardPage />} />
        <Route path="review/:importId" element={<ReviewQueuePage />} />
        <Route path="customers/:importId/:customerName" element={<CustomerDetailPage />} />
        {/* catch-all */}
        <Route path="*" element={<Navigate to="/import" replace />} />
      </Route>
    </Routes>
  );
}
