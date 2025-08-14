const Deposito = require('../models/Deposito');
const Stock = require('../models/Stock');

exports.createDeposito = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { nombre, ubicacion } = req.body;
  if (!nombre || !ubicacion) {
    return res.status(400).json({ error: 'Nombre y ubicación son requeridos' });
  }
  try {
    const deposito = new Deposito({ nombre, ubicacion });
    await deposito.save();
    res.json(deposito);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear depósito' });
  }
};

exports.getDepositos = async (req, res) => {
  try {
    const depositos = await Deposito.find();
    res.json(depositos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener depósitos' });
  }
};

exports.deleteDeposito = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  try {
    const deposito = await Deposito.findById(req.params.id);
    if (!deposito) {
      return res.status(404).json({ error: 'Depósito no encontrado' });
    }
    const stock = await Stock.find({ deposito: req.params.id });
    if (stock.length > 0) {
      return res.status(400).json({ error: 'No se puede eliminar un depósito con stock' });
    }
    await deposito.remove();
    res.json({ message: 'Depósito eliminado exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar depósito' });
  }
};

exports.moverStock = async (req, res) => {
  if (req.user.role !== 'Gerente') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const { producto, origenDeposito, destinoDeposito, cantidad } = req.body;
  if (!producto || !origenDeposito || !destinoDeposito || cantidad <= 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  try {
    const origenStock = await Stock.findOne({ nombre: producto, deposito: origenDeposito });
    if (!origenStock || origenStock.cantidad < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente en depósito de origen' });
    }
    origenStock.cantidad -= cantidad;
    if (origenStock.cantidad === 0) {
      await origenStock.remove();
    } else {
      await origenStock.save();
    }
    const destinoStock = await Stock.findOne({ nombre: producto, deposito: destinoDeposito });
    if (destinoStock) {
      destinoStock.cantidad += cantidad;
      await destinoStock.save();
    } else {
      await Stock.create({ 
        nombre: producto, 
        codigo: producto, // En producción, usar un código único
        cantidad, 
        deposito: destinoDeposito 
      });
    }
    res.json({ message: 'Stock movido exitosamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al mover stock' });
  }
};