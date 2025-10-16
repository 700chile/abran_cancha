import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import { usePermissions } from './PermissionProvider';
import type { PermissionKey } from './PermissionProvider';

export default function ProtectedRoute({ children, need }: { children: ReactNode; need?: PermissionKey }) {
  const { user, loading } = useAuth();
  const { loading: permLoading, has } = usePermissions();
  const location = useLocation();

  if (loading || permLoading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (need && !has(need)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
