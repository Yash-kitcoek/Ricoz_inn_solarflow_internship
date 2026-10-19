import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import { env } from './config/env.js'
import { notFound, errorHandler } from './middleware/error.js'
import { connectDb } from './config/db.js'
import auth from './routes/auth.js'
import users from './routes/users.js'
import projects from './routes/projects.js'
import permits from './routes/permits.js'
import netMetering from './routes/netMetering.js'
import contractors from './routes/contractors.js'
import milestones from './routes/milestones.js'
import dashboard from './routes/dashboard.js'
const app = express()
app.disable('x-powered-by'); if (env.NODE_ENV === 'production') app.set('trust proxy', 1)
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }), cors({ origin: env.CLIENT_ORIGIN.split(','), credentials: true }), express.json({ limit: '100kb' }), cookieParser())
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use(async (req, res, next) => {
  try {
    await connectDb()
    next()
  } catch (err) {
    next(err)
  }
})
app.use('/api/auth', auth); app.use('/api/users', users); app.use('/api/projects', projects); app.use('/api/permits', permits); app.use('/api/net-metering', netMetering)
app.use('/api/contractors', contractors); app.use('/api/milestones', milestones); app.use('/api/dashboard', dashboard)
app.use(notFound, errorHandler)
export default app
