import { Router } from 'express'
import { z } from 'zod'
import Contractor from '../models/Contractor.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate)
r.get('/', authorize('admin', 'project_manager', 'engineer', 'finance'), asyncHandler(async (req, res) => res.json({ contractors: await Contractor.find().sort({ companyName: 1 }) })))
r.post('/', authorize('admin', 'project_manager'), validate(z.object({ companyName: z.string().trim().min(2).max(150), contactPerson: z.string().trim().max(100).optional(), phone: z.string().trim().max(30).optional(), specialization: z.string().trim().max(100).optional() })),
  asyncHandler(async (req, res) => res.status(201).json({ contractor: await Contractor.create(req.body) })))
export default r
