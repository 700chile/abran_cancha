import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as any;
  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await signIn(email, password);
        if (res.error) return setError(res.error);
        navigate(from, { replace: true });
      } else {
        const res = await signUp(email, password);
        if (res.error) return setError(res.error);
        if (res.needsVerification) setInfo('Revisa tu correo para confirmar la cuenta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold mb-4">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
      {info && <div className="mb-3 text-green-600 text-sm">{info}</div>}
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
          <label className="block text-sm mb-1">Password</label>
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
          className="w-full bg-brand-primary text-white py-2 rounded disabled:opacity-60"
        >
          {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrar'}
        </button>
      </form>
      <div className="mt-4 text-sm">
        {mode === 'login' ? (
          <button className="text-brand-primary" onClick={() => setMode('signup')}>¿No tienes cuenta? Regístrate</button>
        ) : (
          <button className="text-brand-primary" onClick={() => setMode('login')}>¿Ya tienes cuenta? Inicia sesión</button>
        )}
      </div>
    </div>
  );
}
