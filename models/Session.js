// models/Session.js
import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: String, required: true }, // remove unique: true
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 60 } // auto-expire after 1h
})

export default mongoose.model('Session', sessionSchema)
