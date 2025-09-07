const mongoose = require('mongoose');

const RosterSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fecha_inicio: { type: Date, required: true },
  fecha_fin: { type: Date, required: true },
  proyecto: { type: String },
  empleados: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Empleado' }],
  auditLog: [{
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }]
});

module.exports = mongoose.model('Roster', RosterSchema);