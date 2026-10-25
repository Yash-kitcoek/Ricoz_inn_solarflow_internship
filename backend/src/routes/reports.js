import { Router } from 'express'
import { z } from 'zod'
import DailyReportNote from '../models/DailyReportNote.js'
import Task from '../models/Task.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { accessibleProjectIds, assertProject } from '../services/access.js'
import { isStaffTaskViewer, taskId, taskScopeFilter } from '../services/taskRules.js'
import { dailyTaskGroups, dateBounds } from '../services/reports.js'
import { AppError, asyncHandler } from '../utils/AppError.js'

const r = Router()
r.use(authenticate, authorize('project_manager', 'engineer', 'contractor', 'finance'))

const querySchema = z.object({ date: z.string().date(), assignee: taskId.optional() }).strict()
const noteSchema = z.object({
  date: z.string().date(),
  note: z.string().trim().min(2, 'Enter an operational note').max(2000),
  project: taskId.nullable().optional()
}).strict()

async function reportData(user, date, assignee) {
  const scope = await taskScopeFilter(user)
  const filters = [scope]
  if (assignee && isStaffTaskViewer(user)) filters.push({ assignedTo: assignee })
  const tasks = await Task.find({ $and: filters })
    .populate('assignedTo', 'name role')
    .populate('project', 'code name')
    .sort({ dueDate: 1, createdAt: -1 })
  const groups = dailyTaskGroups(tasks, date)
  const { start, end } = dateBounds(date)

  let noteFilter
  if (user.role === 'admin') noteFilter = { date: { $gte: start, $lt: end } }
  else if (isStaffTaskViewer(user)) {
    const projectIds = await accessibleProjectIds(user)
    noteFilter = { date: { $gte: start, $lt: end }, $or: [
      { createdBy: user._id, project: null },
      ...(projectIds?.length ? [{ project: { $in: projectIds } }] : [])
    ] }
  } else noteFilter = { date: { $gte: start, $lt: end }, createdBy: user._id }
  const notes = await DailyReportNote.find(noteFilter)
    .populate('createdBy', 'name')
    .populate('project', 'code name')
    .sort({ createdAt: -1 })
  return { tasks, groups, notes }
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function reportCsv(date, groups, notes) {
  const header = ['section', 'task', 'description', 'assignee', 'project', 'priority', 'status', 'due date', 'created at']
  const rows = [header]
  for (const [section, tasks] of Object.entries(groups)) {
    for (const task of tasks) rows.push([
      section.replace(/Tasks$/, ''),
      task.title,
      task.description,
      task.assignedTo?.name,
      task.project ? `${task.project.code} ${task.project.name}` : '',
      task.priority,
      task.status,
      task.dueDate?.toISOString?.().slice(0, 10) ?? task.dueDate,
      task.createdAt?.toISOString?.() ?? task.createdAt
    ])
  }
  for (const note of notes) rows.push(['Operational note', note.note, '', note.createdBy?.name, note.project ? `${note.project.code} ${note.project.name}` : '', '', '', '', note.createdAt?.toISOString?.() ?? note.createdAt])
  return `Report date,${csvCell(date)}\r\n${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}

r.get('/daily.csv', validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const { date, assignee } = req.query
  const { groups, notes } = await reportData(req.user, date, assignee)
  res.type('text/csv; charset=utf-8')
    .set('Content-Disposition', `attachment; filename="solarflow-daily-report-${date}.csv"`)
    .send(reportCsv(date, groups, notes))
}))

r.get('/daily', validate(querySchema, 'query'), asyncHandler(async (req, res) => {
  const { date, assignee } = req.query
  const { tasks, groups, notes } = await reportData(req.user, date, assignee)
  const metrics = {
    completed: groups.completedTasks.length,
    pending: groups.pendingTasks.length,
    overdue: groups.overdueTasks.length,
    blocked: groups.blockedTasks.length
  }
  res.json({ date, dataAvailable: tasks.length > 0, taskRecords: tasks.length, metrics, ...groups, notes })
}))

r.post('/daily/notes', authorize('admin', 'project_manager', 'engineer'), validate(noteSchema), asyncHandler(async (req, res) => {
  const { start } = dateBounds(req.body.date)
  if (req.body.project) await assertProject(req.user, req.body.project)
  const note = await DailyReportNote.create({
    date: start,
    note: req.body.note,
    project: req.body.project ?? null,
    createdBy: req.user._id
  })
  await note.populate('createdBy', 'name')
  await note.populate('project', 'code name')
  res.status(201).json({ note })
}))

export default r
