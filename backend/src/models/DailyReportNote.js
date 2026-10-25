import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  note: { type: String, required: true, trim: true, maxlength: 2000 },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true })

schema.index({ date: 1, createdBy: 1 })

export default mongoose.models.DailyReportNote || mongoose.model('DailyReportNote', schema)
