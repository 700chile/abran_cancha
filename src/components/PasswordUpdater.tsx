import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function PasswordUpdater() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Safety backfill: ensure rbac_profiles and user_role exist for the authenticated user
  useEffect(() => {
    let active = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!active || !user) return;
      const userId = user.id;
      const email = user.email ?? null;
      try {
        // Profiles upsert (idempotent)
        const { error: profErr } = await supabase.from('rbac_profiles').upsert({
          user_id: userId,
          email,
          display_name: null,
        });
        if (profErr) console.error('[RBAC:UI] backfill rbac_profiles error', profErr);
      } catch (e) {
        console.error('[RBAC:UI] backfill rbac_profiles exception', e);
      }
      try {
        // Assign default role 2 if none exists
        const { data: ur, error: selErr } = await supabase
          .from('user_role')
          .select('role_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (selErr) console.error('[RBAC:UI] backfill user_role select error', selErr);
        if (!ur?.role_id) {
          const { error: upErr } = await supabase
            .from('user_role')
            .upsert({ user_id: userId, role_id: 2 }, { onConflict: 'user_id' });
          if (upErr) console.error('[RBAC:UI] backfill user_role upsert error', upErr);
        }
      } catch (e) {
        console.error('[RBAC:UI] backfill user_role exception', e);
      }
    })();
    return () => { active = false };
  }, []);

  const onUpdate = async () => {
    setError(null);
    setMessage(null);
    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage('Contraseña actualizada correctamente.');
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Error actualizando contraseña');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="w-full px-0 sm:px-2 lg:px-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">Actualizar Contraseña</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-xl">
          <div className="text-sm text-gray-600">
            Establece o actualiza tu contraseña para tu cuenta.
          </div>

          {message && <div className="text-green-600 text-sm">{message}</div>}
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium mb-1">Nueva contraseña</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
            <input
              type="password"
              className="w-full p-2 border rounded"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={onUpdate}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
