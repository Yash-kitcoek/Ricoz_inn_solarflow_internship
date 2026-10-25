import { Router } from 'express'
import { z } from 'zod'
import CustomerRequest from '../models/CustomerRequest.js'
import { record } from '../models/ActivityLog.js'
import Milestone from '../models/Milestone.js'
import NetMeteringApp from '../models/NetMeteringApp.js'
import PermitItem from '../models/PermitItem.js'
import Project from '../models/Project.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { notifyAdminsOfCustomerRequest } from '../services/customerNotifications.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { oid } from '../utils/schemas.js'

const r = Router()
r.use(authenticate, (req, res, next) => {
  if (req.user.role !== 'customer') return next(new AppError(403, 'Customer access is required'))
  next()
})

r.get('/overview', asyncHandler(async (req, res) => {
  const projects = await Project.find({ customerAccount: req.user._id, archived: false })
    .select('code name customerName type capacityKw status progress startDate endDate requiredDocuments customerActions')
    .sort({ updatedAt: -1 })
  const projectIds = projects.map(project => project._id)
  const [permits, applications, milestones, requests] = await Promise.all([
    PermitItem.find({ project: { $in: projectIds } }).select('project title dueDate priority status').sort({ dueDate: 1 }),
    NetMeteringApp.find({ project: { $in: projectIds } }).select('project utility status statusChangedAt history.status history.at').sort({ updatedAt: -1 }),
    Milestone.find({ project: { $in: projectIds } }).select('project description dueDate status requiredEvidence evidence.kind').sort({ dueDate: 1 }),
    CustomerRequest.find({ customer: req.user._id }).select('project customer subject message status response createdAt updatedAt').populate('project', 'code name').sort({ createdAt: -1 }).limit(50)
  ])
  res.json({
    projects: projects.map(project => ({
      ...project.toObject(),
      permits: permits.filter(item => String(item.project) === String(project._id)),
      netMetering: applications.filter(item => String(item.project) === String(project._id)),
      milestones: milestones.map(milestone => milestone.toObject()).filter(item => String(item.project) === String(project._id))
    })),
    requests
  })
}))

r.post('/requests', validate(z.object({
  project: oid,
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(5).max(4000)
})), asyncHandler(async (req, res) => {
  const project = await Project.findOne({ _id: req.body.project, customerAccount: req.user._id, archived: false }).select('_id')
  if (!project) throw new AppError(404, 'Project not found')
  const request = await CustomerRequest.create({
    project: project._id,
    customer: req.user._id,
    subject: req.body.subject,
    message: req.body.message
  })
  await record(req.user, project._id, 'customer submitted support request', request.subject)
  await notifyAdminsOfCustomerRequest(request)
  res.status(201).json({ request })
}))

export default r
