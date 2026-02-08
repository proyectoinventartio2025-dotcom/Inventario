import mongoose from 'mongoose'
import User from './models/User.js'

let cached = global._mongoCached
if (!cached) {
  cached = { conn: null, promise: null }
  global._mongoCached = cached
}

export default async function connect() {
  if (cached.conn) return cached.conn
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing')
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 5
    }).then(m => m)
  }
  cached.conn = await cached.promise
  if (!global._bootstrapAdminChecked) {
    global._bootstrapAdminChecked = true
    await maybeBootstrapAdmin()
  }
  return cached.conn
}

async function maybeBootstrapAdmin() {
  try {
    const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim().toLowerCase()
    const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '').trim()
    const nombre = String(process.env.BOOTSTRAP_ADMIN_NAME || '').trim() || 'Admin'
    if (!email || !password) return
    const existing = await User.findOne({ email })
    if (existing) return
    await User.create({
      nombre,
      email,
      password,
      rol: 'admin',
      active: true
    })
  } catch {}
}
