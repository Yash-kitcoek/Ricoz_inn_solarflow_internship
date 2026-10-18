import { supabase, demoMode } from './supabase'
export interface Reading { project_id: string; month: string; kwh: number }
export interface PublicStatus { project_name: string; status: string; progress: number; nm_status: string | null; nm_waiting_days: number | null; updated_at: string }
const dReadings: Reading[] = []
export async function listReadings(): Promise<{ data: Reading[]; error: string | null }> {
  if (demoMode) return { data: [...dReadings], error: null }
  const r = await supabase!.from('generation_readings').select('project_id,month,kwh').order('month'); return { data: (r.data ?? []) as Reading[], error: r.error?.message ?? null }
}
export async function saveReadings(rows: Reading[]): Promise<string | null> {
  if (demoMode) { for (const x of rows) { const i = dReadings.findIndex(y => y.project_id === x.project_id && y.month === x.month); if (i >= 0) dReadings[i] = x; else dReadings.push(x) } return null }
  return (await supabase!.from('generation_readings').upsert(rows, { onConflict: 'project_id,month' })).error?.message ?? null
}
export async function setShare(pid: string, enable: boolean): Promise<{ token: string | null; error: string | null }> {
  if (demoMode) return { token: enable ? 'demo-token' : null, error: null }
  const r = await supabase!.rpc('set_share_token', { pid, enable }); return { token: (r.data as string | null) ?? null, error: r.error?.message ?? null }
}
export async function getPublicStatus(token: string): Promise<{ data: PublicStatus | null; error: string | null }> {
  if (demoMode) return { data: { project_name: 'Sample Residence', status: 'Permitting', progress: 30, nm_status: 'Under Review', nm_waiting_days: 12, updated_at: new Date().toISOString() }, error: null }
  const r = await supabase!.rpc('public_project_status', { t: token }); const row = (r.data as PublicStatus[] | null)?.[0] ?? null
  return { data: row, error: r.error?.message ?? (row ? null : 'This link is not valid or has been turned off.') }
}
export async function verifyChain(pid: string): Promise<{ ok: boolean | null; entries: number; broken: number | null; note: string }> {
  if (demoMode) return { ok: null, entries: 0, broken: null, note: 'Demo mode: no audit chain to verify.' }
  const r = await supabase!.rpc('verify_audit_chain', { pid }); const row = (r.data as { ok: boolean; entries: number; broken_seq: number | null }[] | null)?.[0]
  return row ? { ok: row.ok, entries: row.entries, broken: row.broken_seq, note: '' } : { ok: null, entries: 0, broken: null, note: r.error?.message ?? 'Could not verify.' }
}
