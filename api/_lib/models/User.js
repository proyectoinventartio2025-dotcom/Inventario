import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const UserSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['admin', 'operador', 'carpintero'], default: 'operador' },
  active: { type: Boolean, default: true }
}, { timestamps: true })

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

UserSchema.methods.compararPassword = function(pwd) {
  return bcrypt.compare(pwd, this.password)
}

export default mongoose.models.User || mongoose.model('User', UserSchema)
