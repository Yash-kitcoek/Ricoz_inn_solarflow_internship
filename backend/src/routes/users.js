import { Router } from 'express'
import { z } from 'zod'
import User, { ROLES } from '../models/User.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams, oid } from '../utils/schemas.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate, authorize('admin'))
r.get('/', asyncHandler(async (req, res) => res.json({ users: (await User.find().sort({ createdAt: -1 })).map(u => u.toSafe()) })))
r.patch('/:id', validate(idParams, 'params'), validate(z.object({ role: z.enum(ROLES).optional(), approved: z.boolean().optional(), contractor: oid.nullable().optional() })), asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.id); if (!u) throw new AppError(404, 'User not found')
  const demotes = u.role === 'admin' && u.approved && ((req.body.role && req.body.role !== 'admin') || req.body.approved === false)
  if (demotes && !(await User.exists({ _id: { $ne: u._id }, role: 'admin', approved: true }))) throw new AppError(409, 'Cannot remove the last approved admin')
  Object.assign(u, req.body); await u.save(); res.json({ user: u.toSafe() })
}))
export default r
