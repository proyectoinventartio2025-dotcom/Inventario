import connect from '../../../api/_lib/mongo.js'
import Order from '../../../api/_lib/models/Order.js'
import { requireAuth } from '../../../api/_lib/auth.js'

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
    const { comentario } = req.body || {}
    const update = { $push: { historial: { estadoAnterior: '', estadoNuevo: '', usuario: auth._id, comentario } } }
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
