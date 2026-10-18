import mongoose from 'mongoose'
import { MS_STATUSES, KINDS } from '../services/milestoneRules.js'
const user = { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
const schema = new mongoose.Schema({ project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true, index: true },
  description: { type: String, required: true, trim: true, maxlength: 200 }, amount: { type: Number, required: true, min: 1 }, dueDate: Date, status: { type: String, enum: MS_STATUSES, default: 'not_due' },
  requiredEvidence: { type: [String], enum: KINDS, default: ['panels', 'inverter', 'earthing', 'meter'] },
  evidence: [{ kind: { type: String, enum: KINDS, required: true }, file: { type: String, required: true }, mime: String, lat: { type: Number, min: -90, max: 90 }, lng: { type: Number, min: -180, max: 180 }, takenAt: { type: Date, default: Date.now }, uploadedBy: user }],
  invoice: { number: String, date: Date }, verifiedBy: user, approvedBy: user, approvalNotes: { type: String, maxlength: 500 }, payment: { reference: String, paidOn: Date, recordedBy: user } }, { timestamps: true })
export default mongoose.models.Milestone || mongoose.model('Milestone', schema)
