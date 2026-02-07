import mongoose from 'mongoose'

const HistSchema = new mongoose.Schema({
  estadoAnterior: { type: String, default: '' },
  estadoNuevo: { type: String, default: '' },
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comentario: { type: String, default: '' },
  fecha: { type: Date, default: Date.now }
}, { _id: false })

const OrderSchema = new mongoose.Schema({
  qty: { type: Number, required: true },
  tipoPedido: { type: String, required: true },
  delivery: { type: String, required: true, unique: true, index: true },
  itemProducto: { type: String, default: '' },
  medidas: {
    ancho: { type: Number, default: 0 },
    largo: { type: Number, default: 0 },
    alto: { type: Number, default: 0 }
  },
  cajones: [{ type: String }],
  pallets: [{ type: String }],
  pesoKg: { type: Number, default: 0 },
  prioridad: { type: String, enum: ['alta', 'normal', 'baja'], default: 'normal' },
  estado: { type: String, enum: ['creado', 'aprobado', 'en_proceso', 'terminado', 'entregado'], default: 'creado' },
  usuarioCreador: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comentarios: { type: String, default: '' },
  historial: [HistSchema]
}, { timestamps: true })

export default mongoose.models.Order || mongoose.model('Order', OrderSchema)
