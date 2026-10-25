import { Router } from 'express'
import { z } from 'zod'
import Project, { PROJECT_STATUSES } from '../models/Project.js'
import User from '../models/User.js'
import PermitItem from '../models/PermitItem.js'
import NetMeteringApp from '../models/NetMeteringApp.js'
import Milestone from '../models/Milestone.js'
import ActivityLog, { record } from '../models/ActivityLog.js'
import { nextSeq } from '../models/Counter.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { idParams, oid } from '../utils/schemas.js'
import { accessibleProjectIds, assertProject, scopeFilter } from '../services/access.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { notifyProjectCustomer } from '../services/customerNotifications.js'
const r = Router(); r.use(authenticate)
const fields = { name: z.string().trim().min(2).max(150), customerName: z.string().trim().min(2).max(150), type: z.enum(['Residential', 'Commercial']), capacityKw: z.coerce.number().min(0.1).max(100000),
  contractValue: z.coerce.number().min(0).default(0), startDate: z.coerce.date().optional(), endDate: z.coerce.date().optional(), notes: z.string().max(2000).optional(),
  customerAccount: oid.nullable().optional(), projectManager: oid.nullable().optional(), engineer: oid.nullable().optional(),
  requiredDocuments: z.array(z.string().trim().min(1).max(160)).max(25).optional(), customerActions: z.array(z.string().trim().min(1).max(300)).max(25).optional() }
const dateOk = d => !d.startDate || !d.endDate || d.endDate >= d.startDate
const customerProjectView = project => ({
  _id: project._id,
  code: project.code,
  name: project.name,
  customerName: project.customerName,
  type: project.type,
  capacityKw: project.capacityKw,
  status: project.status,
  progress: project.progress,
  startDate: project.startDate,
  endDate: project.endDate,
  requiredDocuments: project.requiredDocuments,
  customerActions: project.customerActions
})

r.get('/assignments', authorize('admin', 'project_manager'), asyncHandler(async (req, res) => {
  const users = await User.find({ approved: true, role: { $in: ['customer', 'admin', 'project_manager', 'engineer'] } }).select('name email role').sort({ name: 1 })
  res.json({
    customers: req.user.role === 'admin' ? users.filter(user => user.role === 'customer').map(user => ({ id: user._id, name: user.name, email: user.email })) : [],
    team: users.filter(user => ['admin', 'project_manager', 'engineer'].includes(user.role)).map(user => ({ id: user._id, name: user.name, role: user.role }))
  })
}))
r.get('/', validate(z.object({ q: z.string().trim().max(100).optional(), status: z.enum(PROJECT_STATUSES).optional() }), 'query'), asyncHandler(async (req, res) => {
  const f = { archived: false, ...scopeFilter(await accessibleProjectIds(req.user), '_id') }
  if (req.query.status) f.status = req.query.status
  if (req.query.q) { const rx = new RegExp(req.query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); f.$or = [{ name: rx }, { customerName: rx }, { code: rx }] }
  const projects = await Project.find(f).sort({ updatedAt: -1 }).populate('projectManager engineer', 'name').populate('customerAccount', 'name email')
  res.json({ projects: req.user.role === 'customer' ? projects.map(customerProjectView) : projects })
}))
r.post('/', authorize('admin', 'project_manager'), validate(z.object(fields).refine(dateOk, { message: 'End date must not be before the start date', path: ['endDate'] })), asyncHandler(async (req, res) => {
  if (req.body.customerAccount && req.user.role !== 'admin') throw new AppError(403, 'Only an admin can link a customer account')
  await validateProjectAssignments(req.body)
  const p = await Project.create({ ...req.body, code: `SF-${await nextSeq('project')}`, projectManager: req.user.role === 'project_manager' ? req.user._id : null })
  await record(req.user, p._id, 'created project', p.code); res.status(201).json({ project: p })
}))
r.get('/:id', validate(idParams, 'params'), asyncHandler(async (req, res) => {
  const p = await assertProject(req.user, req.params.id); await p.populate('projectManager engineer customerAccount', 'name email')
  if (req.user.role === 'customer') return res.json({ project: customerProjectView(p), counts: {}, activity: [] })
  const [permits, nm, milestones, activity] = await Promise.all([PermitItem.countDocuments({ project: p._id }), NetMeteringApp.countDocuments({ project: p._id }), Milestone.countDocuments({ project: p._id }), ActivityLog.find({ project: p._id }).sort({ at: -1 }).limit(20)])
  res.json({ project: p, counts: { permits, netMetering: nm, milestones }, activity })
}))
r.patch('/:id', authorize('admin', 'project_manager'), validate(idParams, 'params'), validate(z.object({ ...fields, status: z.enum(PROJECT_STATUSES), progress: z.coerce.number().min(0).max(100), archived: z.boolean() }).partial()), asyncHandler(async (req, res) => {
  const p = await assertProject(req.user, req.params.id), before = {
    status: p.status, progress: p.progress, endDate: p.endDate?.getTime() ?? null,
    requiredDocuments: JSON.stringify(p.requiredDocuments), customerActions: JSON.stringify(p.customerActions),
    customerAccount: String(p.customerAccount ?? '')
  }
  if (Object.hasOwn(req.body, 'customerAccount') && req.user.role !== 'admin') throw new AppError(403, 'Only an admin can change a customer assignment')
  await validateProjectAssignments(req.body)
  Object.assign(p, req.body)
  if (!dateOk(p)) throw new AppError(400, 'End date must not be before the start date')
  await p.save()
  const updates = []
  if (before.status !== p.status) updates.push(`Project status changed to ${p.status}.`)
  if (before.progress !== p.progress) updates.push(`Installation progress is now ${p.progress}%.`)
  if (before.endDate !== (p.endDate?.getTime() ?? null)) updates.push(`Estimated completion date: ${p.endDate ? p.endDate.toISOString().slice(0, 10) : 'not set'}.`)
  if (before.requiredDocuments !== JSON.stringify(p.requiredDocuments) || before.customerActions !== JSON.stringify(p.customerActions)) updates.push('Required documents or pending customer actions were updated.')
  if (before.customerAccount !== String(p.customerAccount ?? '') && p.customerAccount) updates.push('A project was assigned to your customer account.')
  if (updates.length) await notifyProjectCustomer(p._id, { title: 'Project update', message: updates.join(' '), dedupeKey: `project:${p._id}:${p.updatedAt.getTime()}` })
  await record(req.user, p._id, req.body.archived ? 'archived project' : 'updated project', before.status !== p.status ? `status ${before.status} to ${p.status}` : '')
  res.json({ project: p })
}))

async function validateProjectAssignments(fields) {
  const checks = [
    ['customerAccount', 'customer'],
    ['projectManager', ['admin', 'project_manager']],
    ['engineer', 'engineer']
  ]
  for (const [field, roles] of checks) {
    const id = fields[field]
    if (!id) continue
    const roleFilter = Array.isArray(roles) ? { $in: roles } : roles
    if (!(await User.exists({ _id: id, approved: true, role: roleFilter }))) throw new AppError(400, `Choose an approved ${field === 'customerAccount' ? 'customer' : field === 'projectManager' ? 'project manager' : 'engineer'}`)
  }
}

export default r
