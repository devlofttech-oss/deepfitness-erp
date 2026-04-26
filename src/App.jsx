import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import MemberList from './pages/members/MemberList';
import AddMember from './pages/members/AddMember';
import MemberProfile from './pages/members/MemberProfile';
import PaymentsList from './pages/payments/PaymentsList';
import PaymentPage from './pages/payments/PaymentPage';
import CheckinScreen from './pages/attendance/CheckinScreen';
import Settings from './pages/settings/Settings';

// Placeholder for missing modules
const Placeholder = ({ title }) => (
  <div className="bg-surface-container-lowest p-card-padding rounded-2xl shadow-[0_10px_30px_rgba(207,196,255,0.15)] flex flex-col items-center justify-center min-h-[400px]">
    <div className="w-16 h-16 bg-primary-container/30 text-primary rounded-full flex items-center justify-center mb-4">
      <span className="material-symbols-outlined text-3xl">build</span>
    </div>
    <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
    <p className="text-on-surface-variant mt-2 font-body-lg">This module is currently being built.</p>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<DashboardLayout />}>
        <Route index element={<Dashboard />} />

        {/* Members */}
        <Route path="members" element={<MemberList />} />
        <Route path="members/add" element={<AddMember />} />
        <Route path="members/:id" element={<MemberProfile />} />

        {/* Payments */}
        <Route path="payments" element={<PaymentsList />} />
        <Route path="payments/new" element={<PaymentPage />} />

        {/* Other */}
        <Route path="checkin" element={<CheckinScreen />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
