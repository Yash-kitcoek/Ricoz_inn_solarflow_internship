import Notification from '../models/Notification.js'
import User from '../models/User.js'
import Task from '../models/Task.js'
import { isOverdue } from './taskRules.js'

const reminderWindowMs = 24 * 60 * 60 * 1000
const recipientIds = (task, exclude) => [...new Set([String(task.assignedTo), String(task.createdBy)])]
  .filter(id => id && id !== 'null' && id !== String(exclude))

export function deadlineNotification(task, now = new Date()) {
  if (!task.dueDate || task.status === 'Completed') return null
  const due = new Date(task.dueDate)
  due.setUTCHours(0, 0, 0, 0)
  due.setUTCDate(due.getUTCDate() + 1)
  const dueKey = due.toISOString()
  if (due > now && due.getTime() <= now.getTime() + reminderWindowMs) {
    return { type: 'deadline_approaching', dedupeKey: `deadline:${task._id}:${dueKey}`, title: 'Task due soon', message: `“${task.title}” is due within 24 hours.` }
  }
  if (isOverdue(task, now)) {
    return { type: 'overdue', dedupeKey: `overdue:${task._id}:${dueKey}`, title: 'Task overdue', message: `“${task.title}” is overdue. Please review its status.` }
  }
  return null
}

export async function upsertTaskNotification({ task, userIds, type, title, message, dedupeKey }) {
  const ids = [...new Set(userIds.map(String))]
  if (!ids.length) return 0
  const users = await User.find({ _id: { $in: ids }, approved: true }).select('_id')
  if (!users.length) return 0
  const operations = users.map(user => ({
    updateOne: {
      filter: { user: user._id, dedupeKey },
      update: { $setOnInsert: { user: user._id, task: task._id, type, title, message, dedupeKey } },
      upsert: true
    }
  }))
  try {
    const result = await Notification.bulkWrite(operations, { ordered: false })
    return result.upsertedCount
  } catch (error) {
    if (error.code === 11000) return 0
    throw error
  }
}

export async function notifyTaskAssigned(task, actorId) {
  return upsertTaskNotification({
    task,
    userIds: String(task.assignedTo) === String(actorId) ? [] : [task.assignedTo],
    type: 'assigned',
    title: 'Task assigned to you',
    message: `“${task.title}” has been assigned to you.`,
    dedupeKey: `assigned:${task._id}:${task.assignedTo}:${task.updatedAt?.getTime?.() ?? Date.now()}`
  })
}

export async function notifyTaskStatusChanged(task, actorId) {
  const event = task.statusHistory.at(-1)
  return upsertTaskNotification({
    task,
    userIds: recipientIds(task, actorId),
    type: 'status_changed',
    title: 'Task status changed',
    message: `“${task.title}” is now ${task.status}.`,
    dedupeKey: `status:${task._id}:${event?._id ?? `${task.status}:${event?.at?.getTime?.() ?? Date.now()}`}`
  })
}

export async function runDeadlineReminders(now = new Date()) {
  const tasks = await Task.find({ status: { $ne: 'Completed' }, dueDate: { $ne: null, $lte: new Date(now.getTime() + reminderWindowMs) } })
  let created = 0
  for (const task of tasks) {
    const reminder = deadlineNotification(task, now)
    if (!reminder) continue
    created += await upsertTaskNotification({ task, userIds: recipientIds(task), ...reminder })
  }
  return created
}

export function startDeadlineReminderScheduler({ intervalMs = 60 * 60 * 1000, logger = console } = {}) {
  let running = false
  const run = async () => {
    if (running) return
    running = true
    try {
      const created = await runDeadlineReminders()
      if (created) logger.info(`Created ${created} task deadline notification(s)`)
    } catch (error) {
      logger.error('Task deadline reminder run failed:', error)
    } finally {
      running = false
    }
  }
  const timer = setInterval(run, intervalMs)
  void run()
  return () => clearInterval(timer)
}
