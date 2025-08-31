const mongoose = require('mongoose');

const ProyectoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Proyecto', ProyectoSchema);