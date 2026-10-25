import { z } from 'zod'
import { accessibleProjectIds } from './access.js'

export const taskId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id')
const taskTitle = z.string().trim().min(2, 'Enter a task title').max(160)
const description = z.string().trim().max(2000).optional()
const dueDate = z.coerce.date().nullable().optional()
const project = taskId.nullable().optional()
const assignedTo = taskId
const priority = z.enum(['Low', 'Medium', 'High', 'Urgent'])
const status = z.enum(['To Do', 'In Progress', 'Completed', 'Blocked'])

export const createTaskSchema = z.object({
  title: taskTitle,
  description,
  assignedTo,
  project,
  priority: priority.default('Medium'),
  dueDate,
  status: status.default('To Do')
}).strict()

export const updateTaskSchema = z.object({
  title: taskTitle.optional(),
  description,
  assignedTo: assignedTo.optional(),
  project,
  priority: priority.optional(),
  dueDate,
  status: status.optional()
}).strict().refine(value => Object.keys(value).length > 0, 'Provide at least one task field to update')

export const taskQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: status.optional(),
  priority: priority.optional(),
  assignee: taskId.optional(),
  dueOn: z.string().date().optional(),
  dueAfter: z.string().date().optional(),
  dueBefore: z.string().date().optional()
}).strict()

export const isOverdue = (task, now = new Date()) => {
  if (!task.dueDate || task.status === 'Completed') return false
  const dueDay = new Date(task.dueDate)
  dueDay.setUTCHours(0, 0, 0, 0)
  const today = new Date(now)
  today.setUTCHours(0, 0, 0, 0)
  return dueDay < today
}

export function canViewTask(user, task) {
  if (user.role === 'admin') return true
  if (String(task.assignedTo) === String(user._id)) return true
  return ['project_manager', 'engineer'].includes(user.role)
    && task.project != null
    && task.projectAccessible === true
}

export const isTaskEditor = user => ['admin', 'project_manager'].includes(user.role)
export const isStatusEditor = (user, task) => user.role === 'admin'
  || (String(task.assignedTo) === String(user._id) && ['project_manager', 'engineer', 'contractor'].includes(user.role))
export const isStaffTaskViewer = user => ['admin', 'project_manager', 'engineer'].includes(user.role)

export async function taskScopeFilter(user) {
  if (user.role === 'admin') return {}
  if (['project_manager', 'engineer'].includes(user.role)) {
    const projects = await accessibleProjectIds(user)
    return { $or: [
      { assignedTo: user._id },
      { createdBy: user._id, project: null },
      ...(projects?.length ? [{ project: { $in: projects } }] : [])
    ] }
  }
  return { assignedTo: user._id }
}
