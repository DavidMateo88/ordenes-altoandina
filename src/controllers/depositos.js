const mongoose = require('mongoose');
const Deposito = require('../models/Deposito');
const Stock = require('../models/Stock');
const Orden = require('../models/Orden');
const jwt = require('jsonwebtoken');

const getDepositos = async (req, res) => {
  try {
    const depositos = await Deposito.find();
    res.json(depositos);
  } catch (error) {
    console.error('Error al obtener depósitos:', error.message);
    res.status(500).json({ error: 'Error al obtener depósitos' });
  }
};

const createDeposito = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const { nombre, ubicacion } = req.body;

    if (!nombre || !ubicacion) {
      return res.status(400).json({ error: 'Faltan nombre o ubicación' });
    }

    const deposito = new Deposito({ nombre, ubicacion });
    await deposito.save();
    res.status(201).json({ message: 'Depósito creado', deposito });
  } catch (error) {
    console.error('Error al crear depósito:', error.message);
    res.status(500).json({ error: `Error al crear depósito: ${error.message}` });
  }
};

const deleteDeposito = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;

    const ordenes = await Orden.find({ deposito: id });
    if (ordenes.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un depósito con órdenes asociadas' });
    }

    const stock = await Stock.find({ deposito: id });
    if (stock.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un depósito con stock asociado' });
    }

    const deposito = await Deposito.findByIdAndDelete(id);
    if (!deposito) return res.status(404).json({ error: 'Depósito no encontrado' });

    res.json({ message: 'Depósito eliminado' });
  } catch (error) {
    console.error('Error al eliminar depósito:', error.message);
    res.status(500).json({ error: `Error al eliminar depósito: ${error.message}` });
  }
};

const moveStock = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
    if (decoded.role !== 'Gerente') return res.status(403).json({ error: 'Acceso denegado' });

    const { producto, origenDeposito, destinoDeposito, cantidad } = req.body;

    if (!producto || !origenDeposito || !destinoDeposito || !cantidad || cantidad <= 0) {
      return res.status(400).json({ error: 'Faltan datos requeridos o cantidad inválida' });
    }

    if (!mongoose.Types.ObjectId.isValid(origenDeposito) || !mongoose.Types.ObjectId.isValid(destinoDeposito)) {
      return res.status(400).json({ error: 'Depósitos inválidos' });
    }

    const origenStock = await Stock.findOne({ producto, deposito: origenDeposito });
    if (!origenStock || origenStock.cantidad < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente en el depósito de origen' });
    }

    origenStock.cantidad -= cantidad;
    if (origenStock.cantidad === 0) {
      await Stock.deleteOne({ _id: origenStock._id });
    } else {
      await origenStock.save();
    }

    const destinoStock = await Stock.findOne({ producto, deposito: destinoDeposito });
    if (destinoStock) {
      destinoStock.cantidad += cantidad;
      await destinoStock.save();
    } else {
      const newStock = new Stock({
        producto,
        deposito: destinoDeposito,
        cantidad,
        codigo: origenStock.codigo
      });
      await newStock.save();
    }

    res.json({ message: 'Stock movido exitosamente' });
  } catch (error) {
    console.error('Error al mover stock:', error.message);
    res.status(500).json({ error: `Error al mover stock: ${error.message}` });
  }
};

module.exports = { getDepositos, createDeposito, deleteDeposito, moveStock };