import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

export const authenticate = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  const token = req.cookies?.token || bearer
  if (!token) throw new AppError(401, 'Sign in is required')
  let payload
  try {
    payload = jwt.verify(token, env.JWT_SECRET)
  } catch {
    throw new AppError(401, 'Your session is invalid or expired')
  }
  const user = await User.findById(payload.sub)
  if (!user || !user.approved) throw new AppError(401, 'Your account is not approved or no longer exists')
  req.user = user
  next()
})

export const authorize = (...roles) => (req, res, next) => {
  if (req.user?.role === 'admin' || roles.includes(req.user?.role)) return next()
  return next(new AppError(403, 'Your role cannot do this'))
}
