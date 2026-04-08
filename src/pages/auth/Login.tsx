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
  const { login, requestPasswordReset, isAuthenticated } = useAuth();
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
    <div className="min-h-screen bg-[#12080A] px-4 py-6 sm:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[30px] border border-white/10 bg-white shadow-[0_38px_80px_-36px_rgba(0,0,0,0.8)] lg:grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12">
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Sistematienda</p>
              <h1 className="mt-3 text-3xl font-black leading-tight text-[#121212] sm:text-4xl">Iniciar sesion</h1>
              <p className="mt-2 text-sm text-[#5B5B5B]">Panel administrativo y operaciones del negocio</p>
            </div>

            {!forgotPasswordOpen ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#232323]">Correo electronico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#E1E1E1] bg-white px-4 py-3 text-[#161616] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                      placeholder="tu@email.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#232323]">Contrasena</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#E1E1E1] bg-white px-4 py-3 pr-10 text-[#161616] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757575] transition hover:text-[#202020] disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-[#585858]">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                        className="h-4 w-4 cursor-pointer rounded border-[#CFCFCF]"
                      />
                      Recordarme
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      ¿Olvidaste tu contrasena?
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </form>

                <div className="mt-7 rounded-xl border border-[#ECECEC] bg-[#FAFAFA] p-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-[#676767]">Acceso rapido</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => fillDemo('admin')}
                      className="rounded-lg bg-[#262626] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDemo('cajero')}
                      className="rounded-lg bg-[#444444] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                    >
                      Cajero
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-[#171717]">Recuperar contrasena</h2>
                <p className="text-sm text-[#595959]">Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>

                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E1E1] bg-white px-4 py-3 text-[#161616] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
                  placeholder="tu@email.com"
                  disabled={loading}
                />

                {resetMessage && (
                  <div className="rounded-xl border border-primary/35 bg-primary/10 p-3 text-sm text-[#2A2A2A]">
                    {resetMessage}
                  </div>
                )}

                {(resetLink || resetMessage.includes('preview')) && (
                  <div className="space-y-2">
                    {resetToken && (
                      <>
                        <Link
                          to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                          className="inline-block text-sm font-medium text-primary hover:underline"
                        >
                          Ir al formulario de restablecimiento
                        </Link>
                        <button
                          type="button"
                          className="block text-xs text-[#5D5D5D] transition hover:text-[#1B1B1B]"
                          onClick={() => navigator.clipboard.writeText(resetLink)}
                        >
                          Copiar enlace de recuperacion
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
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
                    className="flex-1 rounded-xl border border-[#DADADA] px-4 py-3 text-sm font-semibold text-[#1C1C1C] transition hover:bg-[#F6F6F6]"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="relative hidden min-h-[680px] overflow-hidden bg-gradient-to-b from-[#DE0505] via-[#C10000] to-[#6E0000] lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.24),transparent_40%)]" />
            <div className="absolute inset-y-0 left-[-110px] w-[240px] rotate-[8deg] bg-white/92" />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0)_38%)]" />

            <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
              <div className="space-y-3">
                <p className="inline-block rounded-full border border-white/40 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]">
                  Plataforma Empresarial
                </p>
                <h2 className="max-w-xs text-3xl font-black leading-tight">
                  Control total de ventas, inventario y caja.
                </h2>
              </div>

              <div className="space-y-1 text-right">
                <p className="text-3xl font-black">Sistematienda</p>
                <p className="text-sm text-white/85">Sistema de Gestion</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
