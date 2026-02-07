require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const { protect, admin } = require('./middleware/auth');
const User = require('./models/User');
const Order = require('./models/Order');

const corsOrigin = process.env.CORS_ORIGIN;
if (process.env.NODE_ENV !== 'production' || corsOrigin) {
    const origin = corsOrigin
        ? corsOrigin.split(',').map(s => s.trim()).filter(Boolean)
        : undefined;
    app.use(cors(origin ? { origin } : undefined));
}

const stripHash = (value) => String(value || '').trim().replace(/^#/, '');

const csvEscape = (value) => {
    const s = value == null ? '' : String(value);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
};

const toUIStatus = (estado) => {
    switch (estado) {
        case 'creado': return 'Creado';
        case 'aprobado': return 'Aprobado';
        case 'en_proceso': return 'En Proceso';
        case 'terminado': return 'Terminado';
        case 'entregado': return 'Terminado';
        default: return 'Creado';
    }
};

const toDbEstado = (status) => {
    const s = String(status || '').trim().toLowerCase();
    if (s === 'creado') return 'creado';
    if (s === 'aprobado') return 'aprobado';
    if (s === 'en proceso' || s === 'en_proceso') return 'en_proceso';
    if (s === 'terminado') return 'terminado';
    if (s === 'entregado') return 'terminado';
    return 'creado';
};

const toUITipo = (tipoPedido) => {
    if (tipoPedido === 'cajon') return 'Cajón';
    if (tipoPedido === 'estructura') return 'Set Completo (Pallet + Cajón)';
    return 'Pallet';
};

const toUIPriority = (prioridad) => {
    if (prioridad === 'urgente') return 'urgente';
    return 'normal';
};

const toOrderDTO = (order) => {
    const delivery = stripHash(order.delivery);
    const baseDims = `${order.medidas?.largo ?? ''}x${order.medidas?.ancho ?? ''}x${order.medidas?.alto ?? ''}`.replace(/^x|x$/g, '');
    const cajonesDims = Array.isArray(order.cajones) ? order.cajones.map(c => {
        const d = `${c.medidas?.largo ?? ''}x${c.medidas?.ancho ?? ''}x${c.medidas?.alto ?? ''}`.replace(/^x|x$/g, '');
        const qty = typeof c.qty === 'number' && c.qty > 1 ? ` x${c.qty}` : '';
        const w = typeof c.pesoKg === 'number' && Number.isFinite(c.pesoKg) ? ` (${c.pesoKg}kg)` : '';
        return d ? `${d}${qty}${w}` : '';
    }).filter(Boolean) : [];
    const palletsDims = Array.isArray(order.pallets) ? order.pallets.map(p => {
        const d = `${p.medidas?.largo ?? ''}x${p.medidas?.ancho ?? ''}x${p.medidas?.alto ?? ''}`.replace(/^x|x$/g, '');
        const qty = typeof p.qty === 'number' && p.qty > 1 ? ` x${p.qty}` : '';
        const w = typeof p.pesoKg === 'number' && Number.isFinite(p.pesoKg) ? ` (${p.pesoKg}kg)` : '';
        return d ? `${d}${qty}${w}` : '';
    }).filter(Boolean) : [];
    let dims = baseDims;
    if (order.tipoPedido === 'estructura') {
        const palletParts = [baseDims, ...palletsDims].filter(Boolean);
        const palletLabel = palletParts.length ? `Pallet: ${palletParts.join(' • ')}` : '';
        const cajonLabel = cajonesDims.length ? `Cajón(es): ${cajonesDims.join(' • ')}` : '';
        dims = [palletLabel, cajonLabel].filter(Boolean).join(' | ');
    } else if (order.tipoPedido === 'cajon' && cajonesDims.length) {
        dims = [baseDims, ...cajonesDims].filter(Boolean).join(' • ');
    } else if (order.tipoPedido === 'pallet' && palletsDims.length) {
        dims = [baseDims, ...palletsDims].filter(Boolean).join(' • ');
    }
    const requester = typeof order.usuarioCreador === 'object' && order.usuarioCreador ? order.usuarioCreador.nombre : undefined;

    return {
        id: `#${delivery}`,
        recordId: order._id.toString(),
        type: toUITipo(order.tipoPedido),
        qty: order.qty,
        dims,
        pesoKg: order.pesoKg,
        weight: typeof order.pesoKg === 'number' ? `${order.pesoKg} kg` : undefined,
        requester: requester || 'Operador',
        priority: toUIPriority(order.prioridad),
        status: toUIStatus(order.estado),
        createdAt: order.createdAt,
        finishedAt: order.fechaTerminado
    };
};

const ensureBootstrapAdmin = async () => {
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim();
    const nombre = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim() || 'Admin';

    if (!email || !password) return;

    const existing = await User.findOne({ email });
    if (existing) return;

    await User.create({
        nombre,
        email,
        password,
        rol: 'admin',
        active: true
    });
};

const seedDemoData = async () => {
    const demoUsers = [
        { nombre: 'Admin Demo', email: 'admin@carpinteria.com', password: '123456', rol: 'admin' },
        { nombre: 'Operador Demo', email: 'operador@carpinteria.com', password: '123456', rol: 'operador' },
        { nombre: 'Carpintero Demo', email: 'carpintero@carpinteria.com', password: '123456', rol: 'carpintero' }
    ];

    const createdUsers = [];
    for (const u of demoUsers) {
        const exists = await User.findOne({ email: u.email });
        if (!exists) {
            const created = await User.create({ ...u, active: true });
            createdUsers.push(created);
        }
    }

    const ordersCount = await Order.countDocuments();
    if (ordersCount === 0) {
        const operador = await User.findOne({ email: 'operador@carpinteria.com' });
        const adminUser = await User.findOne({ email: 'admin@carpinteria.com' });

        const creator = operador || adminUser;
        if (creator) {
            await Order.create([
                {
                    qty: 2,
                    tipoPedido: 'pallet',
                    delivery: '4421',
                    itemProducto: '',
                    medidas: { largo: 120, ancho: 100, alto: 15 },
                    pesoKg: 200,
                    prioridad: 'urgente',
                    estado: 'en_proceso',
                    comentarios: '',
                    usuarioCreador: creator._id,
                    historial: []
                },
                {
                    qty: 1,
                    tipoPedido: 'cajon',
                    delivery: '4425',
                    itemProducto: '',
                    medidas: { largo: 150, ancho: 50, alto: 80 },
                    pesoKg: 120,
                    prioridad: 'normal',
                    estado: 'creado',
                    comentarios: '',
                    usuarioCreador: creator._id,
                    historial: []
                }
            ]);
        }
    }

    return createdUsers.length;
};

app.get('/api', (req, res) => {
    res.json({
        message: 'API de Gestión de Pedidos - Carpintería Industrial',
        mode: 'MongoDB + JWT',
        env: process.env.NODE_ENV || 'development'
    });
});

app.use('/api/auth', authRoutes);

app.get('/api/users', protect, admin, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json({
            success: true,
            data: users.map(u => ({
                _id: u._id,
                nombre: u.nombre,
                email: u.email,
                rol: u.rol,
                active: u.active
            }))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
    }
});

app.delete('/api/users/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        user.active = false;
        await user.save();

        res.json({ success: true, message: 'Usuario desactivado correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    }
});

app.get('/api/orders', protect, async (req, res) => {
    try {
        const baseFilter = req.user.rol === 'operador' ? { usuarioCreador: req.user._id } : {};
        const status = req.query.status ? toDbEstado(req.query.status) : null;
        const priority = req.query.priority ? String(req.query.priority).trim() : null;
        const q = req.query.q ? stripHash(req.query.q) : null;
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 25);

        const filter = { ...baseFilter };
        if (status) filter.estado = status;
        if (priority) filter.prioridad = priority;
        if (q) filter.delivery = new RegExp(q, 'i');

        const total = await Order.countDocuments(filter);
        const orders = await Order.find(filter)
            .populate('usuarioCreador', 'nombre')
            .sort({ createdAt: -1 })
            .skip(Math.max(0, (page - 1) * limit))
            .limit(Math.max(1, limit));

        res.json({
            success: true,
            data: orders.map(toOrderDTO),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit)))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener órdenes' });
    }
});

app.get('/api/orders/export', protect, admin, async (req, res) => {
    try {
        const status = req.query.status ? toDbEstado(req.query.status) : null;
        const priority = req.query.priority ? String(req.query.priority).trim() : null;
        const q = req.query.q ? stripHash(req.query.q) : null;

        const filter = {};
        if (status) filter.estado = status;
        if (priority) filter.prioridad = priority;
        if (q) filter.delivery = new RegExp(q, 'i');

        const orders = await Order.find(filter)
            .populate('usuarioCreador', 'nombre')
            .sort({ createdAt: -1 });

        const now = new Date();
        const datePart = [
            String(now.getFullYear()).padStart(4, '0'),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');
        const timePart = [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0')
        ].join('');
        const filename = `ordenes-${datePart}-${timePart}.csv`;

        const header = [
            'Delivery',
            'Tipo',
            'Cantidad',
            'Peso (kg)',
            'Medidas (cm)',
            'Solicitante',
            'Prioridad',
            'Estado',
            'Fecha Creación',
            'Fecha Terminado',
            'Item Producto',
            'Comentarios'
        ].join(',');

        const rows = orders.map((order) => {
            const dto = toOrderDTO(order);
            const createdAt = order.createdAt ? new Date(order.createdAt).toISOString() : '';
            const finishedAt = order.fechaTerminado ? new Date(order.fechaTerminado).toISOString() : '';
            const requester = (typeof order.usuarioCreador === 'object' && order.usuarioCreador && order.usuarioCreador.nombre) ? order.usuarioCreador.nombre : '';

            return [
                csvEscape(stripHash(order.delivery)),
                csvEscape(dto.type),
                csvEscape(order.qty),
                csvEscape(order.pesoKg),
                csvEscape(dto.dims),
                csvEscape(requester),
                csvEscape(dto.priority),
                csvEscape(dto.status),
                csvEscape(createdAt),
                csvEscape(finishedAt),
                csvEscape(order.itemProducto || ''),
                csvEscape(order.comentarios || '')
            ].join(',');
        });

        const csv = '\ufeff' + [header, ...rows].join('\r\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200).send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al exportar órdenes' });
    }
});

app.post('/api/orders', protect, async (req, res) => {
    try {
        if (!['operador', 'admin'].includes(req.user.rol)) {
            return res.status(403).json({ success: false, message: 'No autorizado para crear órdenes' });
        }

        const { delivery, tipoPedido, qty, medidas, pesoKg, prioridad, comentarios, itemProducto, cajones, pallets } = req.body;

        if (!delivery || !tipoPedido || !qty || !medidas || !pesoKg) {
            return res.status(400).json({ success: false, message: 'Faltan datos requeridos' });
        }

        const cleanDelivery = stripHash(delivery);
        const exists = await Order.exists({ delivery: cleanDelivery });
        if (exists) {
            return res.status(409).json({ success: false, message: 'El delivery ya existe' });
        }

        const parsedCajones = Array.isArray(cajones) ? cajones.map(c => ({
            qty: Number(c.qty) || 1,
            pesoKg: c.pesoKg == null || c.pesoKg === '' ? undefined : Number(c.pesoKg),
            medidas: {
                largo: Number(c.medidas?.largo),
                ancho: Number(c.medidas?.ancho),
                alto: Number(c.medidas?.alto)
            }
        })).filter(c => c.medidas.largo > 0 && c.medidas.ancho > 0 && c.medidas.alto > 0 && c.qty > 0) : [];
        const parsedPallets = Array.isArray(pallets) ? pallets.map(p => ({
            qty: Number(p.qty) || 1,
            pesoKg: p.pesoKg == null || p.pesoKg === '' ? undefined : Number(p.pesoKg),
            medidas: {
                largo: Number(p.medidas?.largo),
                ancho: Number(p.medidas?.ancho),
                alto: Number(p.medidas?.alto)
            }
        })).filter(p => p.medidas.largo > 0 && p.medidas.ancho > 0 && p.medidas.alto > 0 && p.qty > 0) : [];
        const totalQty = Number(qty) 
            + parsedCajones.reduce((acc, c) => acc + (Number(c.qty) || 0), 0)
            + parsedPallets.reduce((acc, p) => acc + (Number(p.qty) || 0), 0);

        const newOrder = await Order.create({
            qty: totalQty,
            tipoPedido,
            delivery: cleanDelivery,
            itemProducto: itemProducto || '',
            medidas: {
                largo: Number(medidas.largo),
                ancho: Number(medidas.ancho),
                alto: Number(medidas.alto)
            },
            cajones: parsedCajones,
            pallets: parsedPallets,
            pesoKg: Number(pesoKg),
            prioridad: prioridad || 'normal',
            estado: 'creado',
            comentarios: comentarios || '',
            usuarioCreador: req.user._id,
            historial: []
        });

        const populated = await Order.findById(newOrder._id).populate('usuarioCreador', 'nombre');
        res.status(201).json({ success: true, data: toOrderDTO(populated) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al crear orden' });
    }
});

app.get('/api/orders/check/:delivery', protect, async (req, res) => {
    try {
        const delivery = stripHash(req.params.delivery);
        const exists = await Order.exists({ delivery });
        res.json({ success: true, exists: !!exists });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al verificar delivery' });
    }
});
app.put('/api/orders/record/:id', protect, async (req, res) => {
    try {
        if (!['carpintero', 'admin', 'operador'].includes(req.user.rol)) {
            return res.status(403).json({ success: false, message: 'No autorizado para actualizar órdenes' });
        }

        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden no encontrada' });
        }

        if (req.user.rol === 'operador' && String(order.usuarioCreador) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'No autorizado para editar esta orden' });
        }

        const previousEstado = order.estado;
        const previousPrioridad = order.prioridad;

        if (req.user.rol === 'operador') {
            if (req.body.priority) {
                order.prioridad = req.body.priority;
            }
        } else {
            if (req.body.status) {
                order.estado = toDbEstado(req.body.status);
            }
            if (req.body.priority) {
                order.prioridad = req.body.priority;
            }
        }

        const estadoChanged = order.estado !== previousEstado;
        const prioridadChanged = order.prioridad !== previousPrioridad;

        if (estadoChanged && order.estado === 'terminado') {
            order.fechaTerminado = new Date();
            order.terminadoPor = req.user._id;
        }

        if (estadoChanged || prioridadChanged) {
            order.historial.push({
                estadoAnterior: previousEstado,
                estadoNuevo: order.estado,
                usuario: req.user._id,
                comentario: req.body.comentario || ''
            });
        }

        await order.save();
        const populated = await Order.findById(order._id).populate('usuarioCreador', 'nombre');
        res.json({ success: true, data: toOrderDTO(populated) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar orden' });
    }
});
app.put('/api/orders/:id', protect, async (req, res) => {
    try {
        if (!['carpintero', 'admin', 'operador'].includes(req.user.rol)) {
            return res.status(403).json({ success: false, message: 'No autorizado para actualizar órdenes' });
        }

        const delivery = stripHash(req.params.id);
        const order = await Order.findOne({ delivery });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden no encontrada' });
        }

        if (req.user.rol === 'operador' && String(order.usuarioCreador) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'No autorizado para editar esta orden' });
        }

        const previousEstado = order.estado;
        const previousPrioridad = order.prioridad;

        if (req.user.rol === 'operador') {
            if (req.body.priority) {
                order.prioridad = req.body.priority;
            }
        } else {
            if (req.body.status) {
                order.estado = toDbEstado(req.body.status);
            }
            if (req.body.priority) {
                order.prioridad = req.body.priority;
            }
        }

        const estadoChanged = order.estado !== previousEstado;
        const prioridadChanged = order.prioridad !== previousPrioridad;

        if (estadoChanged && order.estado === 'terminado') {
            order.fechaTerminado = new Date();
            order.terminadoPor = req.user._id;
        }

        if (estadoChanged || prioridadChanged) {
            order.historial.push({
                estadoAnterior: previousEstado,
                estadoNuevo: order.estado,
                usuario: req.user._id,
                comentario: req.body.comentario || ''
            });
        }

        await order.save();
        const populated = await Order.findById(order._id).populate('usuarioCreador', 'nombre');
        res.json({ success: true, data: toOrderDTO(populated) });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al actualizar orden' });
    }
});

app.delete('/api/orders/:id', protect, async (req, res) => {
    try {
        if (!['admin', 'operador'].includes(req.user.rol)) {
            return res.status(403).json({ success: false, message: 'No autorizado para eliminar órdenes' });
        }

        const delivery = stripHash(req.params.id);
        const order = await Order.findOne({ delivery });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Orden no encontrada' });
        }

        if (req.user.rol === 'operador' && String(order.usuarioCreador) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'No autorizado para eliminar esta orden' });
        }

        await order.deleteOne();
        res.json({ success: true, message: 'Orden eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar orden' });
    }
});
app.delete('/api/orders/delivery/:delivery', protect, admin, async (req, res) => {
    try {
        const delivery = stripHash(req.params.delivery);
        const result = await Order.deleteMany({ delivery });
        res.json({ success: true, deletedCount: result.deletedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar por delivery' });
    }
});

if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, '../../frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

app.use((req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    res.status(404).send('Not found');
});

const PORT = process.env.PORT || 5000;

// Conexión a DB para Vercel (se ejecuta en cada invocación si no está caliente, pero Mongoose maneja el pool)
connectDB();

// Solo iniciar el servidor si se ejecuta directamente (Local / VPS)
if (require.main === module) {
    const startServer = async () => {
        // En local, esperamos explícitamente y sembramos datos si es necesario
        const shouldSeed = process.env.DEMO_SEED === 'true' || (process.env.NODE_ENV !== 'production');
        if (shouldSeed) {
            await seedDemoData();
        }
        await ensureBootstrapAdmin();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor API escuchando en http://localhost:${PORT}`);
        });
    };
    startServer();
}

module.exports = app;
