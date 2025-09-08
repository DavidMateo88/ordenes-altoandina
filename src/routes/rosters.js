const express = require('express');
const router = express.Router();
const Roster = require('../models/Roster');
const authMiddleware = require('../middleware/auth');

// Obtener todos los rosters
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { proyecto } = req.query;
  const query = {};
  if (proyecto) query.proyecto = new RegExp(proyecto, 'i');

  try {
    const rosters = await Roster.find(query).populate('empleados').populate('auditLog.userId', 'username');
    res.json(rosters);
  } catch (err) {
    console.error('Error al obtener rosters:', err);
    res.status(500).json({ error: 'Error al obtener rosters' });
  }
});

// Obtener un roster
router.get('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const roster = await Roster.findById(req.params.id).populate('empleados');
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json(roster);
  } catch (err) {
    console.error('Error al obtener roster:', err);
    res.status(500).json({ error: 'Error al obtener roster' });
  }
});

// Crear roster con validación de superposiciones
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, fechaInicio, fechaFin, proyecto, empleados } = req.body;
  console.log('Datos recibidos para crear roster:', req.body); // Log para depuración

  try {
    // Validación manual básica
    if (!nombre || !fechaInicio || !fechaFin || !Array.isArray(empleados)) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombre, fechaInicio, fechaFin o empleados deben ser un array.' });
    }

    // Convertir fechas a Date (maneja strings ISO como '2025-09-08')
    const newStart = new Date(fechaInicio);
    const newEnd = new Date(fechaFin);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newStart >= newEnd) {
      return res.status(400).json({ error: 'Fechas inválidas: fechaInicio debe ser anterior a fechaFin y en formato válido (ej. YYYY-MM-DD).' });
    }

    // Verificar superposiciones para cada empleado
    for (const empleadoId of empleados) {
      const overlappingRoster = await Roster.findOne({
        empleados: empleadoId,
        fecha_inicio: { $lte: newEnd },
        fecha_fin: { $gte: newStart }
      });

      if (overlappingRoster) {
        return res.status(400).json({
          error: `El empleado con ID ${empleadoId} ya está asignado a otro roster (${overlappingRoster.nombre}) con fechas superpuestas o idénticas.`
        });
      }
    }

    // Si no hay superposiciones, crea el roster
    const roster = new Roster({
      nombre,
      fecha_inicio: newStart,
      fecha_fin: newEnd,
      proyecto,
      empleados,
      auditLog: [{ action: 'create', userId: req.user.id, details: 'Roster creado' }]
    });
    await roster.save();
    await roster.populate('empleados');
    res.status(201).json(roster);
  } catch (err) {
    console.error('Error detallado al crear roster:', err.message, err.stack); // Log detallado
    res.status(400).json({ error: `Error al crear roster: ${err.message}` });
  }
});

// Actualizar roster con validación de superposiciones
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, fechaInicio, fechaFin, proyecto, empleados } = req.body;

  try {
    // Validación manual básica
    if (!nombre || !fechaInicio || !fechaFin || !Array.isArray(empleados)) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombre, fechaInicio, fechaFin o empleados deben ser un array.' });
    }

    // Convertir fechas a Date
    const newStart = new Date(fechaInicio);
    const newEnd = new Date(fechaFin);
    if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime()) || newStart >= newEnd) {
      return res.status(400).json({ error: 'Fechas inválidas: fechaInicio debe ser anterior a fechaFin y en formato válido (ej. YYYY-MM-DD).' });
    }

    // Verificar superposiciones para cada empleado (excluyendo el roster actual)
    for (const empleadoId of empleados) {
      const overlappingRoster = await Roster.findOne({
        _id: { $ne: req.params.id }, // Excluir el roster que se está actualizando
        empleados: empleadoId,
        fecha_inicio: { $lte: newEnd },
        fecha_fin: { $gte: newStart }
      });

      if (overlappingRoster) {
        return res.status(400).json({
          error: `El empleado con ID ${empleadoId} ya está asignado a otro roster (${overlappingRoster.nombre}) con fechas superpuestas o idénticas.`
        });
      }
    }

    // Si no hay superposiciones, actualiza el roster
    const roster = await Roster.findByIdAndUpdate(
      req.params.id,
      { 
        nombre,
        fecha_inicio: newStart,
        fecha_fin: newEnd,
        proyecto,
        empleados,
        $push: { auditLog: { action: 'update', userId: req.user.id, details: 'Roster actualizado' } }
      },
      { new: true }
    ).populate('empleados');
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json(roster);
  } catch (err) {
    console.error('Error detallado al actualizar roster:', err.message, err.stack);
    res.status(400).json({ error: `Error al actualizar roster: ${err.message}` });
  }
});

// Eliminar roster (corregido: no intentar actualizar después de eliminar)
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    // Opcional: Agregar auditLog antes de eliminar, si es necesario
    await Roster.findByIdAndUpdate(
      req.params.id,
      { $push: { auditLog: { action: 'delete', userId: req.user.id, details: 'Roster eliminado' } } }
    );

    const roster = await Roster.findByIdAndDelete(req.params.id);
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json({ message: 'Roster eliminado' });
  } catch (err) {
    console.error('Error al eliminar roster:', err);
    res.status(400).json({ error: 'Error al eliminar roster' });
  }
});

module.exports = router;
