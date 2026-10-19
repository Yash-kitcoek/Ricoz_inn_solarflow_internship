import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import User from '../models/User.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router(), limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } })
const DUMMY = bcrypt.hashSync('not-a-real-password', 12)   // keeps timing similar when the email is unknown
const cookieOpts = { httpOnly: true, sameSite: env.COOKIE_SAMESITE, secure: env.NODE_ENV === 'production' || env.COOKIE_SAMESITE === 'none', maxAge: env.SESSION_HOURS * 3600 * 1000 }
const email = z.string().trim().toLowerCase().email().max(200)
r.post('/register', limiter, validate(z.object({ name: z.string().trim().min(2).max(100), email, password: z.string().min(8, 'Use at least 8 characters').max(72) })), asyncHandler(async (req, res) => {
  const { name, email: e, password } = req.body
  if (await User.exists({ email: e })) throw new AppError(409, 'That email is already registered')
  await User.create({ name, email: e, passwordHash: await bcrypt.hash(password, 12) })        // role contractor, not approved
  res.status(201).json({ message: 'Account created. An admin must approve it before you can sign in.' })
}))
r.post('/login', limiter, validate(z.object({ email, password: z.string().min(1).max(72) })), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+passwordHash')
  const ok = await bcrypt.compare(req.body.password, user?.passwordHash ?? DUMMY)
  if (!user || !ok) throw new AppError(401, 'Wrong email or password')
  if (!user.approved) throw new AppError(403, 'Your account is waiting for admin approval')
  const token = jwt.sign({ sub: String(user._id) }, env.JWT_SECRET, { expiresIn: `${env.SESSION_HOURS}h` })
  res.cookie('token', token, cookieOpts).json({ user: user.toSafe() })
}))
r.post('/logout', (req, res) => res.clearCookie('token', { ...cookieOpts, maxAge: undefined }).json({ ok: true }))
r.get('/me', authenticate, (req, res) => res.json({ user: req.user.toSafe() }))
export default r
