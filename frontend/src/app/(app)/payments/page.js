'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { money, day } from '@/lib/format'
import { Badge, ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
const NEXT = { not_due: ['Open for evidence', 'awaiting_evidence', ['admin', 'project_manager']], pending_verification: ['Verify work', 'pending_approval', ['admin', 'project_manager']], pending_approval: ['Approve', 'approved_for_payment', ['admin', 'finance']] }
const getPos = () => new Promise(r => (navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => r({ lat: p.coords.latitude, lng: p.coords.longitude }), () => r(null), { timeout: 8000 }) : r(null)))
export default function Payments() {
  const { user } = useAuth(), [err, setErr] = useState(null), [note, setNote] = useState(null), canCreate = ['admin', 'project_manager'].includes(user.role)
  const { data, error, loading, reload } = useLoad(async () => { const m = await api('/milestones'); if (!canCreate) return { ...m, projects: [], contractors: [] }; const [p, c] = await Promise.all([api('/projects'), api('/contractors')]); return { ...m, projects: p.projects, contractors: c.contractors } })
  const run = async fn => { try { setErr(null); await fn(); reload() } catch (x) { setErr(x.message) } }
  const act = (m, to, notes) => run(() => api(`/milestones/${m.id}/transition`, { method: 'POST', body: { to, notes } }))
  async function create(e) { e.preventDefault(); const form = e.currentTarget, f = Object.fromEntries(new FormData(form)); if (!f.dueDate) delete f.dueDate; await run(() => api('/milestones', { method: 'POST', body: f })); form.reset() }
  async function upload(m, kind, file) { if (!file) return; const pos = await getPos(); setNote(pos ? null : 'No location was captured, so this photo will not count. Allow location access and upload again.')
    const form = new FormData(); form.append('kind', kind); form.append('photo', file); if (pos) { form.append('lat', pos.lat); form.append('lng', pos.lng) }
    await run(() => api(`/milestones/${m.id}/evidence`, { method: 'POST', form })) }
  const invoice = m => { const number = (prompt('Invoice number:') || '').trim(); if (number) run(() => api(`/milestones/${m.id}/invoice`, { method: 'PUT', body: { number, date: new Date().toISOString() } })) }
  const pay = m => { const reference = (prompt('Transaction reference of the payment you made (required):') || '').trim(); if (reference) run(() => api(`/milestones/${m.id}/pay`, { method: 'POST', body: { reference } })) }
  const dispute = m => { const notes = (prompt('Reason for dispute (required):') || '').trim(); if (notes) act(m, 'disputed', notes) }
  if (loading) return <Loading />
  return <div className="space-y-3"><PageHeader title="Payments" /><p className="text-sm text-slate-500">Records approvals and payments made elsewhere; no money is moved. Photo locations come from the device and can be faked, so they support, not replace, the verifier's check.</p>
    <ErrorText>{err || error}</ErrorText>{note && <p className="text-sm text-amber-700">{note}</p>}
    {canCreate && <form onSubmit={create} className="card grid gap-2 sm:grid-cols-6"><select name="project" className="input" required>{data?.projects.map(p => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}</select>
      <select name="contractor" className="input" required>{data?.contractors.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}</select><input name="description" className="input" placeholder="Milestone" required /><input name="amount" type="number" min="1" className="input" placeholder="Amount (Rs)" required /><input name="dueDate" type="date" className="input" /><button className="btn">Add milestone</button></form>}
    {data?.milestones.map(m => { const n = NEXT[m.status], mine = user.role === 'contractor' || canCreate
      return <div key={m.id} className="card space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><b>{m.project?.code} · {m.description}</b><span className="flex items-center gap-2 text-sm">{m.contractor?.companyName} · {money(m.amount)} · due {day(m.dueDate)} <Badge text={m.status} /></span></div>
        {m.evidence.length > 0 && <div className="flex flex-wrap gap-2">{m.evidence.map(e => <a key={e.id} href={`/api/milestones/${m.id}/evidence/${e.id}/file`} target="_blank" rel="noreferrer" className="text-xs underline">{e.kind}{e.hasLocation ? '' : ' (no location)'}</a>)}</div>}
        {m.status === 'awaiting_evidence' && mine && <><div className="grid gap-2 sm:grid-cols-4">{m.requiredEvidence.map(k => { const ok = !m.missingEvidence.includes(k)
          return <label key={k} className={`rounded-lg border p-2 text-sm ${ok ? 'border-green-500' : 'border-slate-300'}`}>{k} {ok ? '(done)' : '(needed)'}<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="mt-1 block text-xs" onChange={e => upload(m, k, e.target.files?.[0])} /></label> })}</div>
          <div className="flex flex-wrap items-center gap-2"><button className="btn-ghost" onClick={() => invoice(m)}>{m.invoice ? `Invoice ${m.invoice.number}` : 'Add invoice'}</button>
            {['contractor', 'admin'].includes(user.role) && <button className="btn" disabled={m.missingEvidence.length > 0 || !m.invoice} onClick={() => act(m, 'pending_verification')}>Submit for verification</button>}
            {(m.missingEvidence.length > 0 || !m.invoice) && <span className="text-xs text-slate-500">Blocked: {[...m.missingEvidence.map(k => `${k} photo with location`), ...(m.invoice ? [] : ['invoice'])].join(', ')}</span>}</div></>}
        <div className="flex flex-wrap gap-2">{n && n[2].includes(user.role) && <button className="btn" onClick={() => act(m, n[1])}>{n[0]}</button>}
          {m.status === 'approved_for_payment' && ['admin', 'finance'].includes(user.role) && <button className="btn" onClick={() => pay(m)}>Record payment</button>}
          {['pending_verification', 'pending_approval', 'approved_for_payment'].includes(m.status) && ['admin', 'project_manager', 'finance'].includes(user.role) && <button className="btn-ghost" onClick={() => dispute(m)}>Dispute</button>}</div>
        {m.payment && <p className="text-xs text-slate-500">Paid {day(m.payment.paidOn)} · ref {m.payment.reference}</p>}{m.approvalNotes && m.status === 'disputed' && <p className="text-xs text-bad">Dispute: {m.approvalNotes}</p>}</div> })}
    {data?.milestones.length === 0 && <Empty>No milestones yet.</Empty>}</div>
}
