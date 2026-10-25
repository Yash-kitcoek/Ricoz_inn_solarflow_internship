import test from 'node:test'
import assert from 'node:assert/strict'
import { canViewTask, createTaskSchema, isOverdue, isStatusEditor, updateTaskSchema } from '../src/services/taskRules.js'

const valid = { title: 'Inspect inverter wiring', assignedTo: 'a'.repeat(24) }

test('requires a valid title and assigned user', () => {
  assert.equal(createTaskSchema.safeParse(valid).success, true)
  assert.equal(createTaskSchema.safeParse({ ...valid, title: 'x' }).success, false)
  assert.equal(createTaskSchema.safeParse({ title: valid.title }).success, false)
})

test('validates task status, priority, project IDs, and due dates', () => {
  assert.equal(createTaskSchema.safeParse({ ...valid, status: 'Done' }).success, false)
  assert.equal(createTaskSchema.safeParse({ ...valid, priority: 'Critical' }).success, false)
  assert.equal(createTaskSchema.safeParse({ ...valid, project: 'not-an-id' }).success, false)
  assert.equal(createTaskSchema.safeParse({ ...valid, dueDate: 'not-a-date' }).success, false)
})

test('requires at least one valid field for an update', () => {
  assert.equal(updateTaskSchema.safeParse({}).success, false)
  assert.equal(updateTaskSchema.safeParse({ status: 'Blocked' }).success, true)
  assert.equal(updateTaskSchema.safeParse({ unexpected: true }).success, false)
})

test('overdue detection excludes completed tasks and tasks due in the future', () => {
  const now = new Date('2026-10-25T12:00:00.000Z')
  assert.equal(isOverdue({ dueDate: new Date('2026-10-24T00:00:00.000Z'), status: 'To Do' }, now), true)
  assert.equal(isOverdue({ dueDate: new Date('2026-10-25T00:00:00.000Z'), status: 'To Do' }, now), false)
  assert.equal(isOverdue({ dueDate: new Date('2026-10-26T00:00:00.000Z'), status: 'To Do' }, now), false)
  assert.equal(isOverdue({ dueDate: new Date('2026-10-24T00:00:00.000Z'), status: 'Completed' }, now), false)
})

test('task visibility and status updates follow role and assignment', () => {
  const assigned = { _id: 'u1', role: 'contractor' }, task = { assignedTo: 'u1', project: null }
  assert.equal(canViewTask(assigned, task), true)
  assert.equal(isStatusEditor(assigned, task), true)
  assert.equal(canViewTask({ _id: 'u2', role: 'contractor' }, task), false)
  assert.equal(isStatusEditor({ _id: 'u2', role: 'engineer' }, task), false)
  assert.equal(canViewTask({ _id: 'admin', role: 'admin' }, task), true)
})
