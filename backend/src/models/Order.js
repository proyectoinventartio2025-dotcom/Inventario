const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    qty: {
        type: Number,
        required: [true, 'La cantidad es obligatoria'],
        min: [1, 'La cantidad debe ser al menos 1']
    },
    tipoPedido: {
        type: String,
        enum: ['pallet', 'cajon', 'estructura'],
        required: [true, 'El tipo de pedido es obligatorio']
    },
    delivery: {
        type: String,
        required: [true, 'El delivery es obligatorio'],
        trim: true
    },
    itemProducto: {
        type: String,
        trim: true
    },
    medidas: {
        ancho: {
            type: Number,
            required: [true, 'El ancho es obligatorio']
        },
        largo: {
            type: Number,
            required: [true, 'El largo es obligatorio']
        },
        alto: {
            type: Number,
            required: [true, 'El alto es obligatorio']
        }
    },
    cajones: [{
        qty: {
            type: Number,
            min: [1, 'La cantidad de cajones debe ser al menos 1'],
            default: 1
        },
        pesoKg: {
            type: Number,
            min: 0
        },
        medidas: {
            ancho: {
                type: Number,
                required: [true, 'El ancho del cajón es obligatorio']
            },
            largo: {
                type: Number,
                required: [true, 'El largo del cajón es obligatorio']
            },
            alto: {
                type: Number,
                required: [true, 'El alto del cajón es obligatorio']
            }
        }
    }],
    pallets: [{
        qty: {
            type: Number,
            min: [1, 'La cantidad de pallets debe ser al menos 1'],
            default: 1
        },
        pesoKg: {
            type: Number,
            min: 0
        },
        medidas: {
            ancho: {
                type: Number,
                required: [true, 'El ancho del pallet es obligatorio']
            },
            largo: {
                type: Number,
                required: [true, 'El largo del pallet es obligatorio']
            },
            alto: {
                type: Number,
                required: [true, 'El alto del pallet es obligatorio']
            }
        }
    }],
    pesoKg: {
        type: Number,
        required: [true, 'El peso es obligatorio']
    },
    prioridad: {
        type: String,
        enum: ['urgente', 'no_tan_urgente', 'normal'],
        default: 'normal'
    },
    estado: {
        type: String,
        enum: ['creado', 'aprobado', 'en_proceso', 'terminado', 'entregado'],
        default: 'creado'
    },
    fechaTerminado: {
        type: Date
    },
    terminadoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comentarios: {
        type: String,
        trim: true
    },
    usuarioCreador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    historial: [{
        estadoAnterior: String,
        estadoNuevo: String,
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        comentario: String,
        fecha: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Índices para búsquedas rápidas
orderSchema.index({ delivery: 1 }, { unique: true });
orderSchema.index({ prioridad: 1, createdAt: -1 });
orderSchema.index({ estado: 1 });

module.exports = mongoose.model('Order', orderSchema);
