import { supabase } from './supabase'
const URL = import.meta.env.VITE_AI_SERVICE_URL as string | undefined
export const aiEnabled = !!URL && !!supabase
type R<T> = { ok: true; data: T } | { ok: false; error: string }
async function call<T>(path: string, body: BodyInit, json: boolean): Promise<R<T>> {
  try { const tok = (await supabase!.auth.getSession()).data.session?.access_token; if (!tok) return { ok: false, error: 'Not signed in.' }
    const r = await fetch(URL!.replace(/\/$/, '') + path, { method: 'POST', body, headers: { Authorization: 'Bearer ' + tok, ...(json ? { 'Content-Type': 'application/json' } : {}) } })
    if (!r.ok) return { ok: false, error: ((await r.json().catch(() => ({}))) as { detail?: string }).detail ?? `Service error ${r.status}` }
    return { ok: true, data: (await r.json()) as T } } catch { return { ok: false, error: 'AI service is not reachable.' } }
}
export const checkPhoto = (kind: string, file: File) => { const f = new FormData(); f.append('kind', kind); f.append('file', file); return call<{ present: boolean; confidence: number; notes: string }>('/precheck/photo', f, false) }
export const checkPacket = (project_id: string) => call<{ findings: { severity: string; message: string }[] }>('/precheck/packet', JSON.stringify({ project_id }), true)
export const extractNameplate = (file: File) => { const f = new FormData(); f.append('file', file); return call<{ make: string | null; model: string | null; serial: string | null }>('/extract/nameplate', f, false) }
