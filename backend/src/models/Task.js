import mongoose from 'mongoose'

export const TASK_STATUSES = ['To Do', 'In Progress', 'Completed', 'Blocked']
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
  priority: { type: String, enum: TASK_PRIORITIES, default: 'Medium' },
  dueDate: { type: Date, default: null },
  status: { type: String, enum: TASK_STATUSES, default: 'To Do', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  completedAt: { type: Date, default: null },
  statusHistory: [{ _id: false, status: { type: String, enum: TASK_STATUSES }, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }]
}, { timestamps: true })

schema.index({ assignedTo: 1, status: 1, dueDate: 1 })
schema.index({ project: 1, createdAt: -1 })

export default mongoose.models.Task || mongoose.model('Task', schema)
