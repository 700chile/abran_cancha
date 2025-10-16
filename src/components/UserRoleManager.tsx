import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Role {
  id: number;
  key: string;
  description: string | null;
}

export default function UserRoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [userId, setUserId] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            <label className="block text-sm font-medium mb-1">UUID del Usuario</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value.trim())}
              className="w-full p-2 border rounded"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
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
                  {r.key}
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
