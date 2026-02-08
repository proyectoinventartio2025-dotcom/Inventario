import connect from '../../api/_lib/mongo.js'
import User from '../../api/_lib/models/User.js'
import { requireAuth } from '../../api/_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.status(405).json({ success: false })
    return
  }
  const auth = await requireAuth(req, res, ['admin'])
  if (!auth) return
  try {
    await connect()
    const { id } = req.query
    const user = await User.findByIdAndUpdate(id, { active: false }, { new: true })
    if (!user) {
      res.status(404).json({ success: false })
      return
    }
    res.status(200).json({ success: true })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
