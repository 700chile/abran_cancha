import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function PasswordUpdater() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  // Handle magic link authentication and session setup
  useEffect(() => {
    let active = true;
    
    (async () => {
      setAuthChecking(true);
      
      try {
        // Check for current session (from magic link)
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session check error:', sessionError);
          if (active) {
            setError('Error de autenticación. Por favor solicita un nuevo enlace mágico.');
            setAuthChecking(false);
          }
          return;
        }

        if (!sessionData.session) {
          // Try to get user from hash (magic link redirect)
          const { data: hashData, error: hashError } = await supabase.auth.getUser();
          
          if (hashError) {
            console.error('Hash auth error:', hashError);
            if (active) {
              setError('Enlace inválido o expirado. Por favor solicita un nuevo enlace mágico.');
              setAuthChecking(false);
            }
            return;
          }

          if (!hashData.user) {
            if (active) {
              setError('No se encontró sesión activa. Por favor solicita un nuevo enlace mágico.');
              setAuthChecking(false);
            }
            return;
          }
        }

        // If we reach here, user is authenticated
        const { data: u } = await supabase.auth.getUser();
        const user = u?.user;
        
        if (!active || !user) {
          if (active) {
            setError('Error de autenticación. Por favor solicita un nuevo enlace mágico.');
            setAuthChecking(false);
          }
          return;
        }

        setIsAuthenticated(true);
        const userId = user.id;
        const email = user.email ?? null;
        
        // Safety backfill: ensure rbac_profiles and user_role exist for the authenticated user
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
        
      } catch (e) {
        console.error('Auth setup error:', e);
        if (active) {
          setError('Error de autenticación. Por favor solicita un nuevo enlace mágico.');
        }
      } finally {
        if (active) {
          setAuthChecking(false);
        }
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

  if (authChecking) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="w-full px-0 sm:px-2 lg:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">Actualizar Contraseña</h1>
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Verificando autenticación...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isAuthenticated) {
    return (
      <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
        <div className="w-full px-0 sm:px-2 lg:px-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-brand-primary mb-6">Actualizar Contraseña</h1>
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-xl">
            <div className="text-red-600 text-sm">{error}</div>
            <div className="text-sm text-gray-600">
              Por favor solicita un nuevo enlace mágico para restablecer tu contraseña.
            </div>
          </div>
        </div>
      </div>
    );
  }

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
