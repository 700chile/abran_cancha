import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Role {
  id: number;
  key: string;
  description: string | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export default function UserRoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rbac_role').select('*').order('id');
      if (error) {
        console.error(error);
        setError('Error cargando roles');
      } else {
        setRoles(data || []);
      }
    })();
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setCurrentRole(null);
      if (!userId) return;
      console.log('[RBAC:UI] lookup current role for user', userId);
      const { data: ur, error: urErr } = await supabase
        .from('user_role')
        .select('role_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (urErr) {
        console.error(urErr);
        return;
      }
      console.log('[RBAC:UI] user_role result', ur);
      const rid = ur?.role_id;
      if (!rid) return;
      const { data: roleRow, error: roleErr } = await supabase
        .from('rbac_role')
        .select('*')
        .eq('id', rid)
        .maybeSingle();
      if (roleErr) {
        console.error(roleErr);
        return;
      }
      console.log('[RBAC:UI] rbac_role result', roleRow);
      if (!active) return;
      setCurrentRole(roleRow as Role);
    })();
    return () => { active = false };
  }, [userId]);

  useEffect(() => {
    let active = true;
    const handler = setTimeout(async () => {
      setSearchError(null);
      setSearching(true);
      try {
        const q = search.trim();
        console.log('[RBAC:UI] profiles search query', q);
        let data: any[] | null = null;
        let error: any = null;
        if (!q) {
          const res = await supabase
            .from('rbac_profiles')
            .select('user_id, display_name, email')
            .order('display_name', { ascending: true })
            .order('email', { ascending: true })
            .limit(50);
          data = res.data;
          error = res.error;
          console.log('[RBAC:UI] profiles fetch (all) resp', { error, count: data?.length, sample: data?.[0] });
        } else if (q.length < 2) {
          // For very short queries, just show all to avoid noisy filtering
          const res = await supabase
            .from('rbac_profiles')
            .select('user_id, display_name, email')
            .order('display_name', { ascending: true })
            .order('email', { ascending: true })
            .limit(50);
          data = res.data;
          error = res.error;
          console.log('[RBAC:UI] profiles fetch (short) resp', { error, count: data?.length, sample: data?.[0] });
        } else {
          const res = await supabase
            .from('rbac_profiles')
            .select('user_id, display_name, email')
            .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
            .order('display_name', { ascending: true })
            .order('email', { ascending: true })
            .limit(50);
          data = res.data;
          error = res.error;
          console.log('[RBAC:UI] profiles fetch (filtered) resp', { error, count: data?.length, sample: data?.[0] });
        }
        if (error) throw error;
        if (active) setResults((data as Profile[]) || []);
      } catch (e: any) {
        console.error(e);
        if (active) setSearchError(e?.message || 'Error buscando usuarios');
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [search]);

  const assignRole = async () => {
    setError(null);
    setMessage(null);
    if (!userId || !roleId) {
      setError('Ingresa el UUID de usuario y selecciona un rol');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('user_role').upsert(
        { user_id: userId, role_id: Number(roleId) },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      setMessage('Rol asignado correctamente');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error asignando rol');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 2500);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 sm:px-2 lg:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">Usuarios y Roles</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <div className="text-sm text-gray-600">
            Para asignar un rol, ingresa el <b>UUID</b> del usuario y elige un rol. Si necesitas crear usuarios por email, eso requiere una clave de servicio (server-side) y no se hace desde el cliente.
          </div>

          {message && <div className="text-green-600 text-sm">{message}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Buscar por Email o Nombre (vacío muestra todos)</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="ej: ana@correo.com o Ana"
            />
            {searchError && <div className="mt-2 text-xs text-red-600">{searchError}</div>}
            {(results.length > 0 || searching) && (
              <div className="mt-2 border rounded divide-y max-h-64 overflow-auto">
                {results.map((u) => (
                  <button
                    key={u.user_id}
                    type="button"
                    onClick={() => {
                      console.log('[RBAC:UI] selected profile', u);
                      setUserId(u.user_id);
                      setSearch(u.email || u.display_name || '');
                      setResults([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  >
                    <div className="text-sm font-medium">{u.display_name || '(sin nombre)'}</div>
                    <div className="text-xs text-gray-600">{u.email || '(sin email)'} — <span className="font-mono">{u.user_id}</span></div>
                  </button>
                ))}
                {searching && <div className="px-3 py-2 text-xs text-gray-500">Buscando…</div>}
              </div>
            )}
            {!searching && results.length === 0 && !searchError && (
              <div className="mt-2 text-xs text-gray-500">Sin resultados</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">UUID del Usuario</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
              className="w-full p-2 border rounded"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            {currentRole && (
              <div className="mt-2 text-xs text-gray-600">
                Rol actual: <b>{currentRole.key}</b>{currentRole.description ? ` — ${currentRole.description}` : ''}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              className="w-full p-2 border rounded"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecciona un rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.description ? `${r.key} — ${r.description}` : r.key}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={assignRole}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Asignar Rol'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
