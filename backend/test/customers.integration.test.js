import test from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'

const testUri = process.env.MONGODB_CUSTOMER_TEST_URI

test('customer data, support requests, notifications, and project access are scoped to the linked account', { skip: !testUri }, async t => {
  process.env.NODE_ENV = 'test'
  process.env.MONGODB_URI = testUri
  process.env.JWT_SECRET = 'customer-integration-secret-that-is-long-enough'

  const [
    { default: app },
    { default: mongoose },
    { default: User },
    { default: Project },
    { default: CustomerRequest },
    { default: Notification },
    { default: Contractor },
    { default: PermitItem },
    { default: NetMeteringApp },
    { default: Milestone },
    { default: ActivityLog }
  ] = await Promise.all([
    import('../src/app.js'),
    import('mongoose'),
    import('../src/models/User.js'),
    import('../src/models/Project.js'),
    import('../src/models/CustomerRequest.js'),
    import('../src/models/Notification.js'),
    import('../src/models/Contractor.js'),
    import('../src/models/PermitItem.js'),
    import('../src/models/NetMeteringApp.js'),
    import('../src/models/Milestone.js'),
    import('../src/models/ActivityLog.js')
  ])
  const { connectDb } = await import('../src/config/db.js')
  await connectDb()

  const server = app.listen(0)
  await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const users = await User.create([
    { name: 'Customer Test Admin', email: `admin-${unique}@example.test`, passwordHash: 'unused', role: 'admin', approved: true },
    { name: 'Customer One', email: `customer-one-${unique}@example.test`, passwordHash: 'unused', role: 'customer', approved: true },
    { name: 'Customer Two', email: `customer-two-${unique}@example.test`, passwordHash: 'unused', role: 'customer', approved: true },
    { name: 'Project Manager', email: `pm-${unique}@example.test`, passwordHash: 'unused', role: 'project_manager', approved: true }
  ])
  const [admin, customerOne, customerTwo, projectManager] = users
  const project = await Project.create({
    code: `CUST-${unique}`,
    name: 'Customer privacy test',
    customerName: customerOne.name,
    customerAccount: customerOne._id,
    type: 'Residential',
    capacityKw: 5,
    contractValue: 999999,
    notes: 'private internal notes',
    status: 'Planning',
    progress: 10,
    projectManager: projectManager._id,
    endDate: new Date('2027-06-30')
  })
  const contractor = await Contractor.create({ companyName: `Test contractor ${unique}` })
  const tokenFor = user => jwt.sign({ sub: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' })
  const call = (path, { user = admin, method = 'GET', body } = {}) => fetch(`${base}${path}`, {
    method,
    headers: { cookie: `token=${tokenFor(user)}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  let extraCustomerId
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await Promise.all([
      Notification.deleteMany({ user: { $in: users.map(user => user._id) } }),
      CustomerRequest.deleteMany({ project: project._id }),
      PermitItem.deleteMany({ project: project._id }),
      NetMeteringApp.deleteMany({ project: project._id }),
      Milestone.deleteMany({ project: project._id }),
      ActivityLog.deleteMany({ project: project._id }),
      Contractor.deleteOne({ _id: contractor._id }),
      Project.deleteOne({ _id: project._id }),
      User.deleteMany({ _id: { $in: [...users.map(user => user._id), ...(extraCustomerId ? [extraCustomerId] : [])] } })
    ])
    await mongoose.disconnect()
  })

  const overviewResponse = await call('/api/customer/overview', { user: customerOne })
  assert.equal(overviewResponse.status, 200)
  const overview = await overviewResponse.json()
  assert.equal(overview.projects.length, 1)
  assert.equal(overview.projects[0].name, project.name)

  const otherOverview = await (await call('/api/customer/overview', { user: customerTwo })).json()
  assert.equal(otherOverview.projects.length, 0)

  const projectList = await (await call('/api/projects', { user: customerOne })).json()
  assert.equal(projectList.projects.length, 1)
  assert.equal('contractValue' in projectList.projects[0], false)
  assert.equal('notes' in projectList.projects[0], false)
  const projectDetail = await (await call(`/api/projects/${project._id}`, { user: customerOne })).json()
  assert.equal('contractValue' in projectDetail.project, false)
  assert.equal('notes' in projectDetail.project, false)

  const deniedPaymentData = await call('/api/milestones', { user: customerOne })
  assert.equal(deniedPaymentData.status, 403)
  assert.equal((await call('/api/tasks', { user: customerOne })).status, 403)
  assert.equal((await call('/api/reports/daily?date=2026-10-25', { user: customerOne })).status, 403)
  assert.equal((await call('/api/tasks', {
    method: 'POST',
    body: { title: 'Customer should not receive internal task', assignedTo: String(customerOne._id) }
  })).status, 400)
  const deniedAdminData = await call('/api/dashboard', { user: customerOne })
  assert.equal(deniedAdminData.status, 403)
  assert.equal((await call('/api/users/customers', { user: customerOne })).status, 403)
  assert.equal((await call('/api/support-requests', { user: customerOne })).status, 403)
  const createdAccountResponse = await call('/api/users/customers', {
    method: 'POST',
    body: { name: 'New customer', email: `new-customer-${unique}@example.test`, password: 'temporary-password-123' }
  })
  assert.equal(createdAccountResponse.status, 201)
  const createdAccountBody = await createdAccountResponse.json()
  extraCustomerId = createdAccountBody.customer.id
  assert.equal(createdAccountBody.customer.role, 'customer')
  assert.equal(createdAccountBody.customer.approved, true)
  assert.equal('passwordHash' in createdAccountBody.customer, false)
  const editAccountResponse = await call(`/api/users/${extraCustomerId}`, {
    method: 'PATCH',
    body: { name: 'Updated customer', email: `updated-customer-${unique}@example.test` }
  })
  assert.equal(editAccountResponse.status, 200)
  assert.equal((await editAccountResponse.json()).user.name, 'Updated customer')
  const deniedReassignment = await call(`/api/projects/${project._id}`, {
    user: projectManager,
    method: 'PATCH',
    body: { customerAccount: String(customerTwo._id) }
  })
  assert.equal(deniedReassignment.status, 403)

  const forbiddenRequest = await call('/api/customer/requests', {
    user: customerTwo,
    method: 'POST',
    body: { project: String(project._id), subject: 'Question', message: 'Please check this project.' }
  })
  assert.equal(forbiddenRequest.status, 404)

  const createdResponse = await call('/api/customer/requests', {
    user: customerOne,
    method: 'POST',
    body: { project: String(project._id), subject: 'Installation question', message: 'Please confirm the next installation date.' }
  })
  assert.equal(createdResponse.status, 201)
  const created = await createdResponse.json()

  const adminNotifications = await (await call('/api/notifications')).json()
  assert.equal(adminNotifications.notifications.some(item => item.type === 'support_request'), true)
  const otherCustomerNotifications = await (await call('/api/notifications', { user: customerTwo })).json()
  assert.equal(otherCustomerNotifications.notifications.length, 0)

  const updatedResponse = await call(`/api/support-requests/${created.request._id}`, {
    method: 'PATCH',
    body: { status: 'In Progress', response: 'The team is checking the schedule.' }
  })
  assert.equal(updatedResponse.status, 200)
  const customerAfterUpdate = await (await call('/api/customer/overview', { user: customerOne })).json()
  assert.equal(customerAfterUpdate.requests[0].status, 'In Progress')
  assert.equal(customerAfterUpdate.requests[0].response, 'The team is checking the schedule.')

  const changedProject = await call(`/api/projects/${project._id}`, {
    method: 'PATCH',
    body: { status: 'Installation in Progress', progress: 35 }
  })
  assert.equal(changedProject.status, 200)
  const customerNotifications = await (await call('/api/notifications', { user: customerOne })).json()
  assert.equal(customerNotifications.notifications.some(item => item.type === 'project_update'), true)
  const customerProjectNotification = customerNotifications.notifications.find(item => item.type === 'project_update')
  assert.ok(customerProjectNotification)
  assert.equal((await call(`/api/notifications/${customerProjectNotification._id}/read`, { user: customerTwo, method: 'PATCH' })).status, 404)

  const permit = await call('/api/permits', {
    method: 'POST',
    body: { project: String(project._id), title: 'Customer permit update' }
  })
  assert.equal(permit.status, 201)
  const permitBody = await permit.json()
  assert.equal((await call(`/api/permits/${permitBody.item._id}`, { method: 'PATCH', body: { status: 'Submitted' } })).status, 200)

  const netMetering = await call('/api/net-metering', { method: 'POST', body: { project: String(project._id), utility: 'Customer Utility' } })
  assert.equal(netMetering.status, 201)
  const netMeteringBody = await netMetering.json()
  assert.equal((await call(`/api/net-metering/${netMeteringBody.application._id}/status`, { method: 'PATCH', body: { status: 'Submitted' } })).status, 200)

  const createdMilestone = await call('/api/milestones', {
    method: 'POST',
    body: { project: String(project._id), contractor: String(contractor._id), description: 'Customer-visible milestone', amount: 12345 }
  })
  assert.equal(createdMilestone.status, 201)
  const milestoneBody = await createdMilestone.json()
  assert.equal((await call(`/api/milestones/${milestoneBody.milestone.id}/transition`, { method: 'POST', body: { to: 'awaiting_evidence' } })).status, 200)
  const updatedOperations = await (await call('/api/customer/overview', { user: customerOne })).json()
  assert.equal(updatedOperations.projects[0].permits[0].status, 'Submitted')
  assert.equal(updatedOperations.projects[0].netMetering[0].status, 'Submitted')
  assert.equal(updatedOperations.projects[0].milestones[0].status, 'awaiting_evidence')

  const transferred = await call(`/api/projects/${project._id}`, {
    method: 'PATCH',
    body: { customerAccount: String(customerTwo._id) }
  })
  assert.equal(transferred.status, 200)
  assert.equal((await (await call('/api/customer/overview', { user: customerOne })).json()).projects.length, 0)
  const newOwnerOverview = await (await call('/api/customer/overview', { user: customerTwo })).json()
  assert.equal(newOwnerOverview.projects.length, 1)
  assert.equal(newOwnerOverview.projects[0].milestones[0].status, 'awaiting_evidence')
  assert.equal((await (await call('/api/notifications', { user: customerOne })).json()).notifications.length, 0)
  const newOwnerNotifications = await (await call('/api/notifications', { user: customerTwo })).json()
  assert.equal(newOwnerNotifications.notifications.some(item => item.message.includes('assigned to your customer account')), true)
})
