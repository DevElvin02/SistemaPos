const RESEND_API_URL = 'https://api.resend.com/emails';

function getBaseUrl() {
  return process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
}

export function buildPasswordResetLink(token) {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendPasswordResetEmail({ to, name, token }) {
  if (!emailDeliveryConfigured()) {
    return {
      delivered: false,
      mode: 'preview',
      resetLink: buildPasswordResetLink(token),
    };
  }

  const resetLink = buildPasswordResetLink(token);
  const appName = process.env.APP_NAME || 'Sublimart';
  const subject = `${appName} - Recuperacion de contrasena`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
      <h1 style="margin:0 0 16px;font-size:24px;">${appName}</h1>
      <p style="margin:0 0 12px;">Hola ${name || 'usuario'},</p>
      <p style="margin:0 0 12px;">Recibimos una solicitud para restablecer tu contrasena.</p>
      <p style="margin:0 0 20px;">Este enlace expirara en 15 minutos.</p>
      <p style="margin:0 0 24px;">
        <a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">Restablecer contrasena</a>
      </p>
      <p style="margin:0 0 10px;font-size:14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
      <p style="margin:0;font-size:13px;color:#475569;word-break:break-all;">${resetLink}</p>
    </div>
  `;

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject,
      html,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'No se pudo enviar el correo de recuperacion');
  }

  return {
    delivered: true,
    mode: 'resend',
    messageId: payload?.id,
    resetLink,
  };
}