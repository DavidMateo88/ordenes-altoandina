const express = require('express');
const router = express.Router();
const Empleado = require('../models/Empleado');
const authMiddleware = require('../middleware/auth');

// Crear un nuevo empleado (solo Gerente)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, apellido, dni, rol, estado, proyecto } = req.body;
  try {
    const empleado = new Empleado({
      nombre,
      apellido,
      dni,
      rol,
      estado,
      proyecto,
      creado_por: req.user.id
    });
    await empleado.save();
    res.status(201).json(empleado);
  } catch (err) {
    console.error('Error al crear empleado:', err);
    res.status(400).json({ error: err.message });
  }
});

// Obtener todos los empleados con filtros
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { rol, estado, proyecto } = req.query;
  const query = { creado_por: req.user.id };
  if (rol) query.rol = new RegExp(rol, 'i');
  if (estado) query.estado = estado;
  if (proyecto) query.proyecto = new RegExp(proyecto, 'i');

  try {
    const empleados = await Empleado.find(query);
    console.log('Enviando empleados:', empleados); // Añadido para depuración
    res.json(empleados);
  } catch (err) {
    console.error('Error al obtener empleados:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener un empleado por ID
router.get('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const empleado = await Empleado.findOne({ _id: req.params.id, creado_por: req.user.id });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) {
    console.error('Error al obtener empleado:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un empleado
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, apellido, dni, rol, estado, proyecto } = req.body;
  try {
    const empleado = await Empleado.findOneAndUpdate(
      { _id: req.params.id, creado_por: req.user.id },
      { nombre, apellido, dni, rol, estado, proyecto },
      { new: true }
    );
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) {
    console.error('Error al actualizar empleado:', err);
    res.status(400).json({ error: err.message });
  }
});

// Dar de baja a un empleado
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const empleado = await Empleado.findOneAndUpdate(
      { _id: req.params.id, creado_por: req.user.id },
      { estado: 'baja' },
      { new: true }
    );
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado dado de baja' });
  } catch (err) {
    console.error('Error al dar de baja empleado:', err);
    res.status(500).json({ error: err.message });
  }
});

// Agregar una licencia a un empleado
router.post('/:id/licencia', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { tipo, fecha_inicio, fecha_fin, comentarios } = req.body;
  try {
    const empleado = await Empleado.findOne({ _id: req.params.id, creado_por: req.user.id });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    empleado.licencias.push({ tipo, fecha_inicio, fecha_fin, comentarios });
    empleado.estado = 'licencia';
    await empleado.save();
    res.json(empleado);
  } catch (err) {
    console.error('Error al agregar licencia:', err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;