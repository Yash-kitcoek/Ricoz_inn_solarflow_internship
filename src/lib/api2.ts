import { supabase, demoMode } from './supabase'
import type { NmEvent } from './stuck'
export interface NmApp { id: string; project_id: string; utility_provider: string | null; status: string; status_changed_at: string }
export interface Milestone { id: string; project_id: string; contractor_id: string | null; due_date: string | null; description: string; milestone_amount: number; status: string; required_evidence: string[]; evidence: { kind: string; geo: boolean }[]; hasInvoice: boolean }
const ago = (d: number) => new Date(Date.now() - d * 864e5).toISOString()
const dApps: NmApp[] = [
  { id: 'n1', project_id: 'd1', utility_provider: 'Utility A (sample)', status: 'Under Review', status_changed_at: ago(26) },
  { id: 'n2', project_id: 'd3', utility_provider: 'Utility B (sample)', status: 'Inspection Scheduled', status_changed_at: ago(4) },
  { id: 'n3', project_id: 'd2', utility_provider: 'Utility A (sample)', status: 'Connected to Grid', status_changed_at: ago(2) }]
const dEv: NmEvent[] = [
  { application_id: 'n1', to_status: 'Submitted', changed_at: ago(40) }, { application_id: 'n1', to_status: 'Under Review', changed_at: ago(26) },
  { application_id: 'n2', to_status: 'Submitted', changed_at: ago(20) }, { application_id: 'n2', to_status: 'Under Review', changed_at: ago(12) }, { application_id: 'n2', to_status: 'Inspection Scheduled', changed_at: ago(4) },
  { application_id: 'n3', to_status: 'Submitted', changed_at: ago(30) }, { application_id: 'n3', to_status: 'Under Review', changed_at: ago(22) }, { application_id: 'n3', to_status: 'Inspection Scheduled', changed_at: ago(10) }, { application_id: 'n3', to_status: 'Connected to Grid', changed_at: ago(2) }]
const dMs: Milestone[] = [{ id: 'm1', project_id: 'd1', contractor_id: 'c1', due_date: ago(-10).slice(0, 10), description: 'Panel installation', milestone_amount: 212000, status: 'awaiting_evidence', required_evidence: ['panels', 'inverter'], evidence: [], hasInvoice: false }]
export async function listNm() {
  if (demoMode) return { apps: [...dApps], events: [...dEv], error: null as string | null }
  const [a, e] = await Promise.all([supabase!.from('net_metering_applications').select('id,project_id,utility_provider,status,status_changed_at'), supabase!.from('net_metering_events').select('application_id,to_status,changed_at')])
  return { apps: (a.data ?? []) as NmApp[], events: (e.data ?? []) as NmEvent[], error: a.error?.message ?? e.error?.message ?? null }
}
export async function setNmStatus(id: string, status: string): Promise<string | null> {
  if (demoMode) { const a = dApps.find(x => x.id === id)!; a.status = status; a.status_changed_at = ago(0); dEv.push({ application_id: id, to_status: status, changed_at: ago(0) }); return null }
  return (await supabase!.from('net_metering_applications').update({ status }).eq('id', id)).error?.message ?? null
}
export async function addNm(project_id: string, utility_provider: string): Promise<string | null> {
  if (demoMode) { const id = crypto.randomUUID(); dApps.push({ id, project_id, utility_provider, status: 'Not Started', status_changed_at: ago(0) }); dEv.push({ application_id: id, to_status: 'Not Started', changed_at: ago(0) }); return null }
  return (await supabase!.from('net_metering_applications').insert({ project_id, utility_provider }).error?.message) ?? null
}
export async function listMilestones() {
  if (demoMode) return { data: dMs.map(m => ({ ...m })), error: null as string | null }
  const [m, e, i] = await Promise.all([supabase!.from('payment_milestones').select('id,project_id,contractor_id,due_date,description,milestone_amount,status,required_evidence'), supabase!.from('milestone_evidence').select('milestone_id,kind,lat,lng'), supabase!.from('invoices').select('milestone_id')])
  const data = (m.data ?? []).map(x => ({ ...x, evidence: (e.data ?? []).filter(v => v.milestone_id === x.id).map(v => ({ kind: v.kind as string, geo: v.lat !== null && v.lng !== null })), hasInvoice: (i.data ?? []).some(v => v.milestone_id === x.id) })) as Milestone[]
  return { data, error: m.error?.message ?? e.error?.message ?? i.error?.message ?? null }
}
export async function uploadEvidence(m: Pick<Milestone, 'id' | 'project_id'>, kind: string, file: File, pos: { lat: number; lng: number } | null, takenAt?: string): Promise<string | null> {
  if (demoMode) { dMs.find(x => x.id === m.id)!.evidence.push({ kind, geo: !!pos }); return null }
  const path = `${m.project_id}/${m.id}/${kind}-${Date.now()}-${file.name}`
  const up = await supabase!.storage.from('project-files').upload(path, file); if (up.error) return up.error.message
  const uid = (await supabase!.auth.getUser()).data.user?.id
  return (await supabase!.from('milestone_evidence').insert({ milestone_id: m.id, kind, storage_path: path, taken_at: takenAt ?? new Date().toISOString(), lat: pos?.lat ?? null, lng: pos?.lng ?? null, uploaded_by: uid })).error?.message ?? null
}
export async function addInvoice(m: Milestone, number: string, date: string): Promise<string | null> {
  if (demoMode) { dMs.find(x => x.id === m.id)!.hasInvoice = true; return null }
  const uid = (await supabase!.auth.getUser()).data.user?.id
  return (await supabase!.from('invoices').insert({ milestone_id: m.id, invoice_number: number, invoice_date: date, uploaded_by: uid })).error?.message ?? null
}
export async function setMilestoneStatus(m: Milestone, status: string, notes?: string): Promise<string | null> {
  if (demoMode) { const x = dMs.find(v => v.id === m.id)!; const miss = x.required_evidence.filter(k => !x.evidence.some(e => e.kind === k && e.geo))
    if (status === 'pending_verification' && (miss.length || !x.hasInvoice)) return 'Missing evidence with location or invoice.'; x.status = status; return null }
  return (await supabase!.from('payment_milestones').update({ status, ...(notes ? { approval_notes: notes } : {}) }).eq('id', m.id)).error?.message ?? null
}
export async function recordPayment(m: Milestone, ref: string): Promise<string | null> {
  if (demoMode) { dMs.find(x => x.id === m.id)!.status = 'paid'; return null }
  const uid = (await supabase!.auth.getUser()).data.user?.id
  return (await supabase!.from('payments').insert({ milestone_id: m.id, amount: m.milestone_amount, paid_on: new Date().toISOString().slice(0, 10), transaction_ref: ref, recorded_by: uid })).error?.message ?? null
}
