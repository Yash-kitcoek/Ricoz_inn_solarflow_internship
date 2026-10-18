import { supabase, demoMode } from './supabase'
import type { Equip, Rej } from './equipment'
const dEq: Equip[] = [{ id: 'e1', project_id: 'd1', kind: 'panel', make: 'Sample Make', model: 'SM-550', serial: 'SN001', quantity: 12 }]
const dRej: Rej[] = [{ id: 'r1', project_id: 'd1', authority: 'Utility A (sample)', office: null, category: 'Missing document', reason: 'Single-line diagram not attached', resolved: true, created_at: new Date().toISOString() }]
const msg = (e: { message: string } | null) => e?.message ?? null
export async function listEquipment(): Promise<{ data: Equip[]; error: string | null }> {
  if (demoMode) return { data: [...dEq], error: null }
  const r = await supabase!.from('equipment').select('id,project_id,kind,make,model,serial,quantity').order('created_at', { ascending: false }); return { data: (r.data ?? []) as Equip[], error: msg(r.error) }
}
export async function addEquipment(row: Omit<Equip, 'id'>): Promise<string | null> {
  if (demoMode) { dEq.push({ ...row, id: crypto.randomUUID() }); return null }
  return msg((await supabase!.from('equipment').insert(row)).error)
}
export async function deleteEquipment(id: string): Promise<string | null> {
  if (demoMode) { const i = dEq.findIndex(x => x.id === id); if (i >= 0) dEq.splice(i, 1); return null }
  return msg((await supabase!.from('equipment').delete().eq('id', id)).error)
}
export async function listRejections(): Promise<{ data: Rej[]; error: string | null }> {
  if (demoMode) return { data: [...dRej], error: null }
  const r = await supabase!.from('rejections').select('id,project_id,authority,office,category,reason,resolved,created_at').order('created_at', { ascending: false }); return { data: (r.data ?? []) as Rej[], error: msg(r.error) }
}
export async function addRejection(row: Pick<Rej, 'project_id' | 'authority' | 'office' | 'category' | 'reason'>): Promise<string | null> {
  if (demoMode) { dRej.unshift({ ...row, id: crypto.randomUUID(), resolved: false, created_at: new Date().toISOString() }); return null }
  return msg((await supabase!.from('rejections').insert(row)).error)
}
export async function setResolved(id: string, resolved: boolean): Promise<string | null> {
  if (demoMode) { const x = dRej.find(y => y.id === id); if (x) x.resolved = resolved; return null }
  return msg((await supabase!.from('rejections').update({ resolved }).eq('id', id)).error)
}
