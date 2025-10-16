import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabase';
import { useAuth } from './AuthProvider';

export type PermissionKey =
  | 'matches:update'
  | 'goals:create'
  | 'players:create'
  | 'competitions:create'
  | 'teams:create'
  | 'roster:manage'
  | 'matches:create'
  | 'users:manage';

export type RoleKey = 'admin' | 'editor' | 'viewer';

type PermissionContextValue = {
  roleId: number | null;
  roleKey: RoleKey | null;
  permissions: Set<PermissionKey>;
  loading: boolean;
  has: (perm: PermissionKey) => boolean;
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey | null>(null);
  const [permissions, setPermissions] = useState<Set<PermissionKey>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!user) {
        if (!mounted) return;
        setRoleId(null);
        setRoleKey(null);
        setPermissions(new Set());
        return;
      }
      setLoading(true);
      try {
        const { data: ur } = await supabase
          .from('user_role')
          .select('role_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const rId = ur?.role_id ?? null;
        if (!mounted) return;
        setRoleId(rId);

        if (!rId) {
          setRoleKey(null);
          setPermissions(new Set());
          return;
        }

        const { data: role } = await supabase
          .from('rbac_role')
          .select('key')
          .eq('id', rId)
          .maybeSingle();

        const roleKeyValue = (role?.key as RoleKey) ?? null;
        if (!mounted) return;
        setRoleKey(roleKeyValue);

        // Fetch permission IDs from join table rbac_role_permission (role_id, permission_id)
        const { data: rolePerms } = await supabase
          .from('rbac_role_permission')
          .select('permission_id')
          .eq('role_id', rId);

        const permIds = (rolePerms ?? []).map((rp: any) => rp.permission_id);
        if (permIds.length === 0) {
          if (!mounted) return;
          setPermissions(new Set());
          return;
        }

        const { data: perms } = await supabase
          .from('rbac_permissions')
          .select('key')
          .in('id', permIds);

        const keys = new Set<PermissionKey>((perms ?? []).map((p: any) => p.key));
        if (!mounted) return;
        setPermissions(keys);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const value = useMemo<PermissionContextValue>(
    () => ({
      roleId,
      roleKey,
      permissions,
      loading,
      has: (perm: PermissionKey) => permissions.has(perm),
    }),
    [roleId, roleKey, permissions, loading]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionProvider');
  return ctx;
}
