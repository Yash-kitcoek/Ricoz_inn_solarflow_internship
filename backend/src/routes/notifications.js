import { Router } from 'express'
import { z } from 'zod'
import Notification from '../models/Notification.js'
import Project from '../models/Project.js'
import { authenticate } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { taskId } from '../services/taskRules.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

const r = Router()
r.use(authenticate)

async function notificationFilter(user) {
  if (user.role !== 'customer') return { user: user._id }
  const projectIds = await Project.find({ customerAccount: user._id, archived: false }).distinct('_id')
  return { user: user._id, type: { $in: ['project_update', 'support_request'] }, project: { $in: projectIds } }
}

r.get('/', validate(z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) }), 'query'), asyncHandler(async (req, res) => {
  const filter = await notificationFilter(req.user)
  const [notifications, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(req.query.limit)
      .populate('task', 'title status dueDate')
      .populate('project', 'code name'),
    Notification.countDocuments({ ...filter, readAt: null })
  ])
  res.json({ notifications, unreadCount })
}))

r.patch('/:id/read', validate(z.object({ id: taskId }), 'params'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...await notificationFilter(req.user) }
  const notification = await Notification.findOneAndUpdate({ ...filter, readAt: null }, { readAt: new Date() }, { new: true })
  if (!notification) {
    if (!(await Notification.exists(filter))) throw new AppError(404, 'Notification not found')
    return res.json({ ok: true, alreadyRead: true })
  }
  res.json({ notification })
}))

r.post('/read-all', asyncHandler(async (req, res) => {
  const filter = { ...await notificationFilter(req.user), readAt: null }
  const result = await Notification.updateMany(filter, { readAt: new Date() })
  res.json({ ok: true, markedRead: result.modifiedCount })
}))

export default r
