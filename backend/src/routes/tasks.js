import { Router } from 'express'
import { z } from 'zod'
import Task from '../models/Task.js'
import User from '../models/User.js'
import { record } from '../models/ActivityLog.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { assertProject } from '../services/access.js'
import { canViewTask, createTaskSchema, isOverdue, isStatusEditor, isTaskEditor, taskId, taskQuerySchema, taskScopeFilter, updateTaskSchema } from '../services/taskRules.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { notifyTaskAssigned, notifyTaskStatusChanged } from '../services/taskNotifications.js'

const r = Router()
r.use(authenticate, authorize('project_manager', 'engineer', 'contractor', 'finance'))

function taskSummary(tasks, now = new Date()) {
  return tasks.reduce((summary, task) => {
    summary.total++
    if (task.status === 'To Do' || task.status === 'In Progress') summary.pending++
    if (task.status === 'Completed') summary.completed++
    if (task.status === 'Blocked') summary.blocked++
    if (isOverdue(task, now)) summary.overdue++
    return summary
  }, { total: 0, pending: 0, completed: 0, blocked: 0, overdue: 0 })
}

async function loadTask(user, id) {
  const task = await Task.findById(id)
  if (!task) throw new AppError(404, 'Task not found')
  let projectAccessible = false
  if (task.project && ['project_manager', 'engineer'].includes(user.role)) {
    try { await assertProject(user, task.project); projectAccessible = true } catch (error) {
      if (error.status !== 404) throw error
    }
  }
  if (!canViewTask(user, { ...task.toObject(), projectAccessible })) throw new AppError(404, 'Task not found')
  return task
}

async function validateAssignee(id) {
  if (!(await User.exists({ _id: id, approved: true, role: { $ne: 'customer' } }))) throw new AppError(400, 'Choose an approved operations user to assign the task to')
}

const populated = query => query.populate('assignedTo', 'name role').populate('project', 'code name')

r.get('/assignees', authorize('admin', 'project_manager', 'engineer'), asyncHandler(async (req, res) => {
  const users = await User.find({ approved: true, role: { $ne: 'customer' } }).select('name role').sort({ name: 1 })
  res.json({ users: users.map(user => ({ id: user._id, name: user.name, role: user.role })) })
}))

r.get('/', validate(taskQuerySchema, 'query'), asyncHandler(async (req, res) => {
  const filters = [await taskScopeFilter(req.user)]
  const { q, status, priority, assignee, dueOn, dueAfter, dueBefore } = req.query
  if (q) filters.push({ $or: [{ title: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { description: new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }] })
  if (status) filters.push({ status })
  if (priority) filters.push({ priority })
  if (assignee && ['admin', 'project_manager', 'engineer'].includes(req.user.role)) filters.push({ assignedTo: assignee })
  if (dueOn) {
    const from = new Date(`${dueOn}T00:00:00.000Z`), until = new Date(from)
    until.setUTCDate(until.getUTCDate() + 1)
    filters.push({ dueDate: { $gte: from, $lt: until } })
  } else if (dueAfter || dueBefore) {
    const range = {}
    if (dueAfter) range.$gte = new Date(`${dueAfter}T00:00:00.000Z`)
    if (dueBefore) {
      const until = new Date(`${dueBefore}T00:00:00.000Z`)
      until.setUTCDate(until.getUTCDate() + 1)
      range.$lt = until
    }
    filters.push({ dueDate: range })
  }
  const tasks = await populated(Task.find({ $and: filters }).sort({ dueDate: 1, createdAt: -1 }))
  res.json({ tasks, summary: taskSummary(tasks) })
}))

r.post('/', authorize('admin', 'project_manager'), validate(createTaskSchema), asyncHandler(async (req, res) => {
  await validateAssignee(req.body.assignedTo)
  if (req.body.project) await assertProject(req.user, req.body.project)
  const task = await Task.create({ ...req.body, createdBy: req.user._id, statusHistory: [{ status: req.body.status ?? 'To Do', by: req.user._id }] })
  await notifyTaskAssigned(task, req.user._id)
  if (task.project) await record(req.user, task.project, 'created operations task', task.title)
  res.status(201).json({ task: await populated(Task.findById(task._id)) })
}))

r.patch('/:id', validate(z.object({ id: taskId }), 'params'), validate(updateTaskSchema), asyncHandler(async (req, res) => {
  const task = await loadTask(req.user, req.params.id)
  const changes = req.body
  if (isTaskEditor(req.user)) {
    if (task.project && req.user.role === 'project_manager') await assertProject(req.user, task.project)
    if (Object.hasOwn(changes, 'project') && changes.project) await assertProject(req.user, changes.project)
    if (changes.assignedTo) await validateAssignee(changes.assignedTo)
  } else {
    if (!isStatusEditor(req.user, task)) throw new AppError(403, 'Your role cannot edit this task')
    if (Object.keys(changes).some(key => key !== 'status')) throw new AppError(403, 'You may only update the status of a task assigned to you')
  }

  const previousStatus = task.status
  const previousAssignee = String(task.assignedTo)
  Object.assign(task, changes)
  if (changes.status && changes.status !== previousStatus) {
    const changedAt = new Date()
    task.statusHistory.push({ status: changes.status, at: changedAt, by: req.user._id })
    if (changes.status === 'Completed') task.completedAt = changedAt
    else task.completedAt = null
  }
  await task.save()
  if (changes.assignedTo && String(task.assignedTo) !== previousAssignee) await notifyTaskAssigned(task, req.user._id)
  if (changes.status && changes.status !== previousStatus) await notifyTaskStatusChanged(task, req.user._id)
  if (task.project) await record(req.user, task.project, 'updated operations task', `${task.title}: ${previousStatus} → ${task.status}`)
  res.json({ task: await populated(Task.findById(task._id)) })
}))

export default r
