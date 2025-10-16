import type { ReactNode } from 'react';
import { usePermissions } from './PermissionProvider';

export default function PermissionGate({ need, children }: { need: import('./PermissionProvider').PermissionKey; children: ReactNode }) {
  const { loading, has } = usePermissions();
  if (loading) return null;
  if (!has(need)) return null;
  return <>{children}</>;
}
