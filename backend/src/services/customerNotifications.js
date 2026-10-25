import Notification from '../models/Notification.js'
import Project from '../models/Project.js'
import User from '../models/User.js'

export async function notifyProjectCustomer(projectId, { title, message, dedupeKey }) {
  const project = await Project.findById(projectId).select('customerAccount')
  if (!project?.customerAccount) return null
  return createNotification({
    user: project.customerAccount,
    project: projectId,
    title,
    message,
    type: 'project_update',
    dedupeKey
  })
}

export async function notifyAdminsOfCustomerRequest(request) {
  const [project, customer, admins] = await Promise.all([
    Project.findById(request.project).select('name code projectManager engineer'),
    User.findById(request.customer).select('name'),
    User.find({ role: { $in: ['admin', 'project_manager', 'engineer'] }, approved: true }).select('_id')
  ])
  if (!project || !customer) return []
  const recipients = new Set(admins.map(user => String(user._id)))
  if (project.projectManager) recipients.add(String(project.projectManager))
  if (project.engineer) recipients.add(String(project.engineer))
  return Promise.all([...recipients].map(user => createNotification({
    user,
    project: request.project,
    title: 'New customer support request',
    message: `${customer.name} · ${request.subject}`,
    type: 'support_request',
    dedupeKey: `support-request:${request._id}:created`
  })))
}

export async function notifyCustomerRequestUpdated(request) {
  return createNotification({
    user: request.customer,
    project: request.project,
    title: 'Support request updated',
    message: `${request.subject} · ${request.status}`,
    type: 'project_update',
    dedupeKey: `support-request:${request._id}:${request.status}:${request.updatedAt.getTime()}`
  })
}

async function createNotification({ user, project, title, message, type, dedupeKey }) {
  try {
    return await Notification.create({ user, project, title, message, type, dedupeKey })
  } catch (error) {
    if (error?.code === 11000) return null
    throw error
  }
}
