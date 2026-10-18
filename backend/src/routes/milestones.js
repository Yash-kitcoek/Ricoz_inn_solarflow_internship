import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import Milestone from '../models/Milestone.js'
import { record } from '../models/ActivityLog.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { evidenceUpload, uploadsRoot } from '../middleware/upload.js'
import { idParams, oid } from '../utils/schemas.js'
import { looksLikeImage } from '../utils/image.js'
import { accessibleProjectIds, assertProject, scopeFilter } from '../services/access.js'
import { KINDS, MS_STATUSES, checkTransition, missingEvidence } from '../services/milestoneRules.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate)
const dto = m => ({ id: m._id, project: m.project, contractor: m.contractor, description: m.description, amount: m.amount, dueDate: m.dueDate, status: m.status, requiredEvidence: m.requiredEvidence,
  evidence: m.evidence.map(e => ({ id: e._id, kind: e.kind, lat: e.lat, lng: e.lng, takenAt: e.takenAt, hasLocation: Number.isFinite(e.lat) && Number.isFinite(e.lng) })), missingEvidence: missingEvidence(m),
  invoice: m.invoice?.number ? { number: m.invoice.number, date: m.invoice.date } : null, approvalNotes: m.approvalNotes, payment: m.payment?.reference ? { paidOn: m.payment.paidOn, reference: m.payment.reference } : null })
async function visible(user) {
  if (user.role === 'contractor') return user.contractor ? { contractor: user.contractor } : { _id: null }
  return scopeFilter(await accessibleProjectIds(user))
}
async function load(req) {   // 404 when the milestone does not exist or this user may not see it
  const m = await Milestone.findById(req.params.id), none = new AppError(404, 'Milestone not found'); if (!m) throw none
  if (req.user.role === 'contractor') { if (!req.user.contractor || String(m.contractor) !== String(req.user.contractor)) throw none } else await assertProject(req.user, m.project).catch(() => { throw none })
  return m
}
const populated = q => q.populate('project', 'code name').populate('contractor', 'companyName')
r.get('/', validate(z.object({ project: oid.optional(), status: z.enum(MS_STATUSES).optional() }), 'query'), asyncHandler(async (req, res) => {
  const f = await visible(req.user); if (req.query.project) f.project = req.query.project; if (req.query.status) f.status = req.query.status
  res.json({ milestones: (await populated(Milestone.find(f).sort({ createdAt: -1 }))).map(dto) })
}))
r.post('/', authorize('admin', 'project_manager'), validate(z.object({ project: oid, contractor: oid, description: z.string().trim().min(2).max(200), amount: z.coerce.number().min(1), dueDate: z.coerce.date().optional(), requiredEvidence: z.array(z.enum(KINDS)).min(1).optional() })), asyncHandler(async (req, res) => {
  await assertProject(req.user, req.body.project); const m = await Milestone.create(req.body); await record(req.user, m.project, 'created milestone', m.description); res.status(201).json({ milestone: dto(m) })
}))
// Authorisation first, then the upload, so rejected users never write a file
const canAddEvidence = asyncHandler(async (req, res, next) => {
  if (!['admin', 'project_manager', 'contractor'].includes(req.user.role)) throw new AppError(403, 'Your role cannot upload evidence')
  req.milestone = await load(req); if (req.milestone.status !== 'awaiting_evidence') throw new AppError(409, 'Evidence can only be added while the milestone is awaiting evidence'); next()
})
r.post('/:id/evidence', validate(idParams, 'params'), canAddEvidence, evidenceUpload, asyncHandler(async (req, res) => {
  const file = req.file, drop = () => file && fs.promises.unlink(file.path).catch(() => {})
  try {
    if (!file) throw new AppError(400, 'Attach a photo in the "photo" field')
    const head = Buffer.alloc(12), fd = await fs.promises.open(file.path, 'r'); await fd.read(head, 0, 12, 0); await fd.close()
    if (!looksLikeImage(head)) throw new AppError(400, 'That file is not a valid image')
    const b = z.object({ kind: z.enum(KINDS), lat: z.coerce.number().min(-90).max(90).optional(), lng: z.coerce.number().min(-180).max(180).optional() }).parse(req.body)
    const m = req.milestone; m.evidence.push({ kind: b.kind, file: `${req.params.id}/${file.filename}`, mime: file.mimetype, lat: b.lat, lng: b.lng, uploadedBy: req.user._id }); await m.save()
    await record(req.user, m.project, 'uploaded evidence', `${m.description}: ${b.kind}${Number.isFinite(b.lat) ? '' : ' (no location)'}`); res.status(201).json({ milestone: dto(m) })
  } catch (e) { await drop(); throw e }
}))
r.get('/:id/evidence/:eid/file', validate(z.object({ id: oid, eid: oid }), 'params'), asyncHandler(async (req, res) => {
  const m = await load(req), e = m.evidence.id(req.params.eid); if (!e) throw new AppError(404, 'Photo not found')
  const full = path.resolve(uploadsRoot, e.file); if (!full.startsWith(uploadsRoot + path.sep)) throw new AppError(400, 'Bad path')
  res.type(e.mime).set('Cache-Control', 'private, max-age=300').sendFile(full)
}))
r.put('/:id/invoice', validate(idParams, 'params'), validate(z.object({ number: z.string().trim().min(1).max(60), date: z.coerce.date() })), asyncHandler(async (req, res) => {
  if (!['admin', 'project_manager', 'contractor'].includes(req.user.role)) throw new AppError(403, 'Your role cannot add an invoice')
  const m = await load(req); if (m.status !== 'awaiting_evidence') throw new AppError(409, 'The invoice can only be changed while awaiting evidence')
  m.invoice = req.body; await m.save(); await record(req.user, m.project, 'added invoice', `${m.description}: ${req.body.number}`); res.json({ milestone: dto(m) })
}))
r.post('/:id/transition', validate(idParams, 'params'), validate(z.object({ to: z.enum(MS_STATUSES), notes: z.string().trim().max(500).optional() })), asyncHandler(async (req, res) => {
  const m = await load(req), { to, notes } = req.body, c = checkTransition({ milestone: m, to, role: req.user.role, userId: req.user._id, notes })
  if (!c.ok) throw new AppError(c.status, c.error)
  const set = { status: to }; if (to === 'pending_approval') set.verifiedBy = req.user._id; if (to === 'approved_for_payment') set.approvedBy = req.user._id; if (to === 'disputed') set.approvalNotes = notes
  const u = await Milestone.findOneAndUpdate({ _id: m._id, status: m.status }, set, { new: true })     // fails if someone else moved it first
  if (!u) throw new AppError(409, 'This milestone was just changed by someone else. Reload and try again.')
  await record(req.user, u.project, `milestone ${to.replace(/_/g, ' ')}`, u.description); res.json({ milestone: dto(u) })
}))
r.post('/:id/pay', authorize('admin', 'finance'), validate(idParams, 'params'), validate(z.object({ reference: z.string().trim().min(3).max(100), paidOn: z.coerce.date().optional() })), asyncHandler(async (req, res) => {
  const m = await load(req); if (m.status !== 'approved_for_payment') throw new AppError(409, 'Only milestones approved for payment can be recorded as paid')
  const u = await Milestone.findOneAndUpdate({ _id: m._id, status: 'approved_for_payment' }, { status: 'paid', payment: { reference: req.body.reference, paidOn: req.body.paidOn ?? new Date(), recordedBy: req.user._id } }, { new: true })
  if (!u) throw new AppError(409, 'This milestone was just changed by someone else.'); await record(req.user, u.project, 'recorded payment', `${u.description}: ref ${req.body.reference}`); res.json({ milestone: dto(u) })
}))
export default r
