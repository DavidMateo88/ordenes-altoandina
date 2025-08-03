const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  codigo: { type: String },
  deposito: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposito', required: true },
  cantidad: { type: Number, required: true, min: 0 },
  unidad_medida: { type: String, required: true }
});

module.exports = mongoose.model('Stock', stockSchema);