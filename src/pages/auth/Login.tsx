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
  const [mobileCoverReady, setMobileCoverReady] = useState(false);
  const [desktopCoverReady, setDesktopCoverReady] = useState(false);
  const { login, requestPasswordReset, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const loginCoverSrc = `${import.meta.env.BASE_URL}login-cover.jpg`;
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

  return (
    <div className="h-screen overflow-auto bg-[radial-gradient(circle_at_20%_20%,#2a0f18_0%,#16080f_45%,#0d050a_100%)] px-4 py-8 lg:overflow-hidden lg:py-8">
      <div className="mx-auto flex h-full w-full max-w-[980px] items-center justify-center">
        <div className="relative w-full overflow-hidden rounded-[30px] border border-white/15 bg-[rgba(17,9,15,0.78)] shadow-[0_44px_120px_-44px_rgba(0,0,0,0.95)] backdrop-blur-md lg:grid lg:min-h-[620px] lg:grid-cols-[1fr_1.05fr]">
          <div className="relative h-52 overflow-hidden border-b border-white/10 lg:hidden">
            {!mobileCoverReady && <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#2a0f18] to-[#3a131f]" />}
            <img
              src={loginCoverSrc}
              alt="Imagen de portada del sistema"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onLoad={() => setMobileCoverReady(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${mobileCoverReady ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-[#320910]/35 to-[#cf1717]/50" />
          </div>

          <div className="relative z-10 px-6 py-7 text-white sm:px-8 sm:py-8 lg:flex lg:h-full lg:flex-col lg:justify-center lg:px-8 lg:py-8">
            <div className="lg:mx-auto lg:w-full lg:max-w-[480px]">
              <div className="mb-8 lg:mb-9">
              <p className="text-xs font-bold uppercase tracking-[0.26em] text-[#ff8a36]">
                Moto<span className="text-[#ff2e2e]">repuestos</span>
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-[#f3f3f3] sm:text-[42px] lg:text-[48px]">Iniciar sesion</h1>
              <p className="mt-2 text-base text-white/75">Panel administrativo y operaciones del negocio</p>
              </div>

            {!forgotPasswordOpen ? (
              <>
                <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/95">Correo electronico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white/[0.03] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/45 focus:border-[#ff4f45] focus:ring-2 focus:ring-[#ff3a32]/35"
                      placeholder="tu@email.com"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-white/95">Contrasena</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-2xl border border-white/20 bg-white/[0.03] px-4 py-3 pr-11 text-base text-white outline-none transition placeholder:text-white/45 focus:border-[#ff4f45] focus:ring-2 focus:ring-[#ff3a32]/35"
                        placeholder="••••••••"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 transition hover:text-white disabled:opacity-50"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm text-white/75">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        disabled={loading}
                        className="h-4 w-4 cursor-pointer rounded border-white/30 accent-[#ff4037]"
                      />
                      Recordarme
                    </label>
                    <button
                      type="button"
                      onClick={() => setForgotPasswordOpen(true)}
                      className="text-sm font-medium text-[#ff3d36] transition hover:text-[#ff5f57]"
                    >
                      ¿Olvidaste tu contrasena?
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-[#ff544d]/40 bg-[#ff544d]/15 p-3 text-sm text-[#ffd2cf]">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#ff2a2a] to-[#ea071a] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </form>

              </>
            ) : (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white">Recuperar contrasena</h2>
                <p className="text-sm text-white/75">Ingresa tu email y te enviaremos un enlace para restablecer tu contrasena.</p>

                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white/[0.03] px-4 py-3.5 text-white outline-none transition placeholder:text-white/45 focus:border-[#ff4f45] focus:ring-2 focus:ring-[#ff3a32]/35"
                  placeholder="tu@email.com"
                  disabled={loading}
                />

                {resetMessage && (
                  <div className="rounded-xl border border-[#ff544d]/40 bg-[#ff544d]/15 p-3 text-sm text-[#ffd2cf]">
                    {resetMessage}
                  </div>
                )}

                {(resetLink || resetMessage.includes('preview')) && (
                  <div className="space-y-2">
                    {resetToken && (
                      <>
                        <Link
                          to={`/reset-password?token=${encodeURIComponent(resetToken)}`}
                          className="inline-block text-sm font-medium text-[#ff665f] hover:underline"
                        >
                          Ir al formulario de restablecimiento
                        </Link>
                        <button
                          type="button"
                          className="block text-xs text-white/65 transition hover:text-white"
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
                    className="flex-1 rounded-xl bg-gradient-to-r from-[#ff2a2a] to-[#ea071a] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
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
                    className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>

          <aside className="relative hidden min-h-[620px] overflow-hidden border-l border-white/10 lg:block">
            {!desktopCoverReady && <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#211018] via-[#1a0b12] to-[#350b13]" />}
            <img
              src={loginCoverSrc}
              alt="Imagen de apoyo para el acceso"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onLoad={() => setDesktopCoverReady(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${desktopCoverReady ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/35 via-transparent to-[#ff0000]/45" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,rgba(255,0,0,0.35),transparent_45%)]" />
          </aside>
        </div>
      </div>
    </div>
  );
}
