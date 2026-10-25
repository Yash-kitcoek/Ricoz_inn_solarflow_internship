import { Router } from 'express'
import Project from '../models/Project.js'
import PermitItem from '../models/PermitItem.js'
import NetMeteringApp from '../models/NetMeteringApp.js'
import Milestone from '../models/Milestone.js'
import CustomerRequest from '../models/CustomerRequest.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { accessibleProjectIds, scopeFilter } from '../services/access.js'
import { diagnose } from '../services/stuck.js'
import { asyncHandler } from '../utils/AppError.js'
const r = Router(); r.use(authenticate, authorize('project_manager', 'engineer', 'contractor', 'finance'))
r.get('/', asyncHandler(async (req, res) => {
  const ids = await accessibleProjectIds(req.user), staff = ['admin', 'project_manager', 'engineer'].includes(req.user.role), pf = scopeFilter(ids), now = new Date()
  const msFilter = req.user.role === 'contractor' ? { contractor: req.user.contractor ?? null } : pf
  const requestsFilter = staff ? { ...pf, status: { $in: ['Open', 'In Progress'] } } : { _id: null }
  const [total, active, openPermits, overduePermits, apps, owed] = await Promise.all([
    Project.countDocuments({ archived: false, ...scopeFilter(ids, '_id') }), Project.countDocuments({ archived: false, status: 'Installation in Progress', ...scopeFilter(ids, '_id') }),
    staff ? PermitItem.countDocuments({ ...pf, status: { $ne: 'Approved' } }) : 0, staff ? PermitItem.countDocuments({ ...pf, status: { $ne: 'Approved' }, dueDate: { $lt: now } }) : 0,
    staff ? NetMeteringApp.find({ ...pf, status: { $nin: ['Connected to Grid'] } }).populate('project', 'code name') : [],
    Milestone.aggregate([{ $match: { ...msFilter, status: { $ne: 'paid' } } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]) ])
  const [openCustomerRequests, recentCustomerRequests] = staff ? await Promise.all([
    CustomerRequest.countDocuments(requestsFilter),
    CustomerRequest.find(requestsFilter).sort({ createdAt: -1 }).limit(5).populate('customer', 'name').populate('project', 'code name')
  ]) : [0, []]
  const diag = apps.map(a => ({ id: a._id, project: a.project, utility: a.utility, status: a.status, ...diagnose(a.status, a.statusChangedAt) }))
  res.json({ totalProjects: total, activeInstallations: active, openPermitItems: openPermits, overduePermitItems: overduePermits, pendingNetMetering: apps.filter(a => a.status !== 'Approved').length,
    stuckApplications: diag.filter(d => d.late).sort((a, b) => b.days - a.days).slice(0, 5), unpaidMilestoneAmount: owed[0]?.sum ?? 0,
    openCustomerRequests, recentCustomerRequests })
}))
export default r
