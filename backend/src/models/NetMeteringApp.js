import mongoose from 'mongoose'
import { NM_STATUSES } from '../services/stuck.js'
const schema = new mongoose.Schema({ project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true }, utility: { type: String, required: true, trim: true, maxlength: 150 },
  status: { type: String, enum: NM_STATUSES, default: 'Not Started' }, statusChangedAt: { type: Date, default: Date.now },
  history: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }] }, { timestamps: true })
export default mongoose.models.NetMeteringApp || mongoose.model('NetMeteringApp', schema)
