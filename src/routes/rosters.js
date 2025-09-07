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

// Crear roster
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const roster = new Roster({
      ...req.body,
      auditLog: [{ action: 'create', userId: req.user.id, details: 'Roster creado' }]
    });
    await roster.save();
    await roster.populate('empleados');
    res.status(201).json(roster);
  } catch (err) {
    console.error('Error al crear roster:', err);
    res.status(400).json({ error: 'Error al crear roster' });
  }
});

// Actualizar roster
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const roster = await Roster.findByIdAndUpdate(
      req.params.id,
      { 
        ...req.body,
        $push: { auditLog: { action: 'update', userId: req.user.id, details: 'Roster actualizado' } }
      },
      { new: true }
    ).populate('empleados');
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    res.json(roster);
  } catch (err) {
    console.error('Error al actualizar roster:', err);
    res.status(400).json({ error: 'Error al actualizar roster' });
  }
});

// Eliminar roster
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });
  try {
    const roster = await Roster.findByIdAndDelete(req.params.id);
    if (!roster) return res.status(404).json({ error: 'Roster no encontrado' });
    await Roster.findByIdAndUpdate(
      req.params.id,
      { $push: { auditLog: { action: 'delete', userId: req.user.id, details: 'Roster eliminado' } } },
      { new: true }
    );
    res.json({ message: 'Roster eliminado' });
  } catch (err) {
    console.error('Error al eliminar roster:', err);
    res.status(400).json({ error: 'Error al eliminar roster' });
  }
});

module.exports = router;