import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/auth';
import { canAccess, permissionForPath } from '../lib/permissions';

export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.user?.role);
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return canAccess(role, permissionForPath(location.pathname)) ? <Outlet /> : <Navigate to="/" replace />;
}
