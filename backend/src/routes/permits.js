import { Router } from 'express'
import { z } from 'zod'
import PermitItem, { PERMIT_STATUSES } from '../models/PermitItem.js'
import { record } from '../models/ActivityLog.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams, oid } from '../utils/schemas.js'
import { accessibleProjectIds, assertProject, scopeFilter } from '../services/access.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate, authorize('admin', 'project_manager', 'engineer'))
const view = i => ({ ...i.toObject(), overdue: !!i.dueDate && i.dueDate < new Date() && i.status !== 'Approved' })
r.get('/', validate(z.object({ project: oid.optional() }), 'query'), asyncHandler(async (req, res) => {
  const f = scopeFilter(await accessibleProjectIds(req.user)); if (req.query.project) f.project = req.query.project
  res.json({ items: (await PermitItem.find(f).sort({ dueDate: 1 }).populate('project', 'code name')).map(view) })
}))
r.post('/', validate(z.object({ project: oid, title: z.string().trim().min(2).max(200), dueDate: z.coerce.date().optional(), priority: z.enum(['Low', 'Medium', 'High']).optional() })), asyncHandler(async (req, res) => {
  await assertProject(req.user, req.body.project); const i = await PermitItem.create(req.body); await record(req.user, i.project, 'added permit item', i.title); res.status(201).json({ item: view(i) })
}))
r.patch('/:id', validate(idParams, 'params'), validate(z.object({ status: z.enum(PERMIT_STATUSES).optional(), reason: z.string().trim().max(500).optional(), title: z.string().trim().min(2).max(200).optional(), dueDate: z.coerce.date().optional() })), asyncHandler(async (req, res) => {
  const i = await PermitItem.findById(req.params.id); if (!i) throw new AppError(404, 'Item not found'); await assertProject(req.user, i.project)
  const { status, reason } = req.body
  if ((status === 'Rejected' || status === 'Blocked') && !reason) throw new AppError(400, `A reason is required when marking an item ${status}`)
  Object.assign(i, req.body); if (status === 'Approved') i.approvedOn = new Date(); if (status && status !== 'Rejected' && status !== 'Blocked') i.reason = undefined
  await i.save(); if (status) await record(req.user, i.project, `permit item ${status}`, i.title); res.json({ item: view(i) })
}))
r.delete('/:id', authorize('admin', 'project_manager'), validate(idParams, 'params'), asyncHandler(async (req, res) => {
  const i = await PermitItem.findById(req.params.id); if (!i) throw new AppError(404, 'Item not found'); await assertProject(req.user, i.project); await i.deleteOne(); res.json({ ok: true })
}))
export default r
