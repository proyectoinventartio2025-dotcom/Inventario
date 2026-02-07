import connect from '../../api/_lib/mongo.js'
import User from '../../api/_lib/models/User.js'
import { requireAuth } from '../../api/_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false })
    return
  }
  try {
    const auth = await requireAuth(req, res, ['admin'])
    if (!auth) return
    await connect()
    const { nombre, email, password, rol } = req.body || {}
    const exists = await User.findOne({ email })
    if (exists) {
      res.status(409).json({ success: false, message: 'Email ya existe' })
      return
    }
    const user = await User.create({ nombre, email, password, rol: rol || 'operador' })
    res.status(201).json({ success: true, user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
