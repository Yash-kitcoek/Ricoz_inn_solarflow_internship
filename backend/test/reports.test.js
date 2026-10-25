import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyTaskGroups, dateBounds, statusAt } from '../src/services/reports.js'

const task = (status, at, options = {}) => ({
  title: `Task ${status}`,
  status,
  createdAt: new Date('2026-10-20T10:00:00.000Z'),
  dueDate: options.dueDate ? new Date(options.dueDate) : null,
  statusHistory: [{ status, at: new Date(at) }]
})

test('report day bounds use a consistent UTC calendar day', () => {
  const { start, end } = dateBounds('2026-10-25')
  assert.equal(start.toISOString(), '2026-10-25T00:00:00.000Z')
  assert.equal(end.toISOString(), '2026-10-26T00:00:00.000Z')
})

test('status as of a report date comes from task status history', () => {
  const item = { createdAt: new Date('2026-10-20T10:00:00.000Z'), status: 'Completed', statusHistory: [
    { status: 'To Do', at: new Date('2026-10-20T10:00:00.000Z') },
    { status: 'Completed', at: new Date('2026-10-25T10:00:00.000Z') },
    { status: 'In Progress', at: new Date('2026-10-26T10:00:00.000Z') }
  ] }
  assert.equal(statusAt(item, new Date('2026-10-25T23:59:59.999Z')), 'Completed')
  assert.equal(statusAt(item, new Date('2026-10-26T23:59:59.999Z')), 'In Progress')
})

test('daily metrics separate completed, pending, blocked, and overdue tasks', () => {
  const tasks = [
    task('Completed', '2026-10-25T14:00:00.000Z'),
    task('In Progress', '2026-10-24T14:00:00.000Z', { dueDate: '2026-10-24T00:00:00.000Z' }),
    task('Blocked', '2026-10-24T14:00:00.000Z', { dueDate: '2026-10-25T00:00:00.000Z' }),
    task('To Do', '2026-10-24T14:00:00.000Z', { dueDate: '2026-10-27T00:00:00.000Z' })
  ]
  const groups = dailyTaskGroups(tasks, '2026-10-25')
  assert.equal(groups.completedTasks.length, 1)
  assert.equal(groups.pendingTasks.length, 2)
  assert.equal(groups.blockedTasks.length, 1)
  assert.equal(groups.overdueTasks.length, 2)
})

test('empty report data produces empty groups rather than fabricated values', () => {
  const groups = dailyTaskGroups([], '2026-10-25')
  assert.deepEqual(Object.values(groups).map(group => group.length), [0, 0, 0, 0])
})
