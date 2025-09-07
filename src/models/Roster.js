const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fecha_inicio: { type: Date, required: true },
  fecha_fin: { type: Date, required: true },
  proyecto: String,
  empleados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' }],
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Roster', rosterSchema);