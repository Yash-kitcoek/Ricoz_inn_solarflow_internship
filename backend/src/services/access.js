import Project from '../models/Project.js'
import Milestone from '../models/Milestone.js'
import { AppError } from '../utils/AppError.js'
// null means "all projects". Otherwise a list of project ids this user may see.
export async function accessibleProjectIds(user) {
  if (user.role === 'admin' || user.role === 'finance') return null
  if (user.role === 'contractor') return user.contractor ? Milestone.find({ contractor: user.contractor }).distinct('project') : []
  return Project.find({ $or: [{ projectManager: user._id }, { engineer: user._id }] }).distinct('_id')
}
export async function assertProject(user, projectId) {
  const ids = await accessibleProjectIds(user)
  if (ids && !ids.some(i => String(i) === String(projectId))) throw new AppError(404, 'Project not found')
  const p = await Project.findById(projectId); if (!p) throw new AppError(404, 'Project not found'); return p
}
export const scopeFilter = (ids, field = 'project') => (ids === null ? {} : { [field]: { $in: ids } })
