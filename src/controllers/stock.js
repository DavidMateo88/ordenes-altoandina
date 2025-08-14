const Stock = require('../models/Stock');

exports.getProductos = async (req, res) => {
  try {
    const productos = await Stock.distinct('nombre');
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

exports.getStockByDeposito = async (req, res) => {
  try {
    const stock = await Stock.find({ deposito: req.params.depositoId });
    console.log('Stock enviado para depósito', req.params.depositoId, ':', stock); // Log para depuración
    res.json(stock);
  } catch (err) {
    console.error('Error al obtener stock:', err);
    res.status(500).json({ error: 'Error al obtener stock', details: err.message });
  }
};