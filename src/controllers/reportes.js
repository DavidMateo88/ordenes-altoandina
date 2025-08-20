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
    doc.fontSize(20).text('Alto Andina SRL', { align: 'center' });
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
    const cellHeight = 20;
    const fontSize = 10;
    const verticalOffset = (cellHeight - fontSize) / 2; // 5 unidades

    // Dibujar encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(header, tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
        width: columnWidths[i],
        align: 'center'
      });
    });

    // Dibujar líneas horizontales y verticales
    doc.moveTo(tableLeft, tableTop).lineTo(tableLeft + 520, tableTop).stroke();
    doc.moveTo(tableLeft, tableTop + 20).lineTo(tableLeft + 520, tableTop + 20).stroke();
    let x = tableLeft;
    for (let i = 0; i <= columnWidths.length; i++) {
      doc.moveTo(x, tableTop).lineTo(x, tableTop + cellHeight).stroke();
      x += columnWidths[i] || 0;
    }

    // Dibujar filas
   doc.font('Helvetica').fontSize(fontSize);
    let y = tableTop + cellHeight;
    orden.items.forEach(item => {
      doc.text(item.descripcion, tableLeft, y + verticalOffset, { width: columnWidths[0], align: 'center' });
      doc.text(item.cantidad.toString(), tableLeft + columnWidths[0], y + verticalOffset, { width: columnWidths[1], align: 'center' });
      doc.text(item.unidad_medida, tableLeft + columnWidths[0] + columnWidths[1], y + verticalOffset, { width: columnWidths[2], align: 'center' });
      doc.text(`$${item.precio_unitario?.toFixed(2) || '0.00'}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2], y + verticalOffset, { width: columnWidths[3], align: 'center' });
      doc.text(`$${item.subtotal?.toFixed(2) || '0.00'}`, tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y + verticalOffset, { width: columnWidths[4], align: 'center' });
      y += cellHeight;
      doc.moveTo(tableLeft, y).lineTo(tableLeft + 520, y).stroke();
      x = tableLeft;
      for (let i = 0; i <= columnWidths.length; i++) {
        doc.moveTo(x, y - cellHeight).lineTo(x, y).stroke();
        x += columnWidths[i] || 0;
      }
    });

    // Total estimado
    doc.moveDown();
    doc.font('Helvetica-Bold').text(`Total Estimado: $${orden.total_estimado?.toFixed(2) || '0.00'}`, { align: 'right' });

    doc.end();
  } catch (err) {
    console.error('Error al generar PDF:', err);
    res.status(500).json({ error: 'Error al generar PDF', details: err.message });
  }
};

exports.generateStockPDF = async (req, res) => {
  try {
    const stock = await Stock.find().populate('deposito');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stock_report.pdf`);
    doc.pipe(res);

    // Título
    doc.fontSize(20).text('Informe de Stock', { align: 'center' });
    doc.moveDown();

    // Tabla de stock
    const tableTop = doc.y;
    const tableLeft = 50;
    const columnWidths = [200, 100, 100, 100];
    const headers = ['Producto', 'Código', 'Cantidad', 'Depósito'];
    const cellHeight = 20;
    const fontSize = 10;
    const verticalOffset = (cellHeight - fontSize) / 2; // 5 unidades

    // Dibujar encabezados
    doc.fontSize(fontSize).font('Helvetica-Bold');
    headers.forEach((header, i) => {
      doc.text(
        header,
        tableLeft + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
        tableTop + verticalOffset,
        {
          width: columnWidths[i],
          align: 'center'
        }
      );
    });

    // Dibujar líneas horizontales y verticales para encabezados
    doc.moveTo(tableLeft, tableTop).lineTo(tableLeft + 500, tableTop).stroke();
    doc.moveTo(tableLeft, tableTop + cellHeight).lineTo(tableLeft + 500, tableTop + cellHeight).stroke();
    let x = tableLeft;
    for (let i = 0; i <= columnWidths.length; i++) {
      doc.moveTo(x, tableTop).lineTo(x, tableTop + cellHeight).stroke();
      x += columnWidths[i] || 0;
    }

    // Dibujar filas
    doc.font('Helvetica').fontSize(fontSize);
    let y = tableTop + cellHeight;
    stock.forEach(item => {
      doc.text(item.nombre, tableLeft, y + verticalOffset, { width: columnWidths[0], align: 'center' });
      doc.text(item.codigo, tableLeft + columnWidths[0], y + verticalOffset, { width: columnWidths[1], align: 'center' });
      doc.text(item.cantidad.toString(), tableLeft + columnWidths[0] + columnWidths[1], y + verticalOffset, { width: columnWidths[2], align: 'center' });
      doc.text(item.deposito?.nombre || 'Desconocido', tableLeft + columnWidths[0] + columnWidths[1] + columnWidths[2], y + verticalOffset, { width: columnWidths[3], align: 'center' });
      y += cellHeight;
      doc.moveTo(tableLeft, y).lineTo(tableLeft + 500, y).stroke();
      x = tableLeft;
      for (let i = 0; i <= columnWidths.length; i++) {
        doc.moveTo(x, y - cellHeight).lineTo(x, y).stroke();
        x += columnWidths[i] || 0;
      }
    });

    doc.end();
  } catch (err) {
    console.error('Error al generar PDF de stock:', err);
    res.status(500).json({ error: 'Error al generar PDF de stock', details: err.message });
  }
};