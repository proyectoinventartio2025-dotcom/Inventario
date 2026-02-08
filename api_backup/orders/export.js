import connect from '../../api/_lib/mongo.js'
import Order from '../../api/_lib/models/Order.js'
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
    const orders = await Order.find().sort({ createdAt: -1 })
    const lines = [
      ['Delivery', 'Tipo', 'Cantidad', 'Medidas (cm)', 'Solicitante', 'Prioridad', 'Estado', 'Peso (kg)'].join(','),
      ...orders.map(o => {
        const dims = o.medidas ? `${o.medidas.ancho}x${o.medidas.largo}x${o.medidas.alto}` : ''
        const t = o.tipoPedido || ''
        const requester = ''
        const s = o.estado || ''
        const p = o.pesoKg != null ? String(o.pesoKg) : ''
        const arr = [String(o.delivery || ''), t, o.qty ?? '', dims, requester, o.prioridad || '', s, p]
        return arr.map(v => {
          const s2 = v == null ? '' : String(v)
          return /[",\r\n]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2
        }).join(',')
      })
    ].join('\r\n')
    res.setHeader('Content-Type', 'text/csv;charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="ordenes.csv"')
    res.status(200).send('\ufeff' + lines)
  } catch (e) {
    res.status(500).json({ success: false })
  }
}
