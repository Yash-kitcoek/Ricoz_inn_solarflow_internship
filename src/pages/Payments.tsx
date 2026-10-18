import { useEffect, useState } from 'react'
import { listMilestones, uploadEvidence, addInvoice, setMilestoneStatus, recordPayment, type Milestone } from '../lib/api2'
import { demoMode } from '../lib/supabase'
import { aiEnabled, checkPhoto } from '../lib/ai'
import { enqueue } from '../lib/offline'
const NEXT: Record<string, [string, string]> = { not_due: ['Open for evidence', 'awaiting_evidence'], pending_verification: ['Verify work', 'pending_approval'], pending_approval: ['Approve', 'approved_for_payment'] }
const getPos = () => new Promise<{ lat: number; lng: number } | null>(r => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => r({ lat: p.coords.latitude, lng: p.coords.longitude }), () => r(null), { timeout: 8000 }) : r(null))
export default function Payments() {
  const [ms, setMs] = useState<Milestone[]>([]), [err, setErr] = useState<string | null>(null), [note, setNote] = useState<string | null>(null)
  const load = async () => { const r = await listMilestones(); setMs(r.data ?? []); setErr(r.error) }
  useEffect(() => { void load() }, [])
  const missing = (m: Milestone) => m.required_evidence.filter(k => !m.evidence.some(e => e.kind === k && e.geo))
  async function upload(m: Milestone, kind: string, f: File | undefined) { if (!f) return; const pos = await getPos()
    if (!navigator.onLine) { await enqueue({ kind: 'evidence', payload: { milestone: { id: m.id, project_id: m.project_id }, evKind: kind, file: f, name: f.name, pos, takenAt: new Date().toISOString() } }); setNote('You are offline. The photo is saved on this device and uploads automatically when you are back online.'); return }
    setNote(pos ? null : 'No location captured, so this photo does not count toward the requirement. Allow location access and upload again.'); const e = await uploadEvidence(m, kind, f, pos); setErr(e); if (!e && aiEnabled) { const r = await checkPhoto(kind, f); setNote(prev => (prev ? prev + ' ' : '') + (r.ok ? `AI check (assistive only): ${r.data.present ? 'looks like' : 'does NOT clearly show'} ${kind} (confidence ${Math.round(r.data.confidence * 100)}%). ${r.data.notes}` : 'AI check unavailable: ' + r.error)) } void load() }
  const run = async (p: Promise<string | null>) => { setErr(await p); void load() }
  return <div className="space-y-3"><h1 className="text-xl font-bold">Payments</h1>
    <p className="text-sm text-slate-500">Records approvals and payments made elsewhere; no money is moved. Photo locations come from the device and can be faked, so they support, not replace, the verifier's check.{demoMode && ' Demo mode: the verifier and approver rules are enforced only when connected to Supabase.'}</p>
    {err && <p className="text-sm text-red-600">{err}</p>}{note && <p className="text-sm text-amber-700">{note}</p>}
    {ms.map(m => { const miss = missing(m); const n = NEXT[m.status]
      return <div key={m.id} className="card space-y-2"><div className="flex justify-between"><b>{m.description}</b><span>Rs {m.milestone_amount.toLocaleString('en-IN')} · {m.status.replace(/_/g, ' ')}</span></div>
        {m.status === 'awaiting_evidence' && <><div className="grid sm:grid-cols-4 gap-2">{m.required_evidence.map(k => { const ok = m.evidence.some(e => e.kind === k && e.geo)
          return <label key={k} className={`text-sm border rounded-lg p-2 ${ok ? 'border-green-500' : 'border-slate-300'}`}>{k} {ok ? '(done)' : '(needed)'}<input type="file" accept="image/*" capture="environment" className="block text-xs mt-1" onChange={e => void upload(m, k, e.target.files?.[0])}/></label> })}</div>
          <div className="flex gap-2 items-center"><button className="btn" onClick={() => { const no = (prompt('Invoice number:') ?? '').trim(); if (no) void run(addInvoice(m, no, new Date().toISOString().slice(0, 10))) }}>{m.hasInvoice ? 'Invoice added' : 'Add invoice'}</button>
            <button className="btn" disabled={miss.length > 0 || !m.hasInvoice} onClick={() => void run(setMilestoneStatus(m, 'pending_verification'))}>Submit for verification</button>
            {(miss.length > 0 || !m.hasInvoice) && <span className="text-xs text-slate-500">Blocked: {[...miss.map(k => k + ' photo with location'), ...(m.hasInvoice ? [] : ['invoice'])].join(', ')}</span>}</div></>}
        <div className="flex gap-2">{n && <button className="btn" onClick={() => void run(setMilestoneStatus(m, n[1]))}>{n[0]}</button>}
          {m.status === 'approved_for_payment' && <button className="btn" onClick={() => { const r = (prompt('Transaction reference of the payment you made:') ?? '').trim(); if (r) void run(recordPayment(m, r)) }}>Record payment</button>}
          {['pending_verification', 'pending_approval', 'approved_for_payment'].includes(m.status) && <button className="btn" style={{ background: 'transparent', border: '1px solid #cbd5e1' }} onClick={() => { const w = (prompt('Dispute reason (required):') ?? '').trim(); if (w) void run(setMilestoneStatus(m, 'disputed', w)) }}>Dispute</button>}</div></div> })}
    {ms.length === 0 && <p className="text-slate-500">No milestones yet.</p>}</div>
}
