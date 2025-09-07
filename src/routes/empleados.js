const express = require('express');
const router = express.Router();
const Empleado = require('../models/Empleado');
const authMiddleware = require('../middleware/auth');

// Obtener todos los empleados
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { rol, estado, proyecto } = req.query;
  const query = {};
  if (rol) query.rol = new RegExp(rol, 'i');
  if (estado) query.estado = estado;
  if (proyecto) query.proyecto = new RegExp(proyecto, 'i');

  try {
    const empleados = await Empleado.find(query);
    res.json(empleados);
  } catch (err) {
    console.error('Error al obtener empleados:', err);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// Obtener todas las licencias
router.get('/licencias', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const empleados = await Empleado.find({ licencias: { $exists: true, $ne: [] } });
    const licencias = empleados.flatMap(emp => 
      emp.licencias.map(lic => ({ empleado: emp._id, ...lic.toObject() }))
    );
    res.json(licencias);
  } catch (err) {
    console.error('Error al obtener licencias:', err);
    res.status(500).json({ error: 'Error al obtener licencias' });
  }
});

// Crear empleado
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const empleado = new Empleado(req.body);
    await empleado.save();
    res.status(201).json(empleado);
  } catch (err) {
    console.error('Error al crear empleado:', err);
    res.status(400).json({ error: 'Error al crear empleado' });
  }
});

// Actualizar empleado
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const empleado = await Empleado.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(empleado);
  } catch (err) {
    console.error('Error al actualizar empleado:', err);
    res.status(400).json({ error: 'Error al actualizar empleado' });
  }
});

// Dar de baja empleado
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const empleado = await Empleado.findByIdAndUpdate(req.params.id, { estado: 'baja' }, { new: true });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json({ message: 'Empleado dado de baja' });
  } catch (err) {
    console.error('Error al dar de baja empleado:', err);
    res.status(400).json({ error: 'Error al dar de baja empleado' });
  }
});

// Registrar licencia
router.post('/:id/licencia', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const empleado = await Empleado.findById(req.params.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    empleado.licencias.push(req.body);
    empleado.estado = 'licencia';
    await empleado.save();
    res.json(empleado);
  } catch (err) {
    console.error('Error al registrar licencia:', err);
    res.status(400).json({ error: 'Error al registrar licencia' });
  }
});

module.exports = router;