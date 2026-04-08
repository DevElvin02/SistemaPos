import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetToken, setResetToken] = useState('');
  const { login, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const resetLink = useMemo(() => {
    if (!resetToken) return '';
    return `${window.location.origin}/reset-password?token=${encodeURIComponent(resetToken)}`;
  }, [resetToken]);

  // Cargar datos guardados al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('login_remember');
    if (saved) {
      try {
        const { email: savedEmail } = JSON.parse(saved);
        setEmail(savedEmail);
        setRememberMe(true);
      } catch {
        localStorage.removeItem('login_remember');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      // Guardar email si está marcado "Recordar contraseña"
      if (rememberMe) {
        localStorage.setItem('login_remember', JSON.stringify({ email }));
      } else {
        localStorage.removeItem('login_remember');
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetMessage('Por favor ingresa tu email.');
      return;
    }

    setLoading(true);
    try {
      const reset = await requestPasswordReset(resetEmail);
      setResetToken(reset.token ?? '');
      if (reset.deliveryMode === 'resend') {
        setResetMessage(`Correo enviado a ${reset.email}. Revisa tu bandeja de entrada.`);
      } else {
        setResetMessage(
          `Enlace generado para ${reset.email}. Expira en 15 minutos. Estas en modo preview local.`
        );
      }
      setResetEmail('');
    } catch (err) {
      setResetMessage(err instanceof Error ? err.message : 'No se pudo generar el enlace de recuperación.');
      setResetToken('');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: 'admin' | 'cajero') => {
    if (role === 'admin') {
      setEmail('admin@example.com');
      setPassword('admin123');
    } else {
      setEmail('cajero@example.com');
      setPassword('cajero123');
    }
    setError('');
    setResetMessage('');
    setResetToken('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-2xl p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Motorepuestos</h1>
            <p className="text-muted-foreground">Sistema de Gestión Admin</p>
          </div>

          {!forgotPasswordOpen ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                    placeholder="tu@email.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition pr-10"
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition disabled:opacity-50"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={loading}
                      className="w-4 h-4 rounded border-border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Recordar email</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-sm text-primary hover:underline transition"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {error && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Credenciales iniciales en una base nueva:
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('admin')}
                    className="w-full px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:opacity-90 transition"
                  >
                    Admin: admin@example.com
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('cajero')}
                    className="w-full px-4 py-2 text-sm rounded-lg bg-secondary text-secondary-foreground hover:opacity-90 transition"
                  >
                    Cajero: cajero@example.com
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-center text-muted-foreground">
                  Si restauraste usuarios o cambiaste la clave antes, usa la contraseña actual o la opcion de recuperar contraseña.
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Recuperar Contraseña</h2>
              <p className="text-sm text-muted-foreground">
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                placeholder="tu@email.com"
                disabled={loading}
              />

              {resetMessage && (
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/10 text-sm text-foreground">
                  {resetMessage}
                </div>
              )}

              {(resetLink || resetMessage.includes('preview')) && (
                <div className="space-y-2">
                  {resetToken && (
                    <>
                      <Link
                        to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                        className="inline-block text-sm text-primary hover:underline"
                      >
                        Ir al formulario de restablecimiento
                      </Link>
                      <button
                        type="button"
                        className="block text-xs text-muted-foreground hover:text-foreground transition"
                        onClick={() => navigator.clipboard.writeText(resetLink)}
                      >
                        Copiar enlace de recuperación
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
                >
                  {loading ? 'Generando...' : 'Enviar enlace'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordOpen(false);
                    setResetEmail('');
                    setResetMessage('');
                    setResetToken('');
                  }}
                  className="flex-1 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition"
                >
                  Volver
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
