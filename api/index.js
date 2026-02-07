export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ success: false })
    return
  }
  res.status(200).json({ success: true })
}
