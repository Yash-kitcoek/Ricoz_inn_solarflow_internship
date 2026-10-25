import mongoose from 'mongoose'

export const CUSTOMER_REQUEST_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

const schema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: CUSTOMER_REQUEST_STATUSES, default: 'Open' },
  response: { type: String, trim: true, maxlength: 2000, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true })

schema.index({ project: 1, createdAt: -1 })
schema.index({ status: 1, updatedAt: -1 })

export default mongoose.models.CustomerRequest || mongoose.model('CustomerRequest', schema)
