const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  codigo: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 0 },
  deposito: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposito', required: true }
});

module.exports = mongoose.model('Stock', stockSchema);