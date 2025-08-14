const PDFDocument = require('pdfkit');
const Orden = require('../models/Orden');
const Stock = require('../models/Stock');

exports.generateOrdenPDF = async (req, res) => {
  try {
    const orden = await Orden.findById(req.params.id)
      .populate('deposito')
      .populate('creado_por')
      .populate('cotizado_por')
      .populate('aprobado_por')
      .populate('rechazado_por');
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orden_${orden._id}.pdf`);
    doc.pipe(res);

    // Título
    doc.fontSize(20).text('Orden de Compra', { align: 'center' });
    doc.moveDown();

    // Información de la orden
    doc.fontSize(12);
    doc.text(`Orden #${orden._id}`, { align: 'left' });
    doc.text(`Proyecto: ${orden.proyecto}`, { align: 'left' });
    doc.text(`Ubicación: ${orden.ubicacion}`, { align: 'left' });
    doc.text(`Depósito: ${orden.deposito?.nombre || 'Desconocido'}`, { align: 'left' });
    doc.text(`Estado: ${orden.estado}`, { align: 'left' });
    doc.text(`Creado por: ${orden.creado_por?.username || 'Desconocido'}`, { align: 'left' });
    if (orden.cotizado_por) doc.text(`Cotizado por: ${orden.cotizado_por?.username || 'Desconocido'}`, { align: 'left' });
    if (orden.comentarios_cotizacion) doc.text(`Comentarios: ${orden.comentarios_cotizacion}`, { align: 'left' });
    if (orden.aprobado_por) doc.text(`Aprobado por: ${orden.aprobado_por?.username || 'Desconocido'}`, { align: 'left' });
    if (orden.rechazado_por) doc.text(`Rechazado por: ${orden.rechazado_por?.username || 'Desconocido'}`, { align: 'left' });
    if (orden.razon_rechazo) doc.text(`Razón del rechazo: ${orden.razon_rechazo}`, { align: 'left' });
    if (orden.facturas?.length) doc.text(`Facturas: ${orden.facturas.join(', ')}`, { align: 'left' });
    doc.moveDown();

    // Tabla de ítems
    const tableTop = doc.y;
    const tableLeft = 50;
    const columnWidths = [200, 60, 80, 80, 100];
    const headers = ['Descripción', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal'];

    // Dibujar encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
        width: columnWidths[i],
        align: i === 0 ? 'left' : 'right'
      });
    });

    // Dibujar líneas horizontales y verticales
    doc.moveTo(tableLeft, tableTop).lineTo(tableLeft + 520, tableTop).stroke();
    doc.moveTo(tableLeft, tableTop + 20).lineTo(tableLeft + 520, tableTop + 20).stroke();
    let x = tableLeft;
    for (let i = 0; i <= columnWidths.length; i++) {
      doc.moveTo(x, tableTop).lineTo(x, tableTop + 20).stroke();
      x += columnWidths[i] || 0;
    }

    // Dibujar filas
    doc.font('Helvetica').fontSize(10);
    let y = tableTop + 20;
    orden.items.forEach(item => {
      doc.text(item.descripcion, tableLeft, y, { width: columnWidths[0], align: 'left' });
      doc.text(item.cantidad.toString(), tableLeft + columnWidths[0], y, { width: columnWidths[1], align: 'right' });
      doc.text(item.unidad_medida, tableLeft + columnWidths[0] + columnWidths[1], y, { width: columnWidths[2], align: 'right' });
      doc.text(`$${item.precio_unitario?.toFixed(2) || '0.00'}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { width: columnWidths[3], align: 'right' });
      doc.text(`$${item.subtotal?.toFixed(2) || '0.00'}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y, { width: columnWidths[4], align: 'right' });
      y += 20;
      doc.moveTo(tableLeft, y).lineTo(tableLeft + 520, y).stroke();
      x = tableLeft;
      for (let i = 0; i <= columnWidths.length; i++) {
        doc.moveTo(x, y - 20).lineTo(x, y).stroke();
        x += columnWidths[i] || 0;
      }
    });

    // Total estimado
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total Estimado: $${orden.total_estimado?.toFixed(2) || '0.00'}`, { align: 'right' });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

exports.generateStockPDF = async (req, res) => {
  try {
    const stock = await Stock.find().populate('deposito');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_report.pdf');
    doc.pipe(res);

    // Título
    doc.fontSize(20).text('Informe de Stock', { align: 'center' });
    doc.moveDown();

    // Tabla de stock
    const tableTop = doc.y;
    const tableLeft = 50;
    const columnWidths = [200, 100, 100, 100];
    const headers = ['Producto', 'Código', 'Cantidad', 'Depósito'];

    // Dibujar encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
        width: columnWidths[i],
        align: 'left'
      });
    });

    // Dibujar líneas horizontales y verticales
    doc.moveTo(tableLeft, tableTop).lineTo(tableLeft + 500, tableTop).stroke();
    doc.moveTo(tableLeft, tableTop + 20).lineTo(tableLeft + 500, tableTop + 20).stroke();
    let x = tableLeft;
    for (let i = 0; i <= columnWidths.length; i++) {
      doc.moveTo(x, tableTop).lineTo(x, tableTop + 20).stroke();
      x += columnWidths[i] || 0;
    }

    // Dibujar filas
    doc.font('Helvetica').fontSize(10);
    let y = tableTop + 20;
    stock.forEach(item => {
      doc.text(item.nombre, tableLeft, y, { width: columnWidths[0], align: 'left' });
      doc.text(item.codigo, tableLeft + columnWidths[0], y, { width: columnWidths[1], align: 'left' });
      doc.text(item.cantidad.toString(), tableLeft + columnWidths[0] + columnWidths[1], y, { width: columnWidths[2], align: 'left' });
      doc.text(item.deposito?.nombre || 'Desconocido', tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { width: columnWidths[3], align: 'left' });
      y += 20;
      doc.moveTo(tableLeft, y).lineTo(tableLeft + 500, y).stroke();
      x = tableLeft;
      for (let i = 0; i <= columnWidths.length; i++) {
        doc.moveTo(x, y - 20).lineTo(x, y).stroke();
        x += columnWidths[i] || 0;
      }
    });

    doc.end();
  } catch (err) {
    res.status(500).json({ error: 'Error al generar PDF de stock' });
  }
};