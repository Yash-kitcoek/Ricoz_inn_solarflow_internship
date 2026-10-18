import { Router } from 'express'
import { z } from 'zod'
import Project, { PROJECT_STATUSES } from '../models/Project.js'
import PermitItem from '../models/PermitItem.js'
import NetMeteringApp from '../models/NetMeteringApp.js'
import Milestone from '../models/Milestone.js'
import ActivityLog, { record } from '../models/ActivityLog.js'
import { nextSeq } from '../models/Counter.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams } from '../utils/schemas.js'
import { accessibleProjectIds, assertProject, scopeFilter } from '../services/access.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate)
const fields = { name: z.string().trim().min(2).max(150), customerName: z.string().trim().min(2).max(150), type: z.enum(['Residential', 'Commercial']), capacityKw: z.coerce.number().min(0.1).max(100000),
  contractValue: z.coerce.number().min(0).default(0), startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional(), notes: z.string().max(2000).optional() }
const dateOk = d => !d.startDate || !d.endDate || d.endDate >= d.startDate
r.get('/', validate(z.object({ q: z.string().trim().max(100).optional(), status: z.enum(PROJECT_STATUSES).optional() }), 'query'), asyncHandler(async (req, res) => {
  const f = { archived: false, ...scopeFilter(await accessibleProjectIds(req.user), '_id') }
  if (req.query.status) f.status = req.query.status
  if (req.query.q) { const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ name: rx }, { customerName: rx }, { code: rx }] }
  res.json({ projects: await Project.find(f).sort({ updatedAt: -1 }).populate('projectManager engineer', 'name') })
}))
r.post('/', authorize('admin', 'project_manager'), validate(z.object(fields).refine(dateOk, { message: 'End date must not be before the start date', path: ['endDate'] })), asyncHandler(async (req, res) => {
  const p = await Project.create({ ...req.body, code: `SF-${await nextSeq('project')}`, projectManager: req.user.role === 'project_manager' ? req.user._id : null })
  await record(req.user, p._id, 'created project', p.code); res.status(201).json({ project: p })
}))
r.get('/:id', validate(idParams, 'params'), asyncHandler(async (req, res) => {
  const p = await assertProject(req.user, req.params.id); await p.populate('projectManager engineer', 'name')
  const [permits, nm, milestones, activity] = await Promise.all([PermitItem.countDocuments({ project: p._id }), NetMeteringApp.countDocuments({ project: p._id }), Milestone.countDocuments({ project: p._id }), ActivityLog.find({ project: p._id }).sort({ at: -1 }).limit(20)])
  res.json({ project: p, counts: { permits, netMetering: nm, milestones }, activity })
}))
r.patch('/:id', authorize('admin', 'project_manager'), validate(idParams, 'params'), validate(z.object({ ...fields, status: z.enum(PROJECT_STATUSES), progress: z.coerce.number().min(0).max(100), archived: z.boolean() }).partial()), asyncHandler(async (req, res) => {
  const p = await assertProject(req.user, req.params.id), before = p.status; Object.assign(p, req.body)
  if (!dateOk(p)) throw new AppError(400, 'End date must not be before the start date')
  await p.save(); await record(req.user, p._id, req.body.archived ? 'archived project' : 'updated project', before !== p.status ? `status ${before} to ${p.status}` : ''); res.json({ project: p })
}))
export default r
