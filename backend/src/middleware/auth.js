import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

let cachedAdmin = null

export async function getAdminUser() {
  if (cachedAdmin) {
    const existing = await User.findById(cachedAdmin._id)
    if (existing && existing.role === 'admin' && existing.approved) {
      cachedAdmin = existing
      return cachedAdmin
    }
  }

  let admin = await User.findOne({ role: 'admin', approved: true })
  if (!admin) {
    const email = (env.ADMIN_EMAIL || 'admin@example.com').toLowerCase()
    admin = await User.findOne({ email })
    if (admin) {
      admin.role = 'admin'
      admin.approved = true
      await admin.save()
    } else {
      admin = await User.create({
        name: env.ADMIN_NAME || 'Admin',
        email,
        passwordHash: '$2a$12$dummyHashNotUsedForLoginDirectAdmin',
        role: 'admin',
        approved: true
      })
    }
  }
  cachedAdmin = admin
  return admin
}

export const authenticate = asyncHandler(async (req, res, next) => {
  const bearer = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  const token = req.cookies?.token || bearer
  if (token) {
    try {
      const p = jwt.verify(token, env.JWT_SECRET)
      const user = await User.findById(p.sub)
      if (user && user.approved) {
        req.user = user
        return next()
      }
    } catch {
      // If token is invalid or expired, continue to fallback admin
    }
  }
  // No login required: automatically authenticate as admin
  req.user = await getAdminUser()
  next()
})

export const authorize = (...roles) => (req, res, next) => {
  if (req.user?.role === 'admin' || roles.includes(req.user?.role)) return next()
  return next(new AppError(403, 'Your role cannot do this'))
}

