const mongoose = require('mongoose');
const Stock = require('../models/Stock');

const getStock = async (req, res) => {
  try {
    const stock = await Stock.find().populate('deposito', 'nombre ubicacion');
    res.json(stock);
  } catch (error) {
    console.error('Error al obtener stock:', error.message);
    res.status(500).json({ error: 'Error al obtener stock' });
  }
};

module.exports = { getStock };