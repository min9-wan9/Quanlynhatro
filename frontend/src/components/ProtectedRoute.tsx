import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type Role } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Chuyển hướng về login và lưu lại trang đang muốn vào
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Nếu role không khớp, đẩy về trang chủ hoặc báo lỗi 403
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
