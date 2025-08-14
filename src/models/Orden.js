const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  descripcion: { type: String, required: true },
  cantidad: { type: Number, required: true },
  unidad_medida: { type: String, required: true },
  precio_unitario: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 }
});

const ordenSchema = new mongoose.Schema({
  proyecto: { type: String, required: true },
  ubicacion: { type: String, required: true },
  deposito: { type: mongoose.Schema.Types.ObjectId, ref: 'Deposito', required: true },
  observaciones: { type: String },
  items: [itemSchema],
  total_estimado: { type: Number, default: 0 },
  estado: { 
    type: String, 
    enum: ['Pendiente', 'Cotizada', 'Modificada', 'Aprobada', 'Rechazada', 'Completada'], 
    default: 'Pendiente' 
  },
  creado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cotizado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comentarios_cotizacion: { type: String },
  aprobado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rechazado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  razon_rechazo: { type: String },
  facturas: [{ type: String }],
  fecha_creacion: { type: Date, default: Date.now },
  fecha_modificacion: { type: Date }
});

module.exports = mongoose.model('Orden', ordenSchema);