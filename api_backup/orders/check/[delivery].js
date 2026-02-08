import connect from '../../../api/_lib/mongo.js'
import Order from '../../../api/_lib/models/Order.js'
import { requireAuth } from '../../../api/_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false })
    return
  }
  const auth = await requireAuth(req, res, [])
  if (!auth) return
  try {
    await connect()
    const { delivery } = req.query
    const exists = await Order.findOne({ delivery })
    res.status(200).json({ success: true, exists: !!exists })
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
