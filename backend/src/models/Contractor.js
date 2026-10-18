import mongoose from 'mongoose'
const schema = new mongoose.Schema({ companyName: { type: String, required: true, trim: true, maxlength: 150 }, contactPerson: { type: String, trim: true }, phone: { type: String, trim: true },
  specialization: { type: String, trim: true }, active: { type: Boolean, default: true } }, { timestamps: true })
export default mongoose.models.Contractor || mongoose.model('Contractor', schema)
