import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import PredictionPage from './pages/PredictionPage';
import ComplaintsPage from './pages/ComplaintsPage';
import PriorityPage from './pages/PriorityPage';
import RecommendationsPage from './pages/RecommendationsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/complaints" element={<ComplaintsPage />} />
        <Route path="/priority" element={<PriorityPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
