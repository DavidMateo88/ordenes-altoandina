const mongoose = require('mongoose');
const Orden = require('../models/Orden');
const Stock = require('../models/Stock');
const jwt = require('jsonwebtoken');

const createOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Solicitante') return res.status(403).json({ error: 'Acceso denegado' });

    const { proyecto, ubicacion, deposito, items } = req.body;

    if (!proyecto || !ubicacion || !deposito || !items || !items.length) {
      return res.status(400).json({ error: 'Faltan datos requeridos: proyecto, ubicación, depósito o ítems' });
    }

    for (const item of items) {
      if (!item.descripcion || !item.cantidad || !item.unidad_medida) {
        return res.status(400).json({ error: 'Cada ítem debe tener descripción, cantidad y unidad_medida' });
      }
    }

    if (!mongoose.Types.ObjectId.isValid(deposito)) {
      return res.status(400).json({ error: 'Depósito inválido: debe ser un ObjectId válido' });
    }

    const orden = new Orden({
      solicitante: decoded.userId,
      creado_por: decoded.userId,
      proyecto,
      ubicacion,
      deposito,
      items,
      fecha_emision: new Date(),
      estado: 'Pendiente',
      total_estimado: items.reduce((sum, item) => sum + (item.cantidad * (item.precio_unitario || 0)), 0)
    });

    await orden.save();
    res.status(201).json({ message: 'Orden creada', orden });
  } catch (error) {
    console.error('Error al crear orden:', error.message);
    res.status(500).json({ error: `Error al crear orden: ${error.message}` });
  }
};

const cotizarOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Cotizador') {
      return res.status(403).json({ error: 'Solo los cotizadores pueden cotizar órdenes' });
    }

    const { id } = req.params;
    const { items, comentarios_cotizacion } = req.body;

    const orden = await Orden.findById(id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    if (orden.estado !== 'Pendiente' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden cotizar órdenes pendientes o modificadas' });
    }

    orden.items = items;
    orden.total_estimado = items.reduce((total, item) => total + item.subtotal, 0);
    orden.estado = 'Cotizada';
    orden.cotizado_por = decoded.userId;
    if (comentarios_cotizacion) orden.comentarios_cotizacion = comentarios_cotizacion;

    await orden.save();
    res.json(orden);
  } catch (error) {
    console.error('Error al cotizar orden:', error.message);
    res.status(500).json({ error: 'Error al cotizar orden' });
  }
};

const rejectOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;
    const { razon_rechazo } = req.body;

    if (!razon_rechazo) return res.status(400).json({ error: 'Debe proporcionar una razón para el rechazo' });

    const orden = await Orden.findById(id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    if (orden.estado !== 'Pendiente' && orden.estado !== 'Cotizada' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden rechazar órdenes en estado Pendiente, Cotizada o Modificada' });
    }

    orden.estado = 'Rechazada';
    orden.razon_rechazo = razon_rechazo;
    orden.rechazado_por = decoded.userId;
    await orden.save();

    res.json({ message: 'Orden rechazada', orden });
  } catch (error) {
    console.error('Error al rechazar orden:', error.message);
    res.status(500).json({ error: `Error al rechazar orden: ${error.message}` });
  }
};

const approveOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;

    const orden = await Orden.findById(id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    if (orden.estado !== 'Pendiente' && orden.estado !== 'Cotizada' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden aprobar órdenes en estado Pendiente, Cotizada o Modificada' });
    }

    orden.estado = 'Aprobada';
    orden.aprobado_por = decoded.userId;
    await orden.save();

    // Actualizar stock
    for (const item of orden.items) {
      let stock = await Stock.findOne({ producto: item.descripcion, deposito: orden.deposito });
      if (stock) {
        stock.cantidad += item.cantidad;
        stock.unidad_medida = item.unidad_medida;
        await stock.save();
      } else {
        stock = new Stock({
          producto: item.descripcion,
          codigo: item.codigo,
          deposito: orden.deposito,
          cantidad: item.cantidad,
          unidad_medida: item.unidad_medida
        });
        await stock.save();
      }
    }

    res.json({ message: 'Orden aprobada y stock actualizado', orden });
  } catch (error) {
    console.error('Error al aprobar orden:', error.message);
    res.status(500).json({ error: `Error al aprobar orden: ${error.message}` });
  }
};

const updateOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    const { id } = req.params;
    const { proyecto, ubicacion, deposito, items, observaciones } = req.body;

    const orden = await Orden.findById(id)
      .populate('solicitante', 'username')
      .populate('deposito', 'nombre ubicacion')
      .populate('creado_por', 'username')
      .populate('modificado_por', 'username')
      .populate('cotizado_por', 'username')
      .populate('aprobado_por', 'username')
      .populate('rechazado_por', 'username');

    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    // Permitir a Solicitantes modificar órdenes rechazadas
    if (decoded.role === 'Solicitante' && orden.estado !== 'Rechazada') {
      return res.status(403).json({ error: 'Solo puedes modificar órdenes rechazadas' });
    }
    if (decoded.role === 'Solicitante' && orden.solicitante._id.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta orden' });
    }

    // Actualizar campos
    if (proyecto) orden.proyecto = proyecto;
    if (ubicacion) orden.ubicacion = ubicacion;
    if (deposito) orden.deposito = deposito;
    if (items) {
      orden.items = items;
      orden.total_estimado = items.reduce((total, item) => total + item.subtotal, 0);
    }
    if (observaciones) orden.observaciones = observaciones;

    // Registrar modificación
    orden.modificado_por = decoded.userId;
    orden.fecha_modificacion = new Date();
    if (decoded.role === 'Solicitante') {
      orden.estado = 'Modificada'; // Cambiar estado a "Modificada" para Solicitantes
    }

    await orden.save();
    res.json(orden);
  } catch (error) {
    console.error('Error al actualizar orden:', error.message);
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
};

const uploadFactura = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Cotizador') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;
    const { factura } = req.body;

    if (!factura) return res.status(400).json({ error: 'Debe proporcionar un número de factura' });

    const orden = await Orden.findById(id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

    if (orden.estado !== 'Aprobada') {
      return res.status(400).json({ error: 'Solo las órdenes aprobadas pueden tener factura' });
    }

    orden.factura = factura;
    orden.estado = 'Completada';
    await orden.save();

    res.json({ message: 'Factura cargada y orden completada', orden });
  } catch (error) {
    console.error('Error al cargar factura:', error.message);
    res.status(500).json({ error: `Error al cargar factura: ${error.message}` });
  }
};

const getOrdenes = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    let ordenes;
    if (decoded.role === 'Solicitante') {
      ordenes = await Orden.find({ solicitante: decoded.userId })
        .populate('solicitante', 'username')
        .populate('deposito', 'nombre ubicacion')
        .populate('creado_por', 'username')
        .populate('modificado_por', 'username')
        .populate('cotizado_por', 'username')
        .populate('aprobado_por', 'username')
        .populate('rechazado_por', 'username');
    } else if (decoded.role === 'Cotizador') {
      ordenes = await Orden.find({
        $or: [
          { estado: 'Pendiente' },
          { estado: 'Modificada' },
          { estado: 'Cotizada' },
          { estado: 'Aprobada' },
          { estado: 'Rechazada', cotizado_por: decoded.userId },
          { estado: 'Completada', cotizado_por: decoded.userId }
        ]
      })
        .populate('solicitante', 'username')
        .populate('deposito', 'nombre ubicacion')
        .populate('creado_por', 'username')
        .populate('modificado_por', 'username')
        .populate('cotizado_por', 'username')
        .populate('aprobado_por', 'username')
        .populate('rechazado_por', 'username');
    } else {
      ordenes = await Orden.find()
        .populate('solicitante', 'username')
        .populate('deposito', 'nombre ubicacion')
        .populate('creado_por', 'username')
        .populate('modificado_por', 'username')
        .populate('cotizado_por', 'username')
        .populate('aprobado_por', 'username')
        .populate('rechazado_por', 'username');
    }
    res.json(ordenes);
  } catch (error) {
    console.error('Error al obtener órdenes:', error.message);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

const getOrdenById = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
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

    if (decoded.role === 'Solicitante' && orden.solicitante.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });
    }

    if (decoded.role === 'Cotizador' && 
        orden.estado !== 'Pendiente' && 
        orden.estado !== 'Modificada' && 
        orden.estado !== 'Cotizada' && 
        orden.estado !== 'Aprobada' && 
        orden.cotizado_por?.toString() !== decoded.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver esta orden' });
    }

    res.json(orden);
  } catch (error) {
    console.error('Error al obtener orden:', error.message);
    res.status(500).json({ error: 'Error al obtener orden' });
  }
};

const deleteOrden = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') {
      return res.status(403).json({ error: 'Solo los gerentes pueden eliminar órdenes' });
    }

    const { id } = req.params;
    const orden = await Orden.findById(id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    if (orden.estado !== 'Rechazada') {
      return res.status(400).json({ error: 'Solo se pueden eliminar órdenes rechazadas' });
    }

    await Orden.deleteOne({ _id: id });
    res.json({ message: 'Orden eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar orden:', error.message);
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
};
module.exports = { createOrden, cotizarOrden, rejectOrden, approveOrden, updateOrden, uploadFactura, getOrdenes, getOrdenById, deleteOrden };