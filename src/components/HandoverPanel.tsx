import { useState } from 'react'
import { supabase, demoMode } from '../lib/supabase'
import { setShare, verifyChain } from '../lib/api4'
import type { Project } from '../types'
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
const tbl = (h: string[], rows: unknown[][]) => `<table><tr>${h.map(x => `<th>${esc(x)}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${h.length}">None recorded</td></tr>`}</table>`
export default function HandoverPanel({ p }: { p: Project }) {
  const [token, setToken] = useState<string | null>(p.share_token ?? null), [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const url = token ? `${location.origin}/status/${token}` : null
  async function link(enable: boolean) { const r = await setShare(p.id, enable); setErr(r.error); if (!r.error) setToken(r.token) }
  async function passport() { setBusy(true); setErr(null)
    try { const q = async (t: string, cols: string, f?: (b: any) => any) => demoMode ? [] : ((await (f ? f(supabase!.from(t).select(cols)) : supabase!.from(t).select(cols))).data ?? []) as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
      const [permits, nmev, ms, docs, people, last, eqs] = await Promise.all([q('permit_checklist_items', 'title,status,due_date,approved_on,rejection_reason', b => b.eq('project_id', p.id)), q('net_metering_events', 'to_status,changed_at', b => b.eq('project_id', p.id).order('changed_at')),
        q('payment_milestones', 'id,description,milestone_amount,status,verified_by,approved_by,approval_notes', b => b.eq('project_id', p.id)), q('documents', 'title,category,status,current_version', b => b.eq('project_id', p.id)), q('profiles', 'id,full_name'),
        q('activity_logs', 'hash,seq', b => b.eq('project_id', p.id).not('hash', 'is', null).order('seq', { ascending: false }).limit(1)), q('equipment', 'kind,make,model,serial,quantity', b => b.eq('project_id', p.id))])
      const ev = ms.length ? await q('milestone_evidence', 'milestone_id,kind,taken_at,lat,lng', b => b.in('milestone_id', ms.map(m => m.id))) : [], who = (id: string | null) => people.find(x => x.id === id)?.full_name ?? (id ? 'unknown user' : '-'), chain = await verifyChain(p.id)
      const html = `<!doctype html><meta charset="utf-8"><title>Project Passport ${esc(p.code)}</title><style>body{font:14px system-ui;max-width:800px;margin:24px auto;color:#16324F}h1{margin:0}h2{margin-top:22px;border-bottom:2px solid #F4B942}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left}small{color:#64748b}@media print{h2{break-after:avoid}}</style>
<h1>Project Passport: ${esc(p.name)}</h1><small>${esc(p.code)} · generated ${new Date().toLocaleString('en-IN')} from SolarFlow OS records</small>${p.status !== 'Completed' ? '<p><b>Note: this project is not marked Completed (status: ' + esc(p.status) + ').</b></p>' : ''}
<h2>Project</h2>${tbl(['Customer', 'Type', 'Capacity', 'Status', 'Commissioned', 'Panel warranty', 'Inverter warranty'], [[p.customer_name, p.project_type, p.capacity_kw + ' kW', p.status, p.commissioned_on ?? '-', p.warranty_panel_years ? p.warranty_panel_years + ' yr' : '-', p.warranty_inverter_years ? p.warranty_inverter_years + ' yr' : '-']])}
<h2>Equipment</h2>${tbl(['Kind', 'Make', 'Model', 'Serial', 'Qty'], eqs.map(x => [x.kind, x.make, x.model, x.serial, x.quantity]))}
<h2>Permits</h2>${tbl(['Item', 'Status', 'Due', 'Approved on', 'Reason'], permits.map(x => [x.title, x.status, x.due_date, x.approved_on, x.rejection_reason]))}
<h2>Utility application history</h2>${tbl(['Stage', 'Date'], nmev.map(x => [x.to_status, new Date(x.changed_at).toLocaleDateString('en-IN')]))}
<h2>Documents</h2>${tbl(['Title', 'Category', 'Status', 'Version'], docs.map(x => [x.title, x.category, x.status, 'v' + x.current_version]))}
<h2>Contractor milestones</h2>${tbl(['Milestone', 'Amount (Rs)', 'Status', 'Verified by', 'Approved by', 'Notes'], ms.map(m => [m.description, m.milestone_amount, m.status, who(m.verified_by), who(m.approved_by), m.approval_notes]))}
<h2>Evidence on record</h2>${tbl(['Milestone', 'Kind', 'Taken', 'Location'], ev.map(e => [ms.find(m => m.id === e.milestone_id)?.description, e.kind, new Date(e.taken_at).toLocaleString('en-IN'), e.lat !== null ? `${e.lat}, ${e.lng}` : 'none']))}
<h2>Audit trail integrity</h2><p>${chain.ok === true ? `Verified: ${chain.entries} chained entries are consistent.` : chain.ok === false ? `<b>WARNING: the chain breaks at entry #${chain.broken}. Records may have been altered.</b>` : esc(chain.note)}</p><p><small>Latest chain hash: ${esc(last[0]?.hash ?? 'none')}. Keep a copy of this value elsewhere to make later tampering easier to prove.</small></p>
<p><small>Photo locations come from users' devices and can be inaccurate or faked. The chain detects edits made without recomputing it; it is not a legal certification.${demoMode ? ' Demo mode: only project details are included.' : ''}</small></p>`
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `passport-${p.code}.html`; a.click()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not build the passport.') } finally { setBusy(false) } }
  return <div className="card space-y-2"><h2>Share and handover</h2>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    {url ? <div className="space-y-1 text-sm"><p>Customer status link (anyone with it can see the status):</p><input className="input" readOnly value={url} onFocus={e => e.target.select()}/>
      <div className="flex gap-2"><button className="btn-ghost" onClick={() => void link(true)}>Rotate link</button><button className="btn-ghost" onClick={() => void link(false)}>Turn off</button></div></div>
      : <button className="btn-ghost" onClick={() => void link(true)}>Create customer status link</button>}
    <div><button className="btn" disabled={busy} onClick={() => void passport()}>{busy ? 'Building…' : 'Download Project Passport'}</button><span className="ml-2 text-xs text-slate-500">Opens as a page you can print or save as PDF.</span></div></div>
}
