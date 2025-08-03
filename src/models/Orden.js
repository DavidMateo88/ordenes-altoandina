const mongoose = require('mongoose');

const ordenSchema = new mongoose.Schema({
  solicitante: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  proyecto: { type: String, required: true },
  ubicacion: { type: String, required: true },
  deposito: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposito', required: true },
  items: [{
    descripcion: { type: String, required: true },
    codigo: { type: String },
    cantidad: { type: Number, required: true },
    unidad_medida: { type: String, required: true },
    precio_unitario: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 }
  }],
  total_estimado: { type: Number, default: 0 },
  estado: { type: String, enum: ['Pendiente', 'Cotizada', 'Aprobada', 'Rechazada', 'Completada', 'Modificada'], default: 'Pendiente' },
  fecha_emision: { type: Date, default: Date.now },
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  modificado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fecha_modificacion: { type: Date },
  cotizado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  aprobado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rechazado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  razon_rechazo: { type: String },
  factura: { type: String },
  observaciones: { type: String },
  comentarios_cotizacion: { type: String } // Nuevo campo para comentarios al cotizar
});

module.exports = mongoose.model('Orden', ordenSchema);