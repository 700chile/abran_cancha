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
  | 'users:manage';

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
  'users:manage': 20             // Treat users:manage as admin-permissions too (or adjust if separate)
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

        // Try roles table with two common names
        let roleKeyValue: RoleKey | null = null;
        {
          const { data: roleA, error: errA } = await supabase
            .from('rbac_roles')
            .select('key')
            .eq('id', rId)
            .maybeSingle();
          if (!errA && roleA?.key) {
            roleKeyValue = roleA.key as RoleKey;
          } else {
            const { data: roleB, error: errB2 } = await supabase
              .from('rbac_role')
              .select('key')
              .eq('id', rId)
              .maybeSingle();
            if (errA) console.error('[RBAC] rbac_roles error', errA);
            if (errB2) console.error('[RBAC] rbac_role error', errB2);
            roleKeyValue = (roleB?.key as RoleKey) ?? null;
          }
        }
        if (!mounted) return;
        setRoleKey(roleKeyValue as RoleKey);

        // Fetch permission IDs from join table. Try multiple table names.
        let permIds: number[] = [];
        {
          const { data: rpA, error: errA } = await supabase
            .from('rbac_role_permission')
            .select('permission_id')
            .eq('role_id', rId);
          if (!errA && rpA) {
            permIds = rpA.map((rp: any) => rp.permission_id);
          } else {
            const { data: rpB, error: errB } = await supabase
              .from('rbac_roles_permissions')
              .select('permission_id')
              .eq('role_id', rId);
            if (!errB && rpB) {
              permIds = rpB.map((rp: any) => rp.permission_id);
            }
            if (errA) console.error('[RBAC] rbac_role_permission error', errA);
            if (errB) console.error('[RBAC] rbac_roles_permissions error', errB);
          }
        }
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
