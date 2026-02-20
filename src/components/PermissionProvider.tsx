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
  | 'teams:select'
  | 'users:create'
  | 'permissions:admin'
  | 'users:manage'
  | 'images:create';

export type RoleKey = 'admin' | 'editor' | 'viewer';

// Map app-level permission keys to DB IDs provided by the user
const PERMISSION_IDS: Record<PermissionKey, number> = {
  'matches:update': 11,          // Actualizar partidos
  'goals:create': 12,            // Registrar goles
  'players:create': 13,          // Ingresar jugadora
  'teams:create': 14,            // Crear equipo
  'competitions:create': 15,     // Crear competencia
  'roster:manage': 16,           // Ingresar plantel
  'matches:create': 17,          // Crear partidos
  'teams:select': 18,            // Seleccionar equipos
  'users:create': 19,            // Crear usuario
  'permissions:admin': 20,       // Administrar permisos
  'users:manage': 20,            // Treat users:manage as admin-permissions too (or adjust if separate)
  'images:create': 21             // Crear imágenes
};

type PermissionContextValue = {
  roleId: number | null;
  roleKey: RoleKey | null;
  permissions: Set<number>; // store permission IDs
  loading: boolean;
  has: (perm: PermissionKey) => boolean;
};

const PermissionContext = createContext<PermissionContextValue | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [roleId, setRoleId] = useState<number | null>(null);
  const [roleKey, setRoleKey] = useState<RoleKey | null>(null);
  const [permissions, setPermissions] = useState<Set<number>>(new Set());
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
        const { data: ur, error: urErr } = await supabase
          .from('user_role')
          .select('role_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (urErr) console.error('[RBAC] user_role error', urErr);

        const rId = ur?.role_id ?? null;
        if (!mounted) return;
        setRoleId(rId);

        if (!rId) {
          setRoleKey(null);
          setPermissions(new Set());
          return;
        }

        // Prefer exact table name provided by user: rbac_role (singular)
        let roleKeyValue: RoleKey | null = null;
        const { data: roleRow, error: roleErr } = await supabase
          .from('rbac_role')
          .select('key')
          .eq('id', rId)
          .maybeSingle();
        if (roleErr) console.error('[RBAC] rbac_role error', roleErr);
        roleKeyValue = (roleRow?.key as RoleKey) ?? null;
        if (!mounted) return;
        setRoleKey(roleKeyValue as RoleKey);

        // Fetch permission IDs from join table: rbac_role_permissions (plural)
        let permIds: number[] = [];
        const { data: rpRows, error: rpErr } = await supabase
          .from('rbac_role_permissions')
          .select('permission_id')
          .eq('role_id', rId);
        if (rpErr) console.error('[RBAC] rbac_role_permissions error', rpErr);
        permIds = (rpRows ?? []).map((rp: any) => rp.permission_id);
        console.log('[RBAC] user', user.id, 'roleId', rId, 'roleKey', roleKeyValue, 'permIds', permIds);
        if (permIds.length === 0) {
          if (!mounted) return;
          setPermissions(new Set());
          return;
        }

        // Store IDs directly
        if (!mounted) return;
        setPermissions(new Set<number>(permIds));
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
      has: (perm: PermissionKey) => {
        if ((roleKey && roleKey.toLowerCase() === 'admin') || roleId === 1) return true;
        const id = PERMISSION_IDS[perm];
        return permissions.has(id);
      },
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
