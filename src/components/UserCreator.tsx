import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

interface Role {
  id: number;
  key: string;
  description: string | null;
}

export default function UserCreator() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleId, setRoleId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('rbac_role').select('*').order('id');
      if (error) {
        console.error(error);
      } else {
        setRoles(data || []);
      }
    })();
  }, []);

  const sendInvite = async () => {
    setError(null);
    setMessage(null);
    if (!email) {
      setError('Ingresa un email válido');
      return;
    }
    if (!password || password.length < 6) {
      setError('Ingresa una contraseña de al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/password-updater`,
        },
      });
      if (error) throw error;
      // Create profile and default role assignment immediately using returned user id
      const newUserId = data?.user?.id;
      if (newUserId) {
        try {
          await supabase.from('rbac_profiles').upsert({
            user_id: newUserId,
            email,
            display_name: displayName || null,
          });
        } catch (e) {
          console.error('[RBAC:UI] upsert rbac_profiles error', e);
        }
        try {
          const defaultRoleId = roleId ? Number(roleId) : 2;
          await supabase.from('user_role').upsert(
            { user_id: newUserId, role_id: defaultRoleId },
            { onConflict: 'user_id' }
          );
        } catch (e) {
          console.error('[RBAC:UI] upsert user_role error', e);
        }
      }
      setMessage('Usuario creado (pendiente confirmación). Se envió un correo de verificación con enlace a la página para actualizar contraseña.');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error enviando invitación');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 sm:px-2 lg:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">Crear Usuario</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-xl">
          <div className="text-sm text-gray-600">
            Envía una invitación por email. Tras el registro, podrás asignar el rol desde la página "Usuarios y Roles". Si deseas asignar un rol ahora, selecciónalo aquí solo como referencia.
          </div>

          {message && <div className="text-green-600 text-sm">{message}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 border rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="persona@correo.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nombre a mostrar (opcional)</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Ana Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña inicial</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
            <div className="text-xs text-gray-500 mt-1">
              Se enviará un correo de verificación. Tras confirmar, el usuario será redirigido a "Actualizar Contraseña".
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol deseado (referencial)</label>
            <select
              className="w-full p-2 border rounded"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Sin seleccionar</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.description ? `${r.key} — ${r.description}` : r.key}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-1">
              Nota: El rol se asigna una vez que el usuario completa el registro.
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={sendInvite}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
