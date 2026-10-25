import { Router } from 'express'
import { z } from 'zod'
import CustomerRequest, { CUSTOMER_REQUEST_STATUSES } from '../models/CustomerRequest.js'
import { record } from '../models/ActivityLog.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { accessibleProjectIds, scopeFilter } from '../services/access.js'
import { notifyCustomerRequestUpdated } from '../services/customerNotifications.js'
import { AppError, asyncHandler } from '../utils/AppError.js'
import { idParams } from '../utils/schemas.js'

const r = Router()
r.use(authenticate, authorize('admin', 'project_manager', 'engineer'))

r.get('/', validate(z.object({
  status: z.enum(CUSTOMER_REQUEST_STATUSES).optional()
}), 'query'), asyncHandler(async (req, res) => {
  const filter = scopeFilter(await accessibleProjectIds(req.user))
  if (req.query.status) filter.status = req.query.status
  const requests = await CustomerRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('customer', 'name email')
    .populate('project', 'code name')
  res.json({ requests })
}))

r.patch('/:id', validate(idParams, 'params'), validate(z.object({
  status: z.enum(CUSTOMER_REQUEST_STATUSES).optional(),
  response: z.string().trim().max(2000).optional()
}).refine(body => Object.keys(body).length > 0, 'Provide a status or response'), 'body'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id, ...scopeFilter(await accessibleProjectIds(req.user)) }
  const request = await CustomerRequest.findOne(filter)
  if (!request) throw new AppError(404, 'Support request not found')
  const changed = (req.body.status && req.body.status !== request.status) || (req.body.response !== undefined && req.body.response !== request.response)
  Object.assign(request, req.body, { updatedBy: req.user._id })
  await request.save()
  if (changed) {
    await notifyCustomerRequestUpdated(request)
    await record(req.user, request.project, 'updated customer support request', `${request.subject}: ${request.status}`)
  }
  res.json({ request })
}))

export default r
