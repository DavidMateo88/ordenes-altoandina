const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  codigo: { type: String },
  cantidad: { type: Number, required: true },
  unidad_medida: { type: String, required: true },
  precio_unitario: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 },
});

module.exports = mongoose.model('Item', itemSchema);