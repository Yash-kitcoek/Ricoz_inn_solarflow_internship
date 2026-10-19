import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env.js'
export async function connectDb() {
  if (mongoose.connection.readyState >= 1) return
  if (process.platform === 'win32' && env.MONGODB_URI.startsWith('mongodb+srv')) {
    try { dns.setServers(['8.8.8.8', '1.1.1.1']) } catch {}
  }
  mongoose.set('strictQuery', true)
  await mongoose.connect(env.MONGODB_URI)
  console.log('MongoDB connected')
}
