import { supabase, demoMode } from './supabase'
const dChecks: Record<string, boolean> = {}
export async function listChecks(pid: string): Promise<{ data: Record<string, boolean>; error: string | null }> {
  if (demoMode) return { data: Object.fromEntries(Object.entries(dChecks).filter(([k]) => k.startsWith(pid + ':')).map(([k, v]) => [k.slice(pid.length + 1), v])), error: null }
  const r = await supabase!.from('subsidy_checks').select('item_key,done').eq('project_id', pid)
  return { data: Object.fromEntries((r.data ?? []).map(x => [x.item_key as string, x.done as boolean])), error: r.error?.message ?? null }
}
export async function setCheck(pid: string, key: string, done: boolean): Promise<string | null> {
  if (demoMode) { dChecks[pid + ':' + key] = done; return null }
  return (await supabase!.from('subsidy_checks').upsert({ project_id: pid, item_key: key, done, updated_at: new Date().toISOString() }, { onConflict: 'project_id,item_key' })).error?.message ?? null
}
