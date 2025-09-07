const mongoose = require('mongoose');

const empleadoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  rol: { type: String, required: true },
  estado: { type: String, enum: ['activo', 'descanso', 'licencia', 'baja'], required: true },
  proyecto: { type: String },
  licencias: [{
    tipo: { type: String, enum: ['médica', 'vacaciones'], required: true },
    fecha_inicio: { type: Date, required: true },
    fecha_fin: { type: Date, required: true },
    comentarios: String
  }],
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Empleado', empleadoSchema);