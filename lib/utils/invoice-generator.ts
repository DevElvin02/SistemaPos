import { Order } from '../data/orders'
import { customers } from '../data/customers'

export interface InvoiceData {
  order: Order
  customerName: string
  customerEmail: string
  companyName: string
  companyAddress: string
  invoiceDate: string
}

export const generateInvoiceHTML = (invoiceData: InvoiceData): string => {
  const { order, customerName, customerEmail, companyName, companyAddress } = invoiceData

  const taxRate = 0.13
  const subtotal = order.amount / (1 + taxRate)
  const taxAmount = order.amount - subtotal
  const totalAmount = order.amount

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura #${order.id}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Arial', sans-serif;
          color: #333;
          background: white;
        }
        .invoice-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 40px;
          background: white;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          border-bottom: 2px solid #1e40af;
          padding-bottom: 20px;
        }
        .company-info h1 {
          color: #1e40af;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .company-info p {
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h2 {
          font-size: 24px;
          color: #1e40af;
          margin-bottom: 5px;
        }
        .invoice-title p {
          font-size: 14px;
          color: #666;
        }
        .invoice-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 40px;
        }
        .detail-section h3 {
          font-size: 12px;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .detail-section p {
          font-size: 14px;
          color: #333;
          margin-bottom: 5px;
        }
        table {
          width: 100%;
          margin-bottom: 30px;
          border-collapse: collapse;
        }
        thead {
          background-color: #f3f4f6;
          border-top: 2px solid #1e40af;
          border-bottom: 2px solid #1e40af;
        }
        th {
          padding: 12px;
          text-align: left;
          font-size: 13px;
          font-weight: bold;
          color: #1e40af;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .summary {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 40px;
        }
        .summary-table {
          width: 300px;
        }
        .summary-table tr {
          height: 30px;
        }
        .summary-table td {
          padding: 8px 12px;
          border: none;
        }
        .summary-table td:first-child {
          text-align: right;
          color: #666;
        }
        .summary-table td:last-child {
          text-align: right;
          font-weight: bold;
        }
        .summary-table .total-row {
          background-color: #1e40af;
          color: white;
          font-size: 16px;
        }
        .summary-table .total-row td {
          color: white;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #999;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
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
            <h1>MOTO REPUESTOS</h1>
            <p>${companyAddress}</p>
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
            <p><strong>Estado:</strong> ${order.status}</p>
            <p><strong>Fecha de Vencimiento:</strong> ${new Date(new Date(order.date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-ES')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th style="text-align: right;">Cantidad</th>
              <th style="text-align: right;">Valor Unit.</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Venta de Productos</td>
              <td style="text-align: right;">1</td>
              <td style="text-align: right;">$${subtotal.toFixed(2)}</td>
              <td style="text-align: right;">$${subtotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="summary">
          <table class="summary-table">
            <tr>
              <td>Subtotal:</td>
              <td>$${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>IVA (13%):</td>
              <td>$${taxAmount.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td><strong>TOTAL:</strong></td>
              <td><strong>$${totalAmount.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Gracias por su compra • www.motorepuestos.com</p>
          <p style="margin-top: 10px; font-size: 11px;">Este documento fue generado automáticamente y es válido sin firma digital.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

export const generateReceiptHTML = (invoiceData: InvoiceData): string => {
  const { order, customerName, companyName } = invoiceData

  const taxRate = 0.13
  const subtotal = order.amount / (1 + taxRate)
  const taxAmount = order.amount - subtotal
  const totalAmount = order.amount

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Recibo #${order.id}</title>
      <style>
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
          max-width: 400px;
          margin: 0 auto;
          padding: 20px;
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
        .items {
          margin-bottom: 15px;
          font-size: 11px;
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin: 5px 0;
        }
        .item-desc {
          flex: 1;
        }
        .item-price {
          text-align: right;
          min-width: 80px;
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
          <h1>MOTO REPUESTOS</h1>
          <p>Sistema de Ventas</p>
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
          <p><strong>Estado:</strong> ${order.status}</p>
        </div>

        <div class="separator"></div>

        <div class="items">
          <div class="item-row">
            <div class="item-desc"><strong>Descripción</strong></div>
            <div class="item-price"><strong>Valor</strong></div>
          </div>
          <div style="border-bottom: 1px solid #ddd; margin: 5px 0;"></div>
          <div class="item-row">
            <div class="item-desc">Venta de Productos</div>
            <div class="item-price">$${subtotal.toFixed(2)}</div>
          </div>
        </div>

        <div class="separator"></div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span>IVA (13%):</span>
            <span>$${taxAmount.toFixed(2)}</span>
          </div>
        </div>

        <div class="total-amount">
          <span>TOTAL:</span>
          <span>$${totalAmount.toFixed(2)}</span>
        </div>

        <div class="footer">
          <p>Gracias por su compra</p>
          <p style="margin-top: 5px;">www.motorepuestos.com</p>
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
