import { AppError } from '../utils/AppError.js'
import { env } from '../config/env.js'
export const notFound = (req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` })
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message })
  if (err.name === 'ZodError') return res.status(400).json({ error: 'Validation failed', details: err.issues.map(i => ({ path: i.path.join('.'), message: i.message })) })
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' })
  if (err.name === 'ValidationError') return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map(e => ({ path: e.path, message: e.message })) })
  if (err.code === 11000) return res.status(409).json({ error: 'That value already exists' })
  if (err.name === 'MulterError') return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 8 MB' : err.message })
  console.error(err)
  const isProd = env.NODE_ENV === 'production'
  res.status(500).json({ error: 'Something went wrong', ...(isProd ? {} : { details: [{ message: err.message }] }) })
}
