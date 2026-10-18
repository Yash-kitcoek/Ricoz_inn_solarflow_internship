import mongoose from 'mongoose'
export const PROJECT_STATUSES = ['Draft', 'Planning', 'Permitting', 'Design', 'Ready for Installation', 'Installation in Progress', 'Inspection', 'Commissioning', 'Completed', 'On Hold']
const ref = name => ({ type: mongoose.Schema.Types.ObjectId, ref: name, default: null })
const schema = new mongoose.Schema({ code: { type: String, unique: true, required: true }, name: { type: String, required: true, trim: true, maxlength: 150 }, customerName: { type: String, required: true, trim: true, maxlength: 150 },
  type: { type: String, enum: ['Residential', 'Commercial'], required: true }, capacityKw: { type: Number, required: true, min: 0.1 }, contractValue: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: PROJECT_STATUSES, default: 'Draft' }, progress: { type: Number, default: 0, min: 0, max: 100 }, projectManager: ref('User'), engineer: ref('User'),
  startDate: Date, endDate: Date, notes: { type: String, maxlength: 2000 }, archived: { type: Boolean, default: false } }, { timestamps: true })
export default mongoose.models.Project || mongoose.model('Project', schema)
