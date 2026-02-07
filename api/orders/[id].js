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
  if (req.method !== 'PUT') {
    res.status(405).json({ success: false })
    return
  }
  const auth = await requireAuth(req, res, ['admin', 'operador', 'carpintero'])
  if (!auth) return
  try {
    await connect()
    const { id } = req.query
    const { status, priority, comentario } = req.body || {}
    const update = {}
    if (status) {
      const s = toDbEstado(status)
      if (s) update.estado = s
    }
    if (priority) update.prioridad = String(priority).toLowerCase()
    if (comentario) update.$push = { historial: { estadoAnterior: '', estadoNuevo: update.estado || '', usuario: auth._id, comentario } }
    const order = await Order.findOneAndUpdate({ delivery: id }, update, { new: true })
    if (!order) {
      res.status(404).json({ success: false })
      return
    }
    res.status(200).json({ success: true, data: order })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
