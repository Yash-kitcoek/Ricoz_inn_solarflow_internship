import test from 'node:test'
import assert from 'node:assert/strict'
import { deadlineNotification } from '../src/services/taskNotifications.js'

test('creates a single-key approaching deadline reminder within 24 hours', () => {
  const now = new Date('2026-10-26T00:00:00.000Z')
  const task = { _id: 'task-1', title: 'Inspect panels', status: 'To Do', dueDate: new Date('2026-10-26T00:00:00.000Z') }
  const first = deadlineNotification(task, now)
  const second = deadlineNotification(task, now)
  assert.equal(first.type, 'deadline_approaching')
  assert.equal(first.dedupeKey, second.dedupeKey)
})

test('overdue reminders remain stable for the same task deadline', () => {
  const task = { _id: 'task-2', title: 'Submit permit', status: 'Blocked', dueDate: new Date('2026-10-20T00:00:00.000Z') }
  const a = deadlineNotification(task, new Date('2026-10-25T12:00:00.000Z'))
  const b = deadlineNotification(task, new Date('2026-10-26T12:00:00.000Z'))
  assert.equal(a.type, 'overdue')
  assert.equal(a.dedupeKey, b.dedupeKey)
})

test('completed tasks and tasks without a due date do not receive deadline reminders', () => {
  assert.equal(deadlineNotification({ status: 'Completed', dueDate: new Date('2026-10-20T00:00:00.000Z') }), null)
  assert.equal(deadlineNotification({ status: 'To Do', dueDate: null }), null)
})
