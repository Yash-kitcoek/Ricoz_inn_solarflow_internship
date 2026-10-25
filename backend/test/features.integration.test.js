import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'

const testUri = process.env.MONGODB_TEST_URI

test('task, report, authorization, and notification APIs persist correctly', { skip: !testUri }, async t => {
  process.env.NODE_ENV = 'test'
  process.env.MONGODB_URI = testUri
  process.env.JWT_SECRET = 'integration-test-secret-that-is-long-enough'

  const [{ default: app }, { default: mongoose }, { default: User }, { default: Task }, { default: Notification }, { default: DailyReportNote }] = await Promise.all([
    import('../src/app.js'),
    import('mongoose'),
    import('../src/models/User.js'),
    import('../src/models/Task.js'),
    import('../src/models/Notification.js'),
    import('../src/models/DailyReportNote.js')
  ])
  const { connectDb } = await import('../src/config/db.js')
  await connectDb()

  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const users = await User.create([
    { name: 'Feature Test Admin', email: `feature-admin-${unique}@example.test`, passwordHash: 'unused', role: 'admin', approved: true },
    { name: 'Feature Test Worker', email: `feature-worker-${unique}@example.test`, passwordHash: 'unused', role: 'contractor', approved: true },
    { name: 'Feature Test Stranger', email: `feature-stranger-${unique}@example.test`, passwordHash: 'unused', role: 'contractor', approved: true }
  ])
  const [admin, worker, stranger] = users
  const tokenFor = user => jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const call = (path, { user = admin, method = 'GET', body } = {}) => fetch(`${base}${path}`, {
    method,
    headers: { cookie: `token=${tokenFor(user)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  let createdTaskId
  t.after(async () => {
    server.close()
    if (createdTaskId) await Task.deleteOne({ _id: createdTaskId })
    await Promise.all([
      Notification.deleteMany({ user: { $in: users.map(user => user._id) } }),
      DailyReportNote.deleteMany({ createdBy: { $in: users.map(user => user._id) } }),
      User.deleteMany({ _id: { $in: users.map(user => user._id) } })
    ])
    await mongoose.disconnect()
  })

  const created = await call('/api/tasks', { method: 'POST', body: {
    title: 'Integration test task',
    description: 'Verify the new task workflow',
    assignedTo: String(worker._id),
    priority: 'High',
    dueDate: new Date().toISOString().slice(0, 10)
  } })
  assert.equal(created.status, 201)
  const createdBody = await created.json()
  createdTaskId = createdBody.task._id
  assert.equal(createdBody.task.status, 'To Do')
  assert.equal(String(createdBody.task.assignedTo._id), String(worker._id))

  const workerList = await (await call('/api/tasks', { user: worker })).json()
  assert.equal(workerList.tasks.length, 1)
  assert.equal(workerList.summary.pending, 1)
  const strangerList = await (await call('/api/tasks', { user: stranger })).json()
  assert.equal(strangerList.tasks.length, 0)

  const deniedEdit = await call(`/api/tasks/${createdTaskId}`, { user: stranger, method: 'PATCH', body: { status: 'Completed' } })
  assert.equal(deniedEdit.status, 404)

  const assignedNotifications = await (await call('/api/notifications', { user: worker })).json()
  assert.equal(assignedNotifications.unreadCount, 1)
  assert.equal(assignedNotifications.notifications[0].type, 'assigned')

  const changed = await call(`/api/tasks/${createdTaskId}`, { user: worker, method: 'PATCH', body: { status: 'Completed' } })
  assert.equal(changed.status, 200)

  const reportDate = new Date().toISOString().slice(0, 10)
  const reportResponse = await call(`/api/reports/daily?date=${reportDate}`)
  assert.equal(reportResponse.status, 200)
  const report = await reportResponse.json()
  assert.equal(report.metrics.completed, 1)
  assert.equal(report.completedTasks[0].title, 'Integration test task')

  const noteResponse = await call('/api/reports/daily/notes', { method: 'POST', body: { date: reportDate, note: 'Follow up on the inspection' } })
  assert.equal(noteResponse.status, 201)
  const reportWithNote = await (await call(`/api/reports/daily?date=${reportDate}`)).json()
  assert.equal(reportWithNote.notes.length, 1)

  const csvResponse = await call(`/api/reports/daily.csv?date=${reportDate}`)
  assert.match(csvResponse.headers.get('content-type'), /text\/csv/)
  assert.match(await csvResponse.text(), /Integration test task/)

  const marked = await call(`/api/notifications/${assignedNotifications.notifications[0]._id}/read`, { user: worker, method: 'PATCH' })
  assert.equal(marked.status, 200)
  const afterRead = await (await call('/api/notifications', { user: worker })).json()
  assert.equal(afterRead.unreadCount, 0)
})
