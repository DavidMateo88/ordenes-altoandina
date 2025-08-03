const PDFDocument = require('pdfkit');
const mongoose = require('mongoose');
const Orden = require('../models/Orden');
const Stock = require('../models/Stock');
const jwt = require('jsonwebtoken');

const generateOrdenPDF = async (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente' && decoded.role !== 'Cotizador') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const orden = await Orden.findById(id)
      .populate('solicitante', 'username')
      .populate('deposito', 'nombre ubicacion')
      .populate('creado_por', 'username')
      .populate('modificado_por', 'username')
      .populate('cotizado_por', 'username')
      .populate('aprobado_por', 'username')
      .populate('rechazado_por', 'username');

    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    if (decoded.role === 'Cotizador' && 
        orden.estado !== 'Pendiente' && 
        orden.estado !== 'Modificada' && 
        orden.estado !== 'Cotizada' && 
        orden.estado !== 'Aprobada' && 
        orden.cotizado_por?.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'No tienes permiso para generar este PDF' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=orden_${id}.pdf`);

    doc.pipe(res);
    doc.fontSize(20).text('Orden de Compra', { align: 'center' });
    doc.fontSize(12).text('[Nombre de la Empresa]', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Orden #${orden._id}`, { align: 'left' });
    doc.fontSize(12);
    doc.text(`Solicitante: ${orden.solicitante?.username || 'Desconocido'}`);
    doc.text(`Creado por: ${orden.creado_por?.username || 'Desconocido'}`);
    if (orden.modificado_por) doc.text(`Modificado por: ${orden.modificado_por?.username || 'Desconocido'} (${new Date(orden.fecha_modificacion).toLocaleString()})`);
    if (orden.cotizado_por) doc.text(`Cotizado por: ${orden.cotizado_por?.username || 'Desconocido'}`);
    if (orden.comentarios_cotizacion) doc.text(`Comentarios de Cotización: ${orden.comentarios_cotizacion}`);
    if (orden.aprobado_por) doc.text(`Aprobado por: ${orden.aprobado_por?.username || 'Desconocido'}`);
    if (orden.rechazado_por) doc.text(`Rechazado por: ${orden.rechazado_por?.username || 'Desconocido'}`);
    doc.text(`Proyecto: ${orden.proyecto}`);
    doc.text(`Ubicación: ${orden.ubicacion}`);
    doc.text(`Depósito: ${orden.deposito?.nombre || 'Desconocido'} (${orden.deposito?.ubicacion || ''})`);
    doc.text(`Fecha de emisión: ${orden.fecha_emision.toISOString().split('T')[0]}`);
    if (orden.fecha_modificacion) doc.text(`Fecha de modificación: ${orden.fecha_modificacion.toISOString().split('T')[0]}`);
    doc.text(`Estado: ${orden.estado}`);
    doc.text(`Total estimado: $${orden.total_estimado.toFixed(2)}`);
    if (orden.factura) doc.text(`Factura: ${orden.factura}`);
    if (orden.observaciones) doc.text(`Observaciones: ${orden.observaciones}`);
    if (orden.razon_rechazo) doc.text(`Razón del rechazo: ${orden.razon_rechazo}`);
    doc.moveDown();

    doc.fontSize(14).text('Ítems', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text('Descripción', 50, doc.y, { continued: true });
    doc.text('Código', 200, doc.y, { continued: true });
    doc.text('Cantidad', 300, doc.y, { continued: true });
    doc.text('Unidad', 350, doc.y, { continued: true });
    doc.text('Precio Unitario', 400, doc.y, { continued: true });
    doc.text('Subtotal', 480, doc.y);
    doc.moveDown(0.5);
    orden.items.forEach(item => {
      doc.text(item.descripcion, 50, doc.y, { continued: true });
      doc.text(item.codigo || '-', 200, doc.y, { continued: true });
      doc.text(item.cantidad.toString(), 300, doc.y, { continued: true });
      doc.text(item.unidad_medida, 350, doc.y, { continued: true });
      doc.text(`$${item.precio_unitario.toFixed(2)}`, 400, doc.y, { continued: true });
      doc.text(`$${item.subtotal.toFixed(2)}`, 480, doc.y);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF:', error.message);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};

const generateStockPDF = async (req, res) => {
  const token = req.query.token || req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const stock = await Stock.find().populate('deposito', 'nombre ubicacion');

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stock_report_${new Date().toISOString().split('T')[0]}.pdf`);

    doc.pipe(res);
    doc.fontSize(20).text('Informe de Stock', { align: 'center' });
    doc.fontSize(12).text('[Nombre de la Empresa]', { align: 'center' });
    doc.moveDown();

    doc.fontSize(14).text(`Fecha: ${new Date().toISOString().split('T')[0]}`, { align: 'left' });
    doc.moveDown();

    doc.fontSize(14).text('Inventario', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text('Producto', 50, doc.y, { continued: true });
    doc.text('Código', 200, doc.y, { continued: true });
    doc.text('Depósito', 300, doc.y, { continued: true });
    doc.text('Cantidad', 400, doc.y, { continued: true });
    doc.text('Unidad', 450, doc.y);
    doc.moveDown(0.5);

    stock.forEach(item => {
      doc.text(item.producto, 50, doc.y, { continued: true });
      doc.text(item.codigo || '-', 200, doc.y, { continued: true });
      doc.text(`${item.deposito.nombre} (${item.deposito.ubicacion})`, 300, doc.y, { continued: true });
      doc.text(item.cantidad.toString(), 400, doc.y, { continued: true });
      doc.text(item.unidad_medida, 450, doc.y);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF de stock:', error.message);
    res.status(500).json({ error: 'Error al generar PDF de stock' });
  }
};

module.exports = { generateOrdenPDF, generateStockPDF };