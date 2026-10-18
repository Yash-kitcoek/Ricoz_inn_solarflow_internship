import mongoose from 'mongoose'
import app from './app.js'
import { env } from './config/env.js'
import { connectDb } from './config/db.js'
await connectDb()
const server = app.listen(env.PORT, () => console.log(`API listening on http://localhost:${env.PORT}`))
const stop = async () => { server.close(); await mongoose.disconnect(); process.exit(0) }
process.on('SIGINT', stop); process.on('SIGTERM', stop)
