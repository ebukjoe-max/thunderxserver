// models/Session.js
import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  expiresAt: { type: Date, required: true }
})

export default mongoose.model('Session', sessionSchema)
