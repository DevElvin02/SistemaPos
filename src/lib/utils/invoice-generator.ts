import { getOrderStatusLabel, Order, type OrderLine } from '../data/orders'

export interface InvoiceData {
  order: Order
  customerName: string
  customerEmail: string
  cashierName?: string
  companyName: string
  companyAddress: string
  companyEmail?: string
  companyPhone?: string
  companyCountry?: string
  invoiceDate: string
}

const TAX_RATE = 0.0

const formatCurrency = (value: number) => `$${Number(value || 0).toFixed(2)}`

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

function getOrderLines(order: Order): OrderLine[] {
  if (Array.isArray(order.lines) && order.lines.length > 0) {
    return order.lines.map((line) => ({
      ...line,
      baseTotal: Number(line.baseTotal ?? line.quantity * line.unitPrice),
      discountPercent: Number(line.discountPercent ?? 0),
      discountAmount: Number(line.discountAmount ?? 0),
      lineTotal: Number(line.lineTotal ?? line.quantity * line.unitPrice),
    }))
  }

  return []
}

function getOrderTotals(order: Order) {
  const lines = getOrderLines(order)
  const grossSubtotal = Number(lines.reduce((sum, line) => sum + Number(line.baseTotal || line.lineTotal || 0), 0).toFixed(2))
  const discountAmount = Number(lines.reduce((sum, line) => sum + Number(line.discountAmount || 0), 0).toFixed(2))
  const subtotal = Number((order.subtotal ?? (grossSubtotal - discountAmount)).toFixed(2))
  const taxAmount = Number((order.tax ?? (order.amount - subtotal)).toFixed(2))
  const totalAmount = Number(order.amount.toFixed(2))
  const totalItems = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0)
  const hasTax = Math.abs(taxAmount) >= 0.01
  const hasDiscount = Math.abs(discountAmount) >= 0.01

  return { lines, grossSubtotal, subtotal, discountAmount, taxAmount, totalAmount, totalItems, hasTax, hasDiscount }
}

function getOrderPayment(order: Order) {
  const method = String(order.payment?.method ?? 'cash').toLowerCase()
  const received = Number(order.payment?.received ?? order.amount ?? 0)
  const change = Number(order.payment?.change ?? 0)
  const showPaymentBreakdown = method === 'cash' && (received > 0 || change > 0)

  return {
    method,
    received,
    change,
    showPaymentBreakdown,
  }
}

function getOrderStatusText(order: Order) {
  return escapeHtml(getOrderStatusLabel(order.status))
}

export const generateInvoiceHTML = (invoiceData: InvoiceData): string => {
  const { order, customerName, customerEmail, cashierName, companyName, companyAddress, companyEmail, companyPhone, companyCountry } = invoiceData
  const { lines, grossSubtotal, subtotal, discountAmount, taxAmount, totalAmount, totalItems, hasTax, hasDiscount } = getOrderTotals(order)
  const statusText = getOrderStatusText(order)
  const lineRows = lines.length > 0
    ? lines.map((line) => `
            <tr>
              <td class="qty-cell">${line.quantity}</td>
              <td class="description-cell">${escapeHtml(line.productName)}${Number(line.discountPercent || 0) > 0 ? `<div class="line-meta">Desc. ${Number(line.discountPercent || 0).toFixed(2)}% (-${formatCurrency(Number(line.discountAmount || 0))})</div>` : ''}</td>
              <td class="money-cell">${formatCurrency(line.unitPrice)}</td>
              <td class="money-cell">${formatCurrency(line.lineTotal)}</td>
            </tr>
          `).join('')
    : `
            <tr>
              <td class="empty-row" colspan="4">No se encontraron items para esta venta.</td>
            </tr>
          `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura #${order.id}</title>
      <style>
        @page {
          size: Letter;
          margin: 12mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          color: #111;
          background: white;
        }
        .invoice-container {
          width: 100%;
          max-width: 816px;
          margin: 0 auto;
          padding: 20px 24px;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 28px;
          border-bottom: 1px solid #8f8f8f;
          padding-bottom: 16px;
        }
        .company-info h1 {
          color: #111;
          font-size: 26px;
          margin-bottom: 8px;
          letter-spacing: 0.02em;
        }
        .company-info p {
          font-size: 13px;
          color: #444;
          margin-bottom: 4px;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h2 {
          font-size: 22px;
          color: #111;
          margin-bottom: 6px;
          letter-spacing: 0.08em;
        }
        .invoice-title p {
          font-size: 13px;
          color: #444;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 22px;
          margin-bottom: 24px;
        }
        .detail-section h3 {
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: bold;
          letter-spacing: 0.05em;
        }
        .detail-section p {
          font-size: 13px;
          color: #111;
          margin-bottom: 4px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 18px;
          border: 1px solid #b5b5b5;
        }
        .items-table thead {
          background-color: #fafafa;
        }
        .items-table th,
        .items-table td {
          border: 1px solid #b5b5b5;
          padding: 10px 12px;
          vertical-align: top;
        }
        .items-table th {
          font-size: 12px;
          font-weight: bold;
          color: #111;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        .items-table td {
          font-size: 13px;
          color: #111;
        }
        .qty-cell {
          width: 90px;
          text-align: center;
          font-weight: bold;
        }
        .description-cell {
          width: auto;
        }
        .line-meta {
          margin-top: 4px;
          font-size: 11px;
          color: #666;
        }
        .money-cell {
          width: 180px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        .empty-row {
          text-align: center;
          color: #666;
          padding: 18px 12px;
        }
        .summary-wrapper {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 26px;
        }
        .summary-table {
          width: 280px;
          border-collapse: separate;
          border-spacing: 0 6px;
          table-layout: fixed;
        }
        .summary-table td {
          padding: 2px 0;
          font-size: 14px;
        }
        .summary-label {
          text-align: right;
          color: #111;
          width: 55%;
          padding-right: 18px;
        }
        .summary-value {
          text-align: right;
          font-variant-numeric: tabular-nums;
          width: 45%;
        }
        .summary-table .total-row td {
          font-weight: bold;
          font-size: 18px;
          padding-top: 10px;
        }
        .summary-table .total-row .summary-label {
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #555;
          border-top: 1px solid #d0d0d0;
          padding-top: 16px;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .invoice-container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <div class="company-info">
            <h1>${companyName}</h1>
            <p>${companyAddress}</p>
            ${companyCountry ? `<p>${companyCountry}</p>` : ''}
            ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
            ${companyEmail ? `<p>Email: ${companyEmail}</p>` : ''}
            <p>NIT: 123456789-0</p>
          </div>
          <div class="invoice-title">
            <h2>FACTURA</h2>
            <p>#${String(order.id).padStart(6, '0')}</p>
            <p>Fecha: ${new Date(order.date).toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        <div class="invoice-details">
          <div class="detail-section">
            <h3>Cliente</h3>
            <p><strong>${customerName}</strong></p>
            <p>${customerEmail}</p>
          </div>
          <div class="detail-section">
            <h3>Condiciones de Pago</h3>
            <p><strong>Estado:</strong> ${statusText}</p>
            <p><strong>Items:</strong> ${totalItems}</p>
            <p><strong>Cajero:</strong> ${escapeHtml(cashierName || order.cashierName || 'Cajero no disponible')}</p>
          </div>
        </div>

        <table class="items-table">
          <colgroup>
            <col style="width: 92px;">
            <col>
            <col style="width: 170px;">
            <col style="width: 170px;">
          </colgroup>
          <thead>
            <tr>
              <th>Cant.</th>
              <th>Descripción</th>
              <th>Precio Unitario</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            ${lineRows}
          </tbody>
        </table>

        <div class="summary-wrapper">
          <table class="summary-table">
            <tr class="subtotal-row">
              <td class="summary-label">Subtotal</td>
              <td class="summary-value">${formatCurrency(grossSubtotal)}</td>
            </tr>
            ${hasDiscount ? `
            <tr class="tax-row">
              <td class="summary-label">Descuento total</td>
              <td class="summary-value">-${formatCurrency(discountAmount)}</td>
            </tr>
            <tr class="tax-row">
              <td class="summary-label">Subtotal con descuento</td>
              <td class="summary-value">${formatCurrency(subtotal)}</td>
            </tr>
            ` : ''}
            ${hasTax ? `
            <tr class="tax-row">
              <td class="summary-label">IVA</td>
              <td class="summary-value">${formatCurrency(taxAmount)}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td class="summary-label">TOTAL</td>
              <td class="summary-value">${formatCurrency(totalAmount)}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Gracias por su compra • Motorepuestos</p>
          <p style="margin-top: 10px; font-size: 11px;">Este documento fue generado automáticamente y es válido sin firma digital.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export const generateReceiptHTML = (invoiceData: InvoiceData): string => {
  const { order, customerName, cashierName, companyName, companyAddress, companyEmail, companyPhone, companyCountry } = invoiceData
  const { lines, grossSubtotal, subtotal, discountAmount, taxAmount, totalAmount, totalItems, hasTax, hasDiscount } = getOrderTotals(order)
  const { received, change, showPaymentBreakdown } = getOrderPayment(order)
  const statusText = getOrderStatusText(order)
  const itemRows = lines.length > 0
    ? lines.map((line) => `
          <tr>
            <td class="qty-cell">${line.quantity}</td>
            <td class="description-cell">${escapeHtml(line.productName)}${Number(line.discountPercent || 0) > 0 ? `<div class="line-meta">Desc. ${Number(line.discountPercent || 0).toFixed(2)}% (-${formatCurrency(Number(line.discountAmount || 0))})</div>` : ''}</td>
            <td class="money-cell">${formatCurrency(line.unitPrice)}</td>
            <td class="money-cell">${formatCurrency(line.lineTotal)}</td>
          </tr>
        `).join('')
    : `
          <tr>
            <td class="empty-row" colspan="4">No se encontraron items para esta venta.</td>
          </tr>
        `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Recibo #${order.id}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          color: #333;
          background: white;
        }
        .receipt-container {
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 4mm;
          background: white;
        }
        .receipt-header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 1px dashed #333;
          padding-bottom: 15px;
        }
        .receipt-header h1 {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .receipt-header p {
          font-size: 11px;
          color: #666;
          margin: 2px 0;
        }
        .receipt-number {
          font-weight: bold;
          font-size: 14px;
          margin: 10px 0;
        }
        .receipt-date {
          font-size: 11px;
          color: #666;
          margin-bottom: 15px;
        }
        .customer-info {
          margin-bottom: 15px;
          font-size: 12px;
        }
        .customer-info p {
          margin: 3px 0;
        }
        .separator {
          border-bottom: 1px dashed #333;
          margin: 10px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 14px;
        }
        .items-table th,
        .items-table td {
          border-bottom: 1px dashed #999;
          padding: 6px 2px;
          vertical-align: top;
        }
        .items-table th {
          font-size: 10px;
          text-transform: uppercase;
          text-align: left;
        }
        .qty-cell {
          width: 11mm;
          font-size: 10px;
          text-align: center;
        }
        .description-cell {
          width: auto;
          font-size: 10px;
          word-break: break-word;
        }
        .line-meta {
          margin-top: 2px;
          color: #666;
          font-size: 9px;
        }
        .money-cell {
          width: 18mm;
          font-size: 10px;
          text-align: right;
        }
        .empty-row {
          text-align: center;
          color: #666;
          font-size: 10px;
        }
        .totals {
          margin-bottom: 15px;
          font-size: 11px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .total-amount {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #333;
          font-weight: bold;
          font-size: 14px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #666;
          margin-top: 15px;
          border-top: 1px dashed #333;
          padding-top: 10px;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .receipt-container {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <h1>${companyName}</h1>
          <p>Sistema de Ventas</p>
          <p>${companyAddress}</p>
          ${companyCountry ? `<p>${companyCountry}</p>` : ''}
          ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
          ${companyEmail ? `<p>${companyEmail}</p>` : ''}
          <p>NIT: 123456789-0</p>
        </div>

        <div class="receipt-number">
          RECIBO #${String(order.id).padStart(6, '0')}
        </div>
        
        <div class="receipt-date">
          ${new Date(order.date).toLocaleDateString('es-ES')} ${new Date(order.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        </div>

        <div class="separator"></div>

        <div class="customer-info">
          <p><strong>Cliente:</strong> ${customerName}</p>
          <p><strong>Cajero:</strong> ${escapeHtml(cashierName || order.cashierName || 'Cajero no disponible')}</p>
          <p><strong>Estado:</strong> ${statusText}</p>
          <p><strong>Items:</strong> ${totalItems}</p>
        </div>

        <div class="separator"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th class="qty-cell">Cant.</th>
              <th class="description-cell">Descripcion</th>
              <th class="money-cell">P/U</th>
              <th class="money-cell">Importe</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="separator"></div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatCurrency(grossSubtotal)}</span>
          </div>
          ${hasDiscount ? `
          <div class="total-row">
            <span>Descuento total:</span>
            <span>-${formatCurrency(discountAmount)}</span>
          </div>
          <div class="total-row">
            <span>Subtotal desc.:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ` : ''}
          ${hasTax ? `
          <div class="total-row">
            <span>IVA:</span>
            <span>${formatCurrency(taxAmount)}</span>
          </div>
          ` : ''}
        </div>

        <div class="total-amount">
          <span>TOTAL:</span>
          <span>${formatCurrency(totalAmount)}</span>
        </div>

        ${showPaymentBreakdown ? `
        <div class="totals" style="margin-top: 10px; margin-bottom: 0;">
          <div class="total-row">
            <span>Recibido:</span>
            <span>${formatCurrency(received)}</span>
          </div>
          <div class="total-row">
            <span>Vuelto:</span>
            <span>${formatCurrency(change)}</span>
          </div>
        </div>
        ` : ''}

        <div class="footer">
          <p>Gracias por su compra</p>
          <p style="margin-top: 5px;">Motorepuestos</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export const downloadDocument = (html: string, filename: string) => {
  const element = document.createElement('a')
  const file = new Blob([html], { type: 'text/html' })
  element.href = URL.createObjectURL(file)
  element.download = filename
  document.body.appendChild(element)
  element.click()
  document.body.removeChild(element)
  URL.revokeObjectURL(element.href)
}

export const printDocument = (html: string) => {
  const popup = window.open('', '_blank', 'width=1100,height=760')
  if (!popup) {
    throw new Error('No se pudo abrir la vista previa de impresion')
  }

  const file = new Blob([html], { type: 'text/html' })
  const previewUrl = URL.createObjectURL(file)
  const titleMatch = html.match(/<title>(.*?)<\/title>/i)
  const previewTitle = titleMatch?.[1] || 'Vista previa de impresion'

  popup.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${previewTitle}</title>
        <style>
          :root {
            color-scheme: light;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            color: #111;
          }
          .preview-toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            background: #ffffff;
          }
          .preview-title {
            font-size: 16px;
            font-weight: 700;
          }
          .preview-actions {
            display: flex;
            gap: 10px;
          }
          .preview-button {
            border: 0;
            border-radius: 10px;
            padding: 10px 14px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }
          .preview-button.primary {
            background: #f97316;
            color: #fff;
          }
          .preview-button.secondary {
            background: #e5e7eb;
            color: #111;
          }
          .preview-frame {
            display: block;
            width: 100%;
            height: calc(100vh - 65px);
            border: 0;
            background: #fff;
          }
          @media print {
            .preview-toolbar {
              display: none;
            }
            .preview-frame {
              height: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="preview-toolbar">
          <div class="preview-title">${previewTitle}</div>
          <div class="preview-actions">
            <button class="preview-button secondary" type="button" id="open-document">Abrir documento</button>
            <button class="preview-button primary" type="button" id="print-document">Imprimir</button>
            <button class="preview-button secondary" type="button" id="close-preview">Cerrar</button>
          </div>
        </div>
        <iframe class="preview-frame" id="preview-frame" src="${previewUrl}"></iframe>
        <script>
          const previewUrl = ${JSON.stringify(previewUrl)};
          const frame = document.getElementById('preview-frame');
          const printButton = document.getElementById('print-document');
          const openButton = document.getElementById('open-document');
          const closeButton = document.getElementById('close-preview');

          printButton.addEventListener('click', () => {
            if (frame && frame.contentWindow) {
              frame.contentWindow.focus();
              frame.contentWindow.print();
            }
          });

          openButton.addEventListener('click', () => {
            window.open(previewUrl, '_blank');
          });

          closeButton.addEventListener('click', () => {
            window.close();
          });

          window.addEventListener('beforeunload', () => {
            window.opener = null;
          });
        </script>
      </body>
    </html>
  `)
  popup.document.close()
  popup.addEventListener('beforeunload', () => {
    URL.revokeObjectURL(previewUrl)
  })
}

// ─── Recibo en TEXTO PLANO (impresora térmica) ────────────────────────────────
/** Ancho de línea en caracteres: 24 ≈ zona imprimible real en rollo 57 mm con padding interno de 4 mm. Cambia a 40 para rollo de 80 mm. */
const TXT_W = 24

function txtCenter(text: string, w = TXT_W): string {
  // Si el texto cabe, centrarlo con espacios
  if (text.length <= w) {
    const pad = w - text.length
    return ' '.repeat(Math.floor(pad / 2)) + text
  }
  // Si no cabe, partir en palabras; si una palabra sola no cabe, corte duro
  const lines: string[] = []
  const words = text.split(' ')
  let cur = ''
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word
    if (candidate.length <= w) {
      cur = candidate
    } else {
      if (cur) { lines.push(cur); cur = '' }
      let rem = word
      while (rem.length > w) { lines.push(rem.slice(0, w)); rem = rem.slice(w) }
      cur = rem
    }
  }
  if (cur) lines.push(cur)
  return lines.map(l => txtCenter(l, w)).join('\n')
}

function txtRow(label: string, value: string, w = TXT_W): string {
  const spaces = w - label.length - value.length
  return label + ' '.repeat(Math.max(1, spaces)) + value
}

/** Genera líneas de un artículo en formato 2 líneas: nombre arriba, precio abajo a la derecha. */
function txtItemLines(qty: number, desc: string, pu: string, total: string, w = TXT_W): string[] {
  const COL_QTY = 3
  const COL_PU  = 6
  const COL_TOT = 7
  const PFX     = w - COL_PU - 1 - COL_TOT   // espacios antes del precio
  const maxDesc = w - COL_QTY - 1             // chars disponibles para descripción
  const result: string[] = []
  const chunks: string[] = []
  let rem = desc
  while (rem.length > 0) { chunks.push(rem.slice(0, maxDesc)); rem = rem.slice(maxDesc) }
  // Línea 1: cantidad + descripción
  result.push(`${String(qty).padStart(COL_QTY)} ${chunks[0] ?? ''}`)
  for (let i = 1; i < chunks.length; i++) result.push(`${' '.repeat(COL_QTY + 1)}${chunks[i]}`)
  // Línea 2: precio unitario y total alineados a la derecha
  result.push(`${' '.repeat(PFX)}${pu.padStart(COL_PU)} ${total.padStart(COL_TOT)}`)
  return result
}

export const generatePlainTextReceipt = (invoiceData: InvoiceData): string => {
  const { order, customerName, cashierName, companyName, companyAddress, companyEmail, companyPhone, companyCountry } = invoiceData
  const { lines, grossSubtotal, subtotal, discountAmount, taxAmount, totalAmount, totalItems, hasTax, hasDiscount } = getOrderTotals(order)
  const { received, change, showPaymentBreakdown } = getOrderPayment(order)
  const statusText = getOrderStatusLabel(order.status)
  const sep     = '-'.repeat(TXT_W)
  const dateStr = new Date(order.date).toLocaleDateString('es-ES')
  const timeStr = new Date(order.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const out: string[] = []

  // ── Encabezado ──────────────────────────────────────────────────────────────
  out.push(txtCenter(companyName))
  out.push(txtCenter('Sistema de Ventas'))
  if (companyAddress) companyAddress.split('\n').forEach(l => out.push(txtCenter(l.trim())))
  if (companyCountry) out.push(txtCenter(companyCountry))
  if (companyPhone)   out.push(txtCenter(`Tel: ${companyPhone}`))
  if (companyEmail)   out.push(txtCenter(companyEmail))
  out.push(txtCenter('NIT: 123456789-0'))
  out.push(sep)

  // ── Info del recibo ──────────────────────────────────────────────────────────
  out.push(`RECIBO #${order.id}`)
  out.push(`${dateStr} ${timeStr}`)
  out.push(sep)

  // ── Cliente / cajero ────────────────────────────────────────────────────────
  out.push(`Cliente: ${customerName}`)
  out.push(`Cajero:  ${cashierName || order.cashierName || 'Cajero no disponible'}`)
  out.push(`Estado:  ${statusText}`)
  out.push(`Items:   ${totalItems}`)
  out.push(sep)

  // ── Cabecera de artículos (2 líneas, igual que las filas de artículos) ────────
  const COL_QTY = 3
  const COL_PU  = 6
  const COL_TOT = 7
  const PFX     = TXT_W - COL_PU - 1 - COL_TOT
  out.push(`${'#'.padStart(COL_QTY)} DESCRIPCION`)
  out.push(`${'P/U'.padStart(PFX + COL_PU)} ${'IMPORTE'.padStart(COL_TOT)}`)
  out.push(sep)

  // ── Artículos ────────────────────────────────────────────────────────────────
  if (lines.length > 0) {
    for (const line of lines) {
      const desc  = String(line.productName || 'Producto')
      const pu    = formatCurrency(line.unitPrice ?? 0)
      const total = formatCurrency(line.lineTotal ?? 0)
      txtItemLines(line.quantity, desc, pu, total).forEach(l => out.push(l))
    }
  } else {
    out.push(txtCenter('(sin detalle de articulos)'))
  }
  out.push(sep)

  // ── Totales ──────────────────────────────────────────────────────────────────
  out.push(txtRow('Subtotal:', formatCurrency(grossSubtotal)))
  if (hasDiscount) {
    out.push(txtRow('Descuento:', `-${formatCurrency(discountAmount)}`))
    out.push(txtRow('Subtotal desc.:', formatCurrency(subtotal)))
  }
  if (hasTax) {
    out.push(txtRow('IVA:', formatCurrency(taxAmount)))
  }
  out.push(sep)
  out.push(txtRow('TOTAL:', formatCurrency(totalAmount)))
  if (showPaymentBreakdown) {
    out.push(txtRow('Recibido:', formatCurrency(received)))
    out.push(txtRow('Vuelto:', formatCurrency(change)))
  }

  out.push(sep)
  out.push(txtCenter('Gracias por su compra'))
  out.push(txtCenter(companyName))
  out.push(sep)
  return out.join('\n')
}

export const printPlainTextReceipt = (invoiceData: InvoiceData, onAfterPrint?: () => void): void => {
  const text = generatePlainTextReceipt(invoiceData)
  const popup = window.open('', '_blank', 'width=260,height=700')
  if (!popup) {
    throw new Error('Permite las ventanas emergentes para imprimir el ticket.')
  }
  const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  popup.document.write(`<!DOCTYPE html><html>
<head>
  <meta charset="UTF-8">
  <title>Ticket</title>
  <style>
    @page {
      size: 57mm auto;
      margin: 1mm 3.5mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html {
      width: 100%;
      background: #fff;
    }
    html, body {
      margin: 0;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      color: #000;
    }
    body {
      width: 50mm;
      margin: 0 auto;
      background: #fff;
    }
    pre {
      white-space: pre-wrap;
      word-break: break-word;
      width: 50mm;
      padding: 1mm 0 1mm 4mm;
    }
  </style>
</head>
<body><pre>${safeText}</pre></body>
</html>`)
  popup.document.close()
  popup.onload = () => {
    setTimeout(() => {
      popup.focus()
      popup.print()
      popup.onafterprint = () => { popup.close(); onAfterPrint?.() }
    }, 250)
  }
}

export const generateTicketPDF = async (invoiceData: InvoiceData, filename: string) => {
  // Performance: carga jspdf bajo demanda para no penalizar la carga inicial de la ruta de ventas.
  const { jsPDF } = await import('jspdf')
  const { order, customerName, cashierName, companyName, companyAddress, companyPhone, companyEmail, companyCountry } = invoiceData
  const { lines, grossSubtotal, subtotal, discountAmount, taxAmount, totalAmount, totalItems, hasTax, hasDiscount } = getOrderTotals(order)
  const { received, change, showPaymentBreakdown } = getOrderPayment(order)
  const statusText = getOrderStatusLabel(order.status)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const rightX = pageWidth - marginX
  const tableWidth = rightX - marginX
  const qtyWidth = 22
  const unitWidth = 44
  const totalWidth = 44
  const descWidth = tableWidth - qtyWidth - unitWidth - totalWidth
  const qtyX = marginX
  const descX = qtyX + qtyWidth
  const unitX = descX + descWidth
  const totalX = unitX + unitWidth
  let y = 16

  const ensureSpace = (requiredHeight = 8) => {
    if (y + requiredHeight <= pageHeight - 16) return
    doc.addPage()
    y = 16
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(companyName || 'MOTOREPUESTOS', marginX, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(companyAddress || 'Direccion no definida', marginX, y)
  y += 5
  if (companyCountry) {
    doc.text(companyCountry, marginX, y)
    y += 5
  }
  if (companyPhone) {
    doc.text(`Tel: ${companyPhone}`, marginX, y)
    y += 5
  }
  if (companyEmail) {
    doc.text(companyEmail, marginX, y)
    y += 5
  }
  doc.text('NIT: 123456789-0', marginX, y)

  y += 8
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('COMPROBANTE DE VENTA', rightX, y, { align: 'right' })

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Venta: ${order.orderNumber}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Fecha: ${new Date(order.date).toLocaleString('es-ES')}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Cliente: ${customerName}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Cajero: ${cashierName || order.cashierName || 'Cajero no disponible'}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Estado: ${statusText}`, rightX, y, { align: 'right' })
  y += 5
  doc.text(`Items: ${totalItems}`, rightX, y, { align: 'right' })

  y += 10

  const drawTableHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.rect(qtyX, y, qtyWidth, 14)
    doc.rect(descX, y, descWidth, 14)
    doc.rect(unitX, y, unitWidth, 14)
    doc.rect(totalX, y, totalWidth, 14)
    doc.text('CANT.', qtyX + qtyWidth / 2, y + 8.5, { align: 'center' })
    doc.text('DESCRIPCION', descX + descWidth / 2, y + 8.5, { align: 'center' })
    doc.text('PRECIO', unitX + unitWidth / 2, y + 6.2, { align: 'center' })
    doc.text('UNITARIO', unitX + unitWidth / 2, y + 10.5, { align: 'center' })
    doc.text('IMPORTE', totalX + totalWidth / 2, y + 8.5, { align: 'center' })
    y += 14
  }

  const drawAmountLine = (label: string, value: string, top: number, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.text(label, summaryLabelX + labelWidth - 2, top, { align: 'right' })
    doc.text(value, rightX, top, { align: 'right' })
  }

  drawTableHeader()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (lines.length === 0) {
    doc.rect(qtyX, y, tableWidth, 14)
    doc.text('No se encontraron items para esta venta.', pageWidth / 2, y + 8.5, { align: 'center' })
    y += 14
  } else {
    for (const line of lines) {
      const metaLabel = Number(line.discountPercent || 0) > 0
        ? `Desc. ${Number(line.discountPercent || 0).toFixed(2)}% (-${formatCurrency(Number(line.discountAmount || 0))})`
        : ''
      const nameLines = doc.splitTextToSize(line.productName, descWidth - 8)
      const metaLines = metaLabel ? doc.splitTextToSize(metaLabel, descWidth - 8) : []
      const rowHeight = Math.max(14, (nameLines.length * 5) + (metaLines.length * 4) + 6)
      ensureSpace(rowHeight + 40)

      if (y + rowHeight > pageHeight - 48) {
        doc.addPage()
        y = 16
        drawTableHeader()
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
      }

      doc.rect(qtyX, y, qtyWidth, rowHeight)
      doc.rect(descX, y, descWidth, rowHeight)
      doc.rect(unitX, y, unitWidth, rowHeight)
      doc.rect(totalX, y, totalWidth, rowHeight)

      doc.text(String(line.quantity), qtyX + qtyWidth / 2, y + rowHeight / 2 + 1.5, { align: 'center' })
      doc.text(nameLines, descX + 4, y + 6)
      if (metaLines.length > 0) {
        doc.setFontSize(8)
        doc.text(metaLines, descX + 4, y + 6 + nameLines.length * 5)
        doc.setFontSize(9)
      }
      doc.text(formatCurrency(line.unitPrice), unitX + unitWidth - 4, y + rowHeight / 2 + 1.5, { align: 'right' })
      doc.text(formatCurrency(line.lineTotal), totalX + totalWidth - 4, y + rowHeight / 2 + 1.5, { align: 'right' })
      y += rowHeight
    }
  }

  y += 6
  ensureSpace(showPaymentBreakdown ? 70 : hasTax || hasDiscount ? 54 : 30)

  const labelWidth = unitWidth
  const valueWidth = totalWidth
  const summaryX = rightX - (labelWidth + valueWidth)
  const summaryLabelX = summaryX

  doc.setFontSize(11)
  drawAmountLine('Subtotal', formatCurrency(grossSubtotal), y)
  y += 8

  if (hasDiscount) {
    drawAmountLine('Descuento total', `-${formatCurrency(discountAmount)}`, y)
    y += 8
    drawAmountLine('Subtotal desc.', formatCurrency(subtotal), y)
    y += 8
  }

  if (hasTax) {
    drawAmountLine('IVA', formatCurrency(taxAmount), y)
    y += 8
  }

  doc.setFontSize(15)
  drawAmountLine('TOTAL', formatCurrency(totalAmount), y, true)

  if (showPaymentBreakdown) {
    y += 8
    doc.setFontSize(11)
    drawAmountLine('Recibido', formatCurrency(received), y)
    y += 8
    drawAmountLine('Vuelto', formatCurrency(change), y)
  }

  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Gracias por su compra', pageWidth / 2, y, { align: 'center' })

  doc.save(filename)
}
