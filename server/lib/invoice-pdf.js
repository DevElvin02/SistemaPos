import PDFDocument from 'pdfkit';

function formatCurrency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function safeText(value) {
  return String(value ?? '').trim();
}

function formatDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES');
}

function drawLabelValue(doc, { x, y, label, value, width, align = 'left' }) {
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text(label, x, y, { width, align });
  doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(value, x, y + 12, { width, align });
}

function drawSectionCard(doc, { x, y, width, height, title, rows }) {
  doc.roundedRect(x, y, width, height, 10).fillAndStroke('#ffffff', '#dbe4ea');
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f766e').text(title, x + 14, y + 12, { width: width - 28 });

  let currentY = y + 34;
  for (const row of rows) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text(row.label, x + 14, currentY, { width: width - 28 });
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(row.value, x + 14, currentY + 11, { width: width - 28 });
    currentY += row.spacing ?? 28;
  }
}

export function generateSaleInvoicePdfBuffer({ sale, customerName, customerEmail, companySettings }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const appName = safeText(companySettings?.companyName) || 'Motorepuestos La Bendicion';
    const address = safeText(companySettings?.address) || 'A un costado de la clinica de Nhauterique';
    const country = safeText(companySettings?.country);
    const phone = safeText(companySettings?.phone);
    const email = safeText(companySettings?.email);
    const lines = Array.isArray(sale.lines) ? sale.lines : [];
    const invoiceNumber = safeText(sale.saleNumber || sale.id);
    const customer = safeText(customerName) || 'Cliente general';
    const customerMail = safeText(customerEmail) || 'Correo no disponible';
    const invoiceDate = formatDate(sale.date) || formatDate(new Date());
    const pageWidth = doc.page.width;
    const left = 40;
    const contentWidth = pageWidth - 80;
    const right = left + contentWidth;
    const brandColor = '#0f766e';
    const accentColor = '#e2f3f1';

    doc.rect(0, 0, pageWidth, 118).fill(brandColor);
    doc.roundedRect(right - 170, 26, 130, 66, 14).fill(accentColor);

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff').text(appName, left, 28, { width: 320 });
    doc.font('Helvetica').fontSize(10).fillColor('#dff7f4').text(address, left, 60, { width: 320 });
    if (country) {
      doc.text(country, left, 74, { width: 320 });
    }
    if (phone || email) {
      doc.text([phone ? `Tel: ${phone}` : '', email ? `Email: ${email}` : ''].filter(Boolean).join('  |  '), left, 88, { width: 360 });
    }

    doc.font('Helvetica-Bold').fontSize(18).fillColor(brandColor).text('FACTURA', right - 155, 38, { width: 100, align: 'center' });
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(`No. ${invoiceNumber}`, right - 155, 61, { width: 100, align: 'center' });
    doc.text(invoiceDate, right - 155, 75, { width: 100, align: 'center' });

    drawLabelValue(doc, {
      x: left,
      y: 136,
      label: 'Documento',
      value: 'Factura de venta',
      width: 160,
    });
    drawLabelValue(doc, {
      x: left + 180,
      y: 136,
      label: 'Generada el',
      value: invoiceDate,
      width: 140,
    });
    drawLabelValue(doc, {
      x: right - 150,
      y: 136,
      label: 'Referencia',
      value: invoiceNumber,
      width: 150,
      align: 'right',
    });

    const cardsY = 178;
    const cardGap = 18;
    const cardWidth = (contentWidth - cardGap) / 2;
    const cardHeight = 102;

    drawSectionCard(doc, {
      x: left,
      y: cardsY,
      width: cardWidth,
      height: cardHeight,
      title: 'Cliente',
      rows: [
        { label: 'Nombre', value: customer },
        { label: 'Correo', value: customerMail },
      ],
    });

    drawSectionCard(doc, {
      x: left + cardWidth + cardGap,
      y: cardsY,
      width: cardWidth,
      height: cardHeight,
      title: 'Datos de emision',
      rows: [
        { label: 'Empresa', value: appName },
        { label: 'Fecha', value: invoiceDate },
      ],
    });

    const tableTop = cardsY + cardHeight + 28;
    const col1 = left + 14;
    const col2 = left + 278;
    const col3 = left + 352;
    const col4 = left + 448;

    doc.roundedRect(left, tableTop, contentWidth, 28, 8).fill(brandColor);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
    doc.text('Producto', col1, tableTop + 9, { width: 220 });
    doc.text('Cant.', col2, tableTop + 9, { width: 45, align: 'center' });
    doc.text('P/U', col3, tableTop + 9, { width: 70, align: 'right' });
    doc.text('Importe', col4, tableTop + 9, { width: 85, align: 'right' });

    let y = tableTop + 38;
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a');

    if (lines.length === 0) {
      doc.roundedRect(left, y - 6, contentWidth, 32, 8).fillAndStroke('#ffffff', '#dbe4ea');
      doc.text('Sin detalle disponible', col1, y + 3, { width: contentWidth - 28 });
      y += 42;
    } else {
      lines.forEach((line, index) => {
        const productName = safeText(line.productName) || 'Producto';
        const rowHeight = Math.max(doc.heightOfString(productName, { width: 220 }), 16) + 16;
        doc.roundedRect(left, y - 6, contentWidth, rowHeight, 8).fillAndStroke(index % 2 === 0 ? '#ffffff' : '#f8fafc', '#dbe4ea');
        doc.fillColor('#0f172a').text(productName, col1, y + 2, { width: 220 });
        doc.text(String(Number(line.quantity || 0)), col2, y + 2, { width: 45, align: 'center' });
        doc.text(formatCurrency(line.unitPrice), col3, y + 2, { width: 70, align: 'right' });
        doc.text(formatCurrency(line.lineTotal), col4, y + 2, { width: 85, align: 'right' });
        y += rowHeight + 8;
      });
    }

    const summaryWidth = 210;
    const summaryX = right - summaryWidth;
    const summaryY = y + 10;
    doc.roundedRect(summaryX, summaryY, summaryWidth, 108, 12).fillAndStroke('#f8fafc', '#cbd5e1');
    doc.font('Helvetica-Bold').fontSize(11).fillColor(brandColor).text('Resumen', summaryX + 16, summaryY + 14, { width: summaryWidth - 32 });

    y = summaryY + 40;
    const labelWidth = 90;
    const valueWidth = summaryWidth - 32 - labelWidth;
    const writeTotal = (label, value, isBold = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(isBold ? 12 : 10).fillColor(isBold ? '#0f172a' : '#334155');
      doc.text(label, summaryX + 16, y, { width: labelWidth, align: 'left' });
      doc.text(formatCurrency(value), summaryX + 16 + labelWidth, y, { width: valueWidth, align: 'right' });
      y += isBold ? 20 : 16;
    };

    writeTotal('Subtotal', sale.subtotal);
    writeTotal('Descuento', sale.discountAmount);
    writeTotal('IVA', sale.tax);
    doc.moveTo(summaryX + 16, y - 4).lineTo(summaryX + summaryWidth - 16, y - 4).strokeColor('#cbd5e1').stroke();
    y += 4;
    writeTotal('Total', sale.total, true);

    const footerY = Math.max(y + 20, summaryY + 128);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(brandColor).text('Gracias por su compra.', left, footerY, { width: contentWidth, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor('#64748b').text('Documento generado automaticamente por el sistema de facturacion.', left, footerY + 14, { width: contentWidth, align: 'center' });

    doc.end();
  });
}