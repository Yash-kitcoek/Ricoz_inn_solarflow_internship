import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
export const authenticate = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null, token = req.cookies?.token || bearer
  if (!token) throw new AppError(401, 'Not signed in')
  let p; try { p = jwt.verify(token, env.JWT_SECRET) } catch { throw new AppError(401, 'Session expired. Please sign in again.') }
  const user = await User.findById(p.sub)               // checked on every request, so removing approval takes effect at once
  if (!user || !user.approved) throw new AppError(401, 'Account is not active')
  req.user = user; next()
})
export const authorize = (...roles) => (req, res, next) => roles.includes(req.user.role) ? next() : next(new AppError(403, 'Your role cannot do this'))
