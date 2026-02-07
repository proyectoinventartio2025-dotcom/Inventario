import jwt from 'jsonwebtoken'
import connect from './mongo.js'
import User from './models/User.js'

export async function requireAuth(req, res, roles = []) {
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    res.status(401).json({ success: false, message: 'No autorizado' })
    return null
  }
  try {
    await connect()
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.id).select('-password')
    if (!user || user.active === false) {
      res.status(401).json({ success: false, message: 'No autorizado' })
      return null
    }
    if (roles.length && !roles.includes(user.rol)) {
      res.status(403).json({ success: false, message: 'Prohibido' })
      return null
    }
    req.user = user
    return user
  } catch (e) {
    res.status(401).json({ success: false, message: 'Token inválido' })
    return null
  }
}
