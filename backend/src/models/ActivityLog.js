import mongoose from 'mongoose'
const schema = new mongoose.Schema({ project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true }, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, actorName: String, action: { type: String, required: true }, detail: String }, { timestamps: { createdAt: 'at', updatedAt: false } })
const Log = mongoose.models.ActivityLog || mongoose.model('ActivityLog', schema)
export const record = (user, project, action, detail = '') => Log.create({ project, actor: user._id, actorName: user.name, action, detail }).catch(e => console.error('activity log failed:', e.message))
export default Log
