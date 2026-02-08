import jwt from 'jsonwebtoken'
import connect from '../../api/_lib/mongo.js'
import User from '../../api/_lib/models/User.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false })
    return
  }
  try {
    await connect()
    const { email, password } = req.body || {}
    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' })
      return
    }
    const ok = await user.compararPassword(password)
    if (!ok) {
      res.status(401).json({ success: false, message: 'Credenciales inválidas' })
      return
    }
    const token = jwt.sign({ id: user._id, rol: user.rol }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.status(200).json({ success: true, token, user: { id: user._id, nombre: user.nombre, email: user.email, rol: user.rol } })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
