import mongoose from 'mongoose'

export const NOTIFICATION_TYPES = ['assigned', 'deadline_approaching', 'overdue', 'status_changed', 'project_update', 'support_request']

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, required: true, maxlength: 500 },
  dedupeKey: { type: String, required: true, maxlength: 200 },
  readAt: { type: Date, default: null }
}, { timestamps: true })

schema.index({ user: 1, dedupeKey: 1 }, { unique: true })
schema.index({ user: 1, readAt: 1, createdAt: -1 })

export default mongoose.models.Notification || mongoose.model('Notification', schema)
