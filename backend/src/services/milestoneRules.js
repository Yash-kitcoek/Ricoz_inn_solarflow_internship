export const KINDS = ['panels', 'inverter', 'earthing', 'meter', 'other']
export const MS_STATUSES = ['not_due', 'awaiting_evidence', 'pending_verification', 'pending_approval', 'approved_for_payment', 'paid', 'disputed']
const hasGeo = e => Number.isFinite(e.lat) && Number.isFinite(e.lng)
export const missingEvidence = m => (m.requiredEvidence ?? []).filter(k => !(m.evidence ?? []).some(e => e.kind === k && hasGeo(e)))
const FLOW = { 'not_due>awaiting_evidence': ['admin', 'project_manager'], 'awaiting_evidence>pending_verification': ['admin', 'contractor'],
  'pending_verification>pending_approval': ['admin', 'project_manager'], 'pending_approval>approved_for_payment': ['admin', 'finance'] }
const DISPUTABLE = ['pending_verification', 'pending_approval', 'approved_for_payment']
// Returns { ok: true } or { ok: false, status, error }. Recording the payment itself is a separate step.
export function checkTransition({ milestone, to, role, userId, notes }) {
  const from = milestone.status, deny = (status, error) => ({ ok: false, status, error })
  if (to === 'disputed') {
    if (!DISPUTABLE.includes(from)) return deny(409, 'This milestone cannot be disputed in its current state')
    if (!['admin', 'project_manager', 'finance'].includes(role)) return deny(403, 'Your role cannot dispute a milestone')
    return notes && notes.trim() ? { ok: true } : deny(400, 'A reason is required to dispute a milestone')
  }
  const allowed = FLOW[`${from}>${to}`]
  if (!allowed) return deny(409, `Cannot move from ${from} to ${to}`)
  if (!allowed.includes(role)) return deny(403, 'Your role cannot do this step')
  if (to === 'pending_verification') {
    const miss = missingEvidence(milestone)
    if (miss.length) return deny(409, `Missing photo with location: ${miss.join(', ')}`)
    if (!milestone.invoice?.number) return deny(409, 'An invoice is required')
  }
  if (to === 'approved_for_payment' && milestone.verifiedBy && String(milestone.verifiedBy) === String(userId)) return deny(409, 'The person who verified the work cannot also approve the payment')
  return { ok: true }
}
