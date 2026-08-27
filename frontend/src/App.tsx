import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Transfers from './pages/Transfers';
import Downtime from './pages/Downtime';
import Maintenance from './pages/Maintenance';
import SpareParts from './pages/SpareParts';
import Rental from './pages/Rental';
import UserManagement from './pages/UserManagement';
import MechanicKPI from './pages/MechanicKPI';
import MechanicDashboard from './pages/MechanicDashboard';
import LineChiefDashboard from './pages/LineChiefDashboard';
import LineChiefHistory from './pages/LineChiefHistory';
import UserDashboard from './pages/UserDashboard';
import SystemAdmin from './pages/SystemAdmin';
import SecurityDashboard from './pages/SecurityDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { token, isMechanic, isLineChief, isUser, isSystemAdmin, isSecurity } = useAuth();

  const homeRedirect = isSystemAdmin ? '/system' : isSecurity ? '/security' : isMechanic ? '/mechanic' : isLineChief ? '/line-chief' : isUser ? '/user-dashboard' : '/';

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to={homeRedirect} replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={isSystemAdmin ? <Navigate to="/system" replace /> : isSecurity ? <Navigate to="/security" replace /> : isMechanic ? <Navigate to="/mechanic" replace /> : isLineChief ? <Navigate to="/line-chief" replace /> : isUser ? <Navigate to="/user-dashboard" replace /> : <Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/downtime" element={<Downtime />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/spare-parts" element={<SpareParts />} />
        <Route path="/rental" element={<Rental />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/mechanic-kpi" element={<MechanicKPI />} />
        <Route path="/mechanic" element={<MechanicDashboard />} />
        <Route path="/line-chief" element={<LineChiefDashboard />} />
        <Route path="/line-chief/history" element={<LineChiefHistory />} />
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/system" element={<SystemAdmin />} />
        <Route path="/security" element={<SecurityDashboard />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#1890ff' } }}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
}
