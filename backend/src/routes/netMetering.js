import { Router } from 'express'
import { z } from 'zod'
import NetMeteringApp from '../models/NetMeteringApp.js'
import { record } from '../models/ActivityLog.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams, oid } from '../utils/schemas.js'
import { accessibleProjectIds, assertProject, scopeFilter } from '../services/access.js'
import { NM_STATUSES, diagnose, scorecard } from '../services/stuck.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { notifyProjectCustomer } from '../services/customerNotifications.js'
const r = Router(); r.use(authenticate, authorize('admin', 'project_manager', 'engineer'))
const view = a => ({ ...a.toObject(), diagnosis: diagnose(a.status, a.statusChangedAt) })
r.get('/', asyncHandler(async (req, res) => {
  const apps = await NetMeteringApp.find(scopeFilter(await accessibleProjectIds(req.user))).populate('project', 'code name')
  res.json({ applications: apps.map(view).sort((a, b) => Number(b.diagnosis.late) - Number(a.diagnosis.late) || b.diagnosis.days - a.diagnosis.days), scorecard: scorecard(apps) })
}))
r.post('/', validate(z.object({ project: oid, utility: z.string().trim().min(2).max(150) })), asyncHandler(async (req, res) => {
  await assertProject(req.user, req.body.project)
  const a = await NetMeteringApp.create({ ...req.body, history: [{ status: 'Not Started', by: req.user._id }] }); await record(req.user, a.project, 'opened net-metering application', a.utility); res.status(201).json({ application: view(a) })
}))
r.patch('/:id/status', validate(idParams, 'params'), validate(z.object({ status: z.enum(NM_STATUSES) })), asyncHandler(async (req, res) => {
  const a = await NetMeteringApp.findById(req.params.id); if (!a) throw new AppError(404, 'Application not found'); await assertProject(req.user, a.project)
  if (a.status !== req.body.status) {
    a.status = req.body.status; a.statusChangedAt = new Date(); a.history.push({ status: a.status, at: a.statusChangedAt, by: req.user._id })
    await a.save(); await record(req.user, a.project, `net-metering ${a.status}`, a.utility)
    await notifyProjectCustomer(a.project, { title: 'Net-metering update', message: `Net-metering status changed to ${a.status}.`, dedupeKey: `net-metering:${a._id}:${a.updatedAt.getTime()}` })
  }
  res.json({ application: view(a) })
}))
export default r
