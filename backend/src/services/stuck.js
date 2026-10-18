export const NM_STATUSES = ['Not Started', 'Documents Required', 'Ready to Submit', 'Submitted', 'Under Review', 'Inspection Scheduled', 'Approved', 'Rejected', 'Connected to Grid']
export const AUTHORITY_STAGES = ['Submitted', 'Under Review', 'Inspection Scheduled']
// Default limits in days are editable starting points, not legal deadlines.
const MAP = {
  'Not Started': { owner: 'Installer', action: 'Collect the documents and open the application.', limit: 5 },
  'Documents Required': { owner: 'Installer / customer', action: 'Chase the missing documents or complete them.', limit: 5 },
  'Ready to Submit': { owner: 'Installer', action: 'Submit the packet to the authority and record the date.', limit: 3 },
  'Submitted': { owner: 'Authority', action: 'Follow up with the authority and ask for a reference and a reviewer.', limit: 18 },
  'Under Review': { owner: 'Authority', action: 'Ask for the pending query and the expected inspection date.', limit: 18 },
  'Inspection Scheduled': { owner: 'Authority', action: 'Confirm the inspection slot; prepare site, photos and drawings.', limit: 18 },
  'Approved': { owner: 'Installer', action: 'Arrange the meter and grid connection.', limit: 10 },
  'Rejected': { owner: 'Installer', action: 'Read the rejection reason, fix it and resubmit.', limit: 3 },
  'Connected to Grid': { owner: 'Nobody', action: 'Complete. Close out final payments.', limit: null } }
export function diagnose(status, since, now = Date.now()) {
  const m = MAP[status] ?? MAP['Not Started'], days = Math.max(0, Math.floor((now - new Date(since).getTime()) / 864e5))
  return { ...m, days, late: m.limit !== null && days > m.limit }
}
// Average days spent in authority-owned stages per utility, from completed stages only
export function scorecard(apps) {
  const by = {}
  for (const a of apps) {
    const h = [...a.history].sort((x, y) => new Date(x.at) - new Date(y.at)); let sum = 0
    for (let i = 0; i < h.length - 1; i++) if (AUTHORITY_STAGES.includes(h[i].status)) sum += (new Date(h[i + 1].at) - new Date(h[i].at)) / 864e5
    if (sum > 0) (by[a.utility] ??= []).push(sum)
  }
  return Object.entries(by).map(([utility, v]) => ({ utility, applications: v.length, avgDays: Math.round(v.reduce((s, x) => s + x, 0) / v.length) })).sort((a, b) => b.avgDays - a.avgDays)
}
