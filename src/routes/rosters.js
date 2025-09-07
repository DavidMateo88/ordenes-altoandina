const express = require('express');
const router = express.Router();
const Roster = require('../models/Roster');
const authMiddleware = require('../middleware/auth');

// Crear un nuevo roster (solo Gerente)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, fecha_inicio, fecha_fin, proyecto, empleados } = req.body;
  try {
    const roster = new Roster({
      nombre,
      fecha_inicio,
      fecha_fin,
      proyecto,
      empleados,
      creado_por: req.user.id
    });
    await roster.save();
    const populatedRoster = await Roster.findById(roster._id).populate('empleados');
    res.status(201).json(populatedRoster);
  } catch (err) {
    console.error('Error al crear roster:', err);
    res.status(400).json({ error: err.message });
  }
});

// Obtener todos los rosters con filtros
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { proyecto } = req.query;
  const query = { creado_por: req.user.id };
  if (proyecto) query.proyecto = new RegExp(proyecto, 'i');

  try {
    const rosters = await Roster.find(query).populate('empleados');
    res.json(rosters);
  } catch (err) {
    console.error('Error al obtener rosters:', err);
    res.status(500).json({ error: err.message });
  }
});

// Obtener un roster por ID
router.get('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const roster = await Roster.findOne({ _id: req.params.id, creado_por: req.user.id }).populate('empleados');
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json(roster);
  } catch (err) {
    console.error('Error al obtener roster:', err);
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un roster
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  const { nombre, fecha_inicio, fecha_fin, proyecto, empleados } = req.body;
  try {
    const roster = await Roster.findOneAndUpdate(
      { _id: req.params.id, creado_por: req.user.id },
      { nombre, fecha_inicio, fecha_fin, proyecto, empleados },
      { new: true }
    ).populate('empleados');
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json(roster);
  } catch (err) {
    console.error('Error al actualizar roster:', err);
    res.status(400).json({ error: err.message });
  }
});

// Eliminar un roster
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

  try {
    const roster = await Roster.findOneAndDelete({ _id: req.params.id, creado_por: req.user.id });
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json({ message: 'Roster eliminado' });
  } catch (err) {
    console.error('Error al eliminar roster:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;