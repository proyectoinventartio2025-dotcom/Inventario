import connect from '../../api/_lib/mongo.js'
import User from '../../api/_lib/models/User.js'
import { requireAuth } from '../../api/_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false })
    return
  }
  const auth = await requireAuth(req, res, ['admin'])
  if (!auth) return
  try {
    await connect()
    const users = await User.find().select('-password')
    res.status(200).json({ success: true, data: users })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
