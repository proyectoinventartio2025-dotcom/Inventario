import mongoose from 'mongoose'

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
  return cached.conn
}
