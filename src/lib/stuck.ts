export const NM_STATUSES = ['Not Started','Documents Required','Ready to Submit','Submitted','Under Review','Inspection Scheduled','Approved','Rejected','Connected to Grid']
export const DISCOM_STAGES = ['Submitted','Under Review','Inspection Scheduled']
// Default limits in days are editable starting points, not legal deadlines. India's reference net-metering timeline cited by Mercom is 18 days; check your state's rules.
const MAP: Record<string, { owner: string; action: string; limit: number | null }> = {
  'Not Started': { owner: 'Installer', action: 'Collect the documents and open the application.', limit: 5 },
  'Documents Required': { owner: 'Installer / customer', action: 'Chase the missing documents from the customer or complete them.', limit: 5 },
  'Ready to Submit': { owner: 'Installer', action: 'Submit the packet to the authority and record the date.', limit: 3 },
  'Submitted': { owner: 'DISCOM / authority', action: 'Follow up with the authority and ask for a reference and a reviewer.', limit: 18 },
  'Under Review': { owner: 'DISCOM / authority', action: 'Ask for the pending query and the expected inspection date.', limit: 18 },
  'Inspection Scheduled': { owner: 'DISCOM / authority', action: 'Confirm the inspection slot; prepare site, photos and drawings.', limit: 18 },
  'Approved': { owner: 'Installer', action: 'Arrange the meter and grid connection.', limit: 10 },
  'Rejected': { owner: 'Installer', action: 'Read the rejection reason, fix it and resubmit.', limit: 3 },
  'Connected to Grid': { owner: 'Nobody', action: 'Complete. Close out final payments.', limit: null } }
export function diagnose(status: string, since: string, now = Date.now()) {
  const m = MAP[status] ?? MAP['Not Started']; const days = Math.max(0, Math.floor((now - Date.parse(since)) / 864e5))
  return { ...m, days, late: m.limit !== null && days > m.limit }
}
export interface NmEvent { application_id: string; to_status: string; changed_at: string }
// Average days spent in authority-owned stages, per utility, using completed stages only
export function scorecard(apps: { id: string; utility_provider: string | null }[], events: NmEvent[]) {
  const by: Record<string, number[]> = {}
  for (const a of apps) {
    const ev = events.filter(e => e.application_id === a.id).sort((x, y) => x.changed_at.localeCompare(y.changed_at)); let sum = 0
    for (let i = 0; i < ev.length - 1; i++) if (DISCOM_STAGES.includes(ev[i].to_status)) sum += (Date.parse(ev[i + 1].changed_at) - Date.parse(ev[i].changed_at)) / 864e5
    if (sum > 0) (by[a.utility_provider ?? 'Unknown'] ??= []).push(sum)
  }
  return Object.entries(by).map(([utility, v]) => ({ utility, applications: v.length, avgDays: Math.round(v.reduce((s, x) => s + x, 0) / v.length) })).sort((a, b) => b.avgDays - a.avgDays)
}
