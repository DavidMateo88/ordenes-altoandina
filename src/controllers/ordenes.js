const Orden = require('../models/Orden');
const Stock = require('../models/Stock'); // Añadir importación


exports.createOrden = async (req, res) => {
  if (req.user.role !== 'Solicitante') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { proyecto, ubicacion, deposito, observaciones, items } = req.body;
  if (!proyecto || !ubicacion || !deposito || !items || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  try {
    const orden = new Orden({
      proyecto,
      ubicacion,
      deposito,
      observaciones,
      items,
      creado_por: req.user.id
    });
    await orden.save();
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear orden' });
  }
};

exports.getOrden = async (req, res) => {
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
    console.log('Orden enviada:', orden);
    res.json(orden);
  } catch (err) {
    console.error('Error al obtener orden:', err);
    res.status(500).json({ error: 'Error al obtener orden', details: err.message });
  }
};

exports.updateOrden = async (req, res) => {
  if (req.user.role !== 'Solicitante') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { proyecto, ubicacion, deposito, observaciones, items } = req.body;
  if (!proyecto || !ubicacion || !deposito || !items || items.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Rechazada') {
      return res.status(400).json({ error: 'Solo se pueden modificar órdenes rechazadas' });
    }
    orden.proyecto = proyecto;
    orden.ubicacion = ubicacion;
    orden.deposito = deposito;
    orden.observaciones = observaciones;
    orden.items = items;
    orden.estado = 'Modificada';
    orden.fecha_modificacion = Date.now();
    orden.modificado_por = req.user.id;
    await orden.save();
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar orden' });
  }
};

exports.cotizarOrden = async (req, res) => {
  if (req.user.role !== 'Cotizador') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { items, total_estimado, comentarios_cotizacion } = req.body;
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar ítems válidos' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Pendiente' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden cotizar órdenes pendientes o modificadas' });
    }
    orden.items = items;
    orden.total_estimado = total_estimado;
    orden.comentarios_cotizacion = comentarios_cotizacion;
    orden.estado = 'Cotizada';
    orden.cotizado_por = req.user.id;
    await orden.save();
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: 'Error al cotizar orden' });
  }
};

exports.aprobarOrden = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Pendiente' && orden.estado !== 'Cotizada' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden aprobar órdenes pendientes, cotizadas o modificadas' });
    }
    orden.estado = 'Aprobada';
    orden.aprobado_por = req.user.id;
    await orden.save();
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: 'Error al aprobar orden' });
  }
};

exports.rechazarOrden = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { razon_rechazo } = req.body;
  if (!razon_rechazo) {
    return res.status(400).json({ error: 'Debe proporcionar una razón para el rechazo' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Pendiente' && orden.estado !== 'Cotizada' && orden.estado !== 'Modificada') {
      return res.status(400).json({ error: 'Solo se pueden rechazar órdenes pendientes, cotizadas o modificadas' });
    }
    orden.estado = 'Rechazada';
    orden.rechazado_por = req.user.id;
    orden.razon_rechazo = razon_rechazo;
    await orden.save();
    res.json(orden);
  } catch (err) {
    res.status(500).json({ error: 'Error al rechazar orden' });
  }
};

exports.cargarFacturas = async (req, res) => {
  if (req.user.role !== 'Cotizador') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { facturas, items } = req.body;
  if (!facturas || !Array.isArray(facturas) || facturas.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar al menos un número de factura' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe proporcionar ítems válidos' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Aprobada') {
      return res.status(400).json({ error: 'La orden debe estar aprobada para cargar facturas' });
    }

    // Actualizar la orden
    orden.facturas = facturas;
    orden.estado = 'Completada';
    orden.fecha_modificacion = Date.now();
    orden.modificado_por = req.user.id;
    await orden.save();

    // Actualizar el stock
    for (const item of items) {
      if (!item.cantidad || item.cantidad <= 0) {
        console.warn(`Ítem inválido en orden ${orden._id}:`, item);
        continue;
      }

      // Generar código por defecto si no existe
      const codigo = item.codigo || `COD_${item.descripcion.replace(/\s+/g, '_').toUpperCase()}_${orden._id.toString().slice(-4)}`;

      console.log(`Procesando ítem:`, { nombre: item.descripcion, codigo, cantidad: item.cantidad, deposito: orden.deposito });

      const stock = await Stock.findOne({
        codigo: codigo,
        deposito: orden.deposito
      });

      if (stock) {
        // Actualizar stock existente
        stock.cantidad += item.cantidad;
        stock.nombre = item.descripcion;
        await stock.save();
        console.log(`Stock actualizado:`, { codigo, cantidad: stock.cantidad });
      } else {
        // Crear nuevo documento en Stock
        const newStock = await Stock.create({
          nombre: item.descripcion,
          codigo: codigo,
          cantidad: item.cantidad,
          deposito: orden.deposito
        });
        console.log(`Stock creado:`, newStock);
      }
    }

    console.log(`Stock actualizado para orden ${orden._id}`);
    res.json({ message: 'Facturas cargadas y stock actualizado', orden });
  } catch (err) {
    console.error('Error al cargar facturas:', err);
    res.status(500).json({ error: 'Error al cargar facturas', details: err.message });
  }
};

exports.deleteOrden = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const orden = await Orden.findById(req.params.id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }
    if (orden.estado !== 'Rechazada' && orden.estado !== 'Aprobada' && orden.estado !== 'Completada') {
      return res.status(400).json({ error: 'Solo se pueden eliminar órdenes rechazadas, aprobadas o completadas' });
    }
    await orden.deleteOne();
    res.json({ message: 'Orden eliminada exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar orden' });
  }
};

exports.getOrdenes = async (req, res) => {
  const { estado, proyecto, ordenarPor } = req.query;
  let query = {};
  if (estado) query.estado = estado;
  if (proyecto) query.proyecto = proyecto;
  let sort = {};
  if (ordenarPor === 'fecha') sort.fecha_creacion = -1;
  else if (ordenarPor === 'estado') sort.estado = 1;
  try {
    const ordenes = await Orden.find(query)
      .populate('deposito')
      .populate('creado_por')
      .populate('cotizado_por')
      .populate('aprobado_por')
      .populate('rechazado_por')
      .sort(sort);
    res.json(ordenes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

exports.getProyectos = async (req, res) => {
  try {
    const proyectos = await Orden.distinct('proyecto');
    res.json(proyectos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
};