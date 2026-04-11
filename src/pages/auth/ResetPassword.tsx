import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { validateResetToken } from '../../lib/auth-store';

interface ResetTokenState {
  valid: boolean;
  email?: string;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const isDesktopRuntime = window.location.protocol === 'file:';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenState, setTokenState] = useState<ResetTokenState>({ valid: false });

  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  useEffect(() => {
    let mounted = true;

    const verifyToken = async () => {
      if (!token) {
        if (mounted) {
          setTokenState({ valid: false });
          setTokenLoading(false);
        }
        return;
      }

      try {
        const result = await validateResetToken(token);
        if (mounted) {
          setTokenState(result);
        }
      } catch {
        if (mounted) {
          setTokenState({ valid: false });
        }
      } finally {
        if (mounted) {
          setTokenLoading(false);
        }
      }
    };

    void verifyToken();

    return () => {
      mounted = false;
    };
  }, [token]);

  if (tokenLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">Validando enlace</h1>
          <p className="text-muted-foreground">Espera un momento...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Completa ambos campos de contraseña.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(
        isDesktopRuntime
          ? 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
          : 'Contraseña actualizada correctamente. Si eres cajero, inicia sesión desde la app de escritorio del negocio.'
      );
      if (isDesktopRuntime) {
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (!token || !tokenState.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-3">Enlace inválido</h1>
          <p className="text-muted-foreground mb-6">
            El enlace de recuperación no es válido o ya expiró.
          </p>
          <Link
            to="/login"
            className="inline-block px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            Volver al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">Restablecer Contraseña</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Cuenta: {tokenState.email}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition pr-10"
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition pr-10"
                placeholder="Repite la contraseña"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
          {success && <div className="text-sm text-primary">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
