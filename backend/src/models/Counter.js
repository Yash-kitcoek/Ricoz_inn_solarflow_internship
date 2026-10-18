import mongoose from 'mongoose'
const schema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 1000 } })
const Counter = mongoose.models.Counter || mongoose.model('Counter', schema)
export const nextSeq = async name => (await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true })).seq
export default Counter
