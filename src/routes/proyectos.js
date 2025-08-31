const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Proyecto = require('../models/Proyecto');
const Orden = require('../models/Orden');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const proyectos = await Proyecto.find();
    res.json(proyectos);
  } catch (err) {
    console.error('Error al obtener proyectos:', err);
    res.status(500).json({ error: 'Error al cargar proyectos' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
  }
  try {
    const proyectoExistente = await Proyecto.findOne({ nombre: nombre.trim() });
    if (proyectoExistente) {
      return res.status(400).json({ error: 'El proyecto ya existe' });
    }
    const nuevoProyecto = new Proyecto({ nombre: nombre.trim() });
    await nuevoProyecto.save();
    res.status(201).json(nuevoProyecto);
  } catch (err) {
    console.error('Error al crear proyecto:', err);
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
  }
  try {
    const proyecto = await Proyecto.findById(id);
    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    const nombreExistente = await Proyecto.findOne({
      nombre: nombre.trim(),
      _id: { $ne: id }
    });
    if (nombreExistente) {
      return res.status(400).json({ error: 'Ya existe un proyecto con ese nombre' });
    }
    proyecto.nombre = nombre.trim();
    await proyecto.save();
    res.json(proyecto);
  } catch (err) {
    console.error('Error al actualizar proyecto:', err);
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const proyecto = await Proyecto.findById(id);
    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    const ordenesActivas = await Orden.find({
      proyecto: proyecto.nombre,
      estado: { $nin: ['Completada', 'Rechazada'] }
    });
    if (ordenesActivas.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: El proyecto está asociado a órdenes activas' });
    }
    await Proyecto.findByIdAndDelete(id);
    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (err) {
    console.error('Error al eliminar proyecto:', err);
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
});

module.exports = router;