const mongoose = require('mongoose');

const EmpleadoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  rol: { type: String, required: true },
  estado: { type: String, enum: ['activo', 'descanso', 'licencia', 'baja'], default: 'activo' },
  proyecto: { type: String },
  licencias: [{
    tipo: { type: String, enum: ['médica', 'vacaciones'], required: true },
    fecha_inicio: { type: Date, required: true },
    fecha_fin: { type: Date, required: true },
    comentarios: { type: String }
  }],
  auditLog: [{
    action: { type: String, enum: ['create', 'update', 'delete', 'licencia'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }]
});

module.exports = mongoose.model('Empleado', EmpleadoSchema);