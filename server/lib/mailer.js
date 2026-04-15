const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_APP_NAME = 'Motorepuestos La Bendicion';
const LEGACY_APP_NAMES = new Set(['sublimart', 'motorepuestos']);
import { generateSaleInvoicePdfBuffer } from './invoice-pdf.js';

function getBaseUrl() {
  return process.env.APP_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
}

function getAppName() {
  const configuredName = String(process.env.APP_NAME || '').trim();
  if (!configuredName) return DEFAULT_APP_NAME;

  return LEGACY_APP_NAMES.has(configuredName.toLowerCase())
    ? DEFAULT_APP_NAME
    : configuredName;
}

function getMailFrom(appName) {
  const configuredFrom = String(process.env.MAIL_FROM || '').trim();
  if (!configuredFrom) return configuredFrom;

  const angleMatch = configuredFrom.match(/<([^>]+)>/);
  if (angleMatch?.[1]) {
    return `${appName} <${angleMatch[1].trim()}>`;
  }

  return configuredFrom.includes('@') ? `${appName} <${configuredFrom}>` : configuredFrom;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

async function sendHtmlEmail({ to, subject, html, appName, attachments = [] }) {
  if (!emailDeliveryConfigured()) {
    return {
      delivered: false,
      mode: 'preview',
      subject,
      html,
      attachments,
    };
  }

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getMailFrom(appName),
      to: [to],
      subject,
      html,
      attachments,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || 'No se pudo enviar el correo');
  }

  return {
    delivered: true,
    mode: 'resend',
    messageId: payload?.id,
  };
}

export function buildPasswordResetLink(token) {
  const baseUrl = getBaseUrl().replace(/\/$/, '');
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export function emailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendPasswordResetEmail({ to, name, token }) {
  const resetLink = buildPasswordResetLink(token);
  const appName = getAppName();
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

  const result = await sendHtmlEmail({ to, subject, html, appName });

  return {
    ...result,
    resetLink,
  };
}

export async function sendSaleInvoiceEmail({ to, customerName, sale, companySettings }) {
  const appName = String(companySettings?.companyName || getAppName()).trim() || getAppName();
  const subject = `${appName} - Factura ${sale.saleNumber || sale.id}`;
  const lines = Array.isArray(sale.lines) ? sale.lines : [];
  const invoiceNumber = escapeHtml(sale.saleNumber || sale.id);
  const invoiceDate = new Date(sale.date).toLocaleDateString('es-ES');
  const customer = escapeHtml(customerName || 'Cliente general');
  const customerMail = escapeHtml(to);
  const address = escapeHtml(companySettings?.address || 'Dirección no disponible');
  const country = companySettings?.country ? escapeHtml(companySettings.country) : '';
  const phone = companySettings?.phone ? `Tel: ${escapeHtml(companySettings.phone)}` : '';
  const email = companySettings?.email ? `Email: ${escapeHtml(companySettings.email)}` : '';
  const resumen = [
    { label: 'Subtotal', value: formatCurrency(sale.subtotal) },
    { label: 'Descuento', value: formatCurrency(sale.discountAmount) },
    { label: 'IVA', value: formatCurrency(sale.tax) },
    { label: 'Total', value: formatCurrency(sale.total), bold: true },
  ];
  const rows = lines.length > 0
    ? lines.map((line, idx) => `
        <tr style="background:${idx%2===0?'#fff':'#f8fafc'};">
          <td style="padding:10px 8px;border:1px solid #dbe4ea;">${escapeHtml(line.productName)}</td>
          <td style="padding:10px 8px;border:1px solid #dbe4ea;text-align:center;">${Number(line.quantity || 0)}</td>
          <td style="padding:10px 8px;border:1px solid #dbe4ea;text-align:right;">${formatCurrency(line.unitPrice)}</td>
          <td style="padding:10px 8px;border:1px solid #dbe4ea;text-align:right;">${formatCurrency(line.lineTotal)}</td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="padding:10px;border:1px solid #dbe4ea;text-align:center;">Sin detalle disponible</td></tr>';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:0;color:#0f172a;background:#f8fafc;">
      <div style="background:#0f766e;border-radius:18px 18px 0 0;padding:24px 24px 12px 24px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
          <div>
            <h1 style="margin:0 0 8px;font-size:28px;color:#fff;">${appName}</h1>
            <p style="margin:0 0 4px;color:#dff7f4;">${address}</p>
            ${country ? `<p style=\"margin:0 0 4px;color:#dff7f4;\">${country}</p>` : ''}
            ${(phone || email) ? `<p style=\"margin:0;color:#dff7f4;\">${[phone,email].filter(Boolean).join('  |  ')}</p>` : ''}
          </div>
          <div style="text-align:right;">
            <h2 style="margin:0 0 8px;font-size:22px;color:#0f766e;background:#e2f3f1;border-radius:10px;padding:4px 18px;display:inline-block;">FACTURA</h2>
            <p style="margin:0 0 4px;color:#dff7f4;">No. ${invoiceNumber}</p>
            <p style="margin:0;color:#dff7f4;">Fecha: ${invoiceDate}</p>
          </div>
        </div>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 18px 18px;padding:24px;">
        <div style="display:flex;gap:18px;margin-bottom:18px;">
          <div style="flex:1 1 0;background:#f8fafc;border-radius:10px;padding:14px 18px 10px 18px;border:1px solid #dbe4ea;">
            <div style="font-size:11px;color:#64748b;font-weight:bold;">Cliente</div>
            <div style="font-size:15px;font-weight:bold;margin-bottom:2px;">${customer}</div>
            <div style="font-size:12px;color:#334155;">${customerMail}</div>
          </div>
          <div style="flex:1 1 0;background:#f8fafc;border-radius:10px;padding:14px 18px 10px 18px;border:1px solid #dbe4ea;">
            <div style="font-size:11px;color:#64748b;font-weight:bold;">Datos de emisión</div>
            <div style="font-size:13px;font-weight:bold;margin-bottom:2px;">${appName}</div>
            <div style="font-size:12px;color:#334155;">${invoiceDate}</div>
          </div>
        </div>
        <p style="margin:0 0 16px;font-size:15px;">Hola <b>${customer}</b>, te compartimos la factura de tu compra.</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;background:#fff;">
          <thead>
            <tr style="background:#e2f3f1;">
              <th style="padding:10px 8px;border:1px solid #dbe4ea;text-align:left;">Producto</th>
              <th style="padding:10px 8px;border:1px solid #dbe4ea;text-align:center;">Cant.</th>
              <th style="padding:10px 8px;border:1px solid #dbe4ea;text-align:right;">P/U</th>
              <th style="padding:10px 8px;border:1px solid #dbe4ea;text-align:right;">Importe</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="max-width:320px;margin-left:auto;margin-bottom:18px;background:#f8fafc;border-radius:10px;padding:16px 18px 10px 18px;border:1px solid #dbe4ea;">
          <div style="font-size:13px;font-weight:bold;color:#0f766e;margin-bottom:8px;">Resumen</div>
          ${resumen.map(r => `<div style=\"display:flex;justify-content:space-between;margin-bottom:6px;font-size:${r.bold?'17px':'13px'};font-weight:${r.bold?'bold':'normal'};color:${r.bold?'#0f172a':'#334155'};\"><span>${r.label}</span><span>${r.value}</span></div>`).join('')}
        </div>
        <div style="text-align:center;margin-top:18px;">
          <div style="font-size:12px;font-weight:bold;color:#0f766e;">Gracias por su compra.</div>
          <div style="font-size:10px;color:#64748b;">Documento generado automáticamente por el sistema de facturación.</div>
        </div>
      </div>
    </div>
  `;

  const pdfBuffer = await generateSaleInvoicePdfBuffer({
    sale,
    customerName,
    customerEmail: to,
    companySettings,
  });

  const attachments = [
    {
      filename: `Factura-${sale.saleNumber || sale.id}.pdf`,
      content: pdfBuffer.toString('base64'),
    },
  ];

  return sendHtmlEmail({ to, subject, html, appName, attachments });
}