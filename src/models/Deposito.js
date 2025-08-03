const mongoose = require('mongoose');

const depositoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  ubicacion: { type: String, required: true }
});

module.exports = mongoose.model('Deposito', depositoSchema);