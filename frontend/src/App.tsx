import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import TenantPortal from './pages/TenantPortal';
import LoginPage from './pages/LoginPage';
import VNPaySandboxPage from './pages/VNPaySandboxPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/vnpay-sandbox" element={<VNPaySandboxPage />} />

          {/* Tenant Portal (also allows viewing login redirect cleanly) */}
          <Route path="/" element={<TenantPortal />} />

          {/* Protected System Admin Routes (Xem nhật ký & Quản lý Chủ trọ) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/system-admin/*" element={<SystemAdminDashboard />} />
          </Route>

          {/* Protected Landlord / Host Routes */}
          <Route element={<ProtectedRoute allowedRoles={['LANDLORD', 'ADMIN']} />}>
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
