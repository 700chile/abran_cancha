import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '../supabase';

export default function AuthPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (res.error) return setError(res.error);
      navigate(from, { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const onMagicLinkSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setMagicLinkLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (error) {
        setError(error.message);
        return;
      }
      setMessage('Se envió un enlace mágico a tu correo. Haz clic en el enlace para iniciar sesión.');
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold mb-4">Iniciar sesión</h1>
      
      {/* Toggle between password and magic link */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setUseMagicLink(false)}
          className={`flex-1 py-2 px-4 rounded ${!useMagicLink ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Contraseña
        </button>
        <button
          type="button"
          onClick={() => setUseMagicLink(true)}
          className={`flex-1 py-2 px-4 rounded ${useMagicLink ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Enlace mágico
        </button>
      </div>

      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      {message && <div className="mb-3 text-green-600 text-sm">{message}</div>}
      
      {!useMagicLink ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full border rounded px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
          >
            {loading ? 'Procesando...' : 'Iniciar sesión'}
          </button>
        </form>
      ) : (
        <form onSubmit={onMagicLinkSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <p className="text-sm text-gray-600">
            Te enviaremos un enlace mágico a tu correo para iniciar sesión sin contraseña.
          </p>
          <button
            type="submit"
            disabled={magicLinkLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded disabled:opacity-60"
          >
            {magicLinkLoading ? 'Enviando...' : 'Enviar enlace mágico'}
          </button>
        </form>
      )}
    </div>
  );
}
