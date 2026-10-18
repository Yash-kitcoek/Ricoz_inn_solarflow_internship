import mongoose from 'mongoose'
export const ROLES = ['admin', 'project_manager', 'engineer', 'contractor', 'finance']
const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true, maxlength: 100 }, email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ROLES, default: 'contractor' }, approved: { type: Boolean, default: false },
  contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', default: null } }, { timestamps: true })
schema.methods.toSafe = function () { return { id: this._id, name: this.name, email: this.email, role: this.role, approved: this.approved, contractor: this.contractor } }
export default mongoose.models.User || mongoose.model('User', schema)
