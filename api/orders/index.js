import connect from '../../api/_lib/mongo.js'
import Order from '../../api/_lib/models/Order.js'
import { requireAuth } from '../../api/_lib/auth.js'

function toDbEstado(value) {
  const v = String(value || '').toLowerCase()
  if (v === 'creado') return 'creado'
  if (v === 'aprobado') return 'aprobado'
  if (v === 'en proceso' || v === 'en_proceso') return 'en_proceso'
  if (v === 'terminado') return 'terminado'
  if (v === 'entregado') return 'entregado'
  return ''
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const auth = await requireAuth(req, res, [])
    if (!auth) return
    try {
      await connect()
      const { status, priority, q, page = '1', limit = '25' } = req.query
      const query = {}
      if (status) {
        const s = toDbEstado(status)
        if (s) query.estado = s
      }
      if (priority) query.prioridad = String(priority).toLowerCase()
      if (q) query.delivery = { $regex: String(q), $options: 'i' }
      const p = Math.max(1, parseInt(page, 10) || 1)
      const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 25))
      const cursor = Order.find(query).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
      const [items, total] = await Promise.all([cursor.exec(), Order.countDocuments(query)])
      res.status(200).json({ success: true, data: items, meta: { total, totalPages: Math.ceil(total / l), page: p, limit: l } })
    } catch (e) {
      res.status(500).json({ success: false })
    }
    return
  }
  if (req.method === 'POST') {
    const auth = await requireAuth(req, res, ['admin', 'operador'])
    if (!auth) return
    try {
      await connect()
      const body = req.body || {}
      const exists = await Order.findOne({ delivery: body.delivery })
      if (exists) {
        res.status(409).json({ success: false, message: 'Delivery ya existe' })
        return
      }
      const order = await Order.create({
        qty: body.qty,
        tipoPedido: body.tipoPedido,
        delivery: body.delivery,
        itemProducto: body.itemProducto,
        medidas: body.medidas,
        cajones: body.cajones || [],
        pallets: body.pallets || [],
        pesoKg: body.pesoKg,
        prioridad: body.prioridad || 'normal',
        estado: 'creado',
        usuarioCreador: auth._id,
        comentarios: body.comentarios || ''
      })
      res.status(201).json({ success: true, data: order })
    } catch (e) {
      res.status(500).json({ success: false })
    }
    return
  }
  res.status(405).json({ success: false })
}
