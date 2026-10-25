import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'
import User, { ROLES } from '../models/User.js'
import Project from '../models/Project.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams, oid } from '../utils/schemas.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router()
const email = z.string().trim().toLowerCase().email().max(200)
const profilePatch = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: email.optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(72).optional()
}).refine(body => Object.keys(body).length > 0, { message: 'At least one profile field is required' })
r.get('/', authenticate, authorize('admin'), asyncHandler(async (req, res) => res.json({ users: (await User.find().sort({ createdAt: -1 })).map(u => u.toSafe()) })))
r.get('/customers', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 })
  const projects = await Project.find({ customerAccount: { $in: customers.map(user => user._id) }, archived: false }).select('customerAccount code name status progress endDate')
  const byCustomer = new Map()
  for (const project of projects) {
    const key = String(project.customerAccount)
    byCustomer.set(key, [...(byCustomer.get(key) ?? []), {
      id: project._id, code: project.code, name: project.name, status: project.status, progress: project.progress, endDate: project.endDate
    }])
  }
  res.json({ customers: customers.map(user => ({ ...user.toSafe(), projects: byCustomer.get(String(user._id)) ?? [] })) })
}))
r.post('/customers', authenticate, authorize('admin'), validate(z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8, 'Use at least 8 characters').max(72)
})), asyncHandler(async (req, res) => {
  const candidateEmail = req.body.email.toLowerCase()
  if (await User.exists({ email: candidateEmail })) throw new AppError(409, 'That email is already registered')
  const user = await User.create({
    name: req.body.name,
    email: candidateEmail,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    role: 'customer',
    approved: true
  })
  res.status(201).json({ customer: user.toSafe() })
}))
r.get('/me', authenticate, asyncHandler(async (req, res) => res.json({ user: req.user.toSafe() })))
r.patch('/me', authenticate, validate(profilePatch), asyncHandler(async (req, res) => {
  const nextEmail = req.body.email?.toLowerCase()
  if (nextEmail && nextEmail !== req.user.email && await User.exists({ email: nextEmail, _id: { $ne: req.user._id } })) throw new AppError(409, 'That email is already in use')
  if (req.body.name) req.user.name = req.body.name
  if (nextEmail) req.user.email = nextEmail
  if (req.body.password) req.user.passwordHash = await bcrypt.hash(req.body.password, 12)
  await req.user.save()
  res.json({ user: req.user.toSafe() })
}))
r.post('/admins', authenticate, authorize('admin'), validate(z.object({
  name: z.string().trim().min(2).max(100),
  email,
  password: z.string().min(8, 'Use at least 8 characters').max(72)
})), asyncHandler(async (req, res) => {
  const candidateEmail = req.body.email.toLowerCase()
  if (await User.exists({ email: candidateEmail })) throw new AppError(409, 'That email is already registered')
  const user = await User.create({
    name: req.body.name,
    email: candidateEmail,
    passwordHash: await bcrypt.hash(req.body.password, 12),
    role: 'admin',
    approved: true
  })
  res.status(201).json({ user: user.toSafe() })
}))
r.patch('/:id', authenticate, authorize('admin'), validate(idParams, 'params'), validate(z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: email.optional(),
  password: z.string().min(8, 'Use at least 8 characters').max(72).optional(),
  role: z.enum(ROLES).optional(),
  approved: z.boolean().optional(),
  contractor: oid.nullable().optional()
}).refine(body => Object.keys(body).length > 0, { message: 'Provide at least one user field to update' })), asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) throw new AppError(404, 'User not found')
  const demotes = u.role === 'admin' && u.approved && ((req.body.role && req.body.role !== 'admin') || req.body.approved === false)
  if (demotes && !(await User.exists({ _id: { $ne: u._id }, role: 'admin', approved: true }))) throw new AppError(409, 'Cannot remove the last approved admin')
  if (req.body.email) {
    const candidateEmail = req.body.email.toLowerCase()
    if (candidateEmail !== u.email && await User.exists({ email: candidateEmail, _id: { $ne: u._id } })) throw new AppError(409, 'That email is already registered')
    u.email = candidateEmail
  }
  if (req.body.password) u.passwordHash = await bcrypt.hash(req.body.password, 12)
  Object.assign(u, Object.fromEntries(Object.entries(req.body).filter(([key]) => !['email', 'password'].includes(key))))
  await u.save(); res.json({ user: u.toSafe() })
}))
export default r
