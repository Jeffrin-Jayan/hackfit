import mongoose from 'mongoose'

const audioSchema = new mongoose.Schema({
  user_id: { type: String, required: false },
  session_id: { type: String, required: false },
  file_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  ai_detected: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
})

export const Audio = mongoose.model('Audio', audioSchema)

export async function createAudioRecord(data) {
  const audio = new Audio(data)
  const saved = await audio.save()
  return saved
}

export async function getAudioById(id) {
  return Audio.findById(id).lean()
}
