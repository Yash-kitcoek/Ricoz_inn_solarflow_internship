import mongoose from 'mongoose'
export const PERMIT_STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Blocked']
const schema = new mongoose.Schema({ project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, title: { type: String, required: true, trim: true, maxlength: 200 },
  dueDate: Date, priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' }, status: { type: String, enum: PERMIT_STATUSES, default: 'Not Started' },
  reason: { type: String, maxlength: 500 }, approvedOn: Date }, { timestamps: true })
export default mongoose.models.PermitItem || mongoose.model('PermitItem', schema)
