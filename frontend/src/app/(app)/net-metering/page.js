'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
const STATUSES = ['Not Started', 'Documents Required', 'Ready to Submit', 'Submitted', 'Under Review', 'Inspection Scheduled', 'Approved', 'Rejected', 'Connected to Grid']
export default function NetMetering() {
  const { data, error, loading, reload } = useLoad(async () => { const [a, b] = await Promise.all([api('/net-metering'), api('/projects')]); return { ...a, projects: b.projects } }), [err, setErr] = useState(null)
  usePolling(reload)
  async function add(e) { e.preventDefault(); const form = e.currentTarget; setErr(null); try { await api('/net-metering', { method: 'POST', body: Object.fromEntries(new FormData(form)) }); form.reset(); reload() } catch (x) { setErr(x.message) } }
  async function setStatus(a, status) { try { setErr(null); await api(`/net-metering/${a._id}/status`, { method: 'PATCH', body: { status } }); reload() } catch (x) { setErr(x.message) } }
  if (loading) return <Loading />
  return <div className="space-y-4"><PageHeader title="Net Metering" /><p className="text-sm text-slate-500">Statuses are entered by users and do not reflect any live utility response. Time limits are editable defaults (backend/src/services/stuck.js), not legal deadlines.</p><ErrorText>{err || error}</ErrorText>
    <form onSubmit={add} className="card grid gap-2 sm:grid-cols-3"><select name="project" className="input" required>{data?.projects.map(p => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}</select><input name="utility" className="input" placeholder="Utility / authority" required /><button className="btn">New application</button></form>
    <div className="card overflow-x-auto p-0"><h2 className="p-4 pb-0">Why is it stuck?</h2><table><thead><tr><th>Project</th><th>Utility</th><th>Status</th><th>Waiting on</th><th>Days</th><th>Next action</th></tr></thead><tbody>
      {data?.applications.map(a => <tr key={a._id} className="align-top"><td>{a.project?.code}</td><td>{a.utility}</td><td><select className="input" value={a.status} onChange={e => setStatus(a, e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
        <td>{a.diagnosis.owner}</td><td className={a.diagnosis.late ? 'font-semibold text-bad' : ''}>{a.diagnosis.days}{a.diagnosis.late && ' (over limit)'}</td><td>{a.diagnosis.late && <b>Escalate: </b>}{a.diagnosis.action}</td></tr>)}</tbody></table>{data?.applications.length === 0 && <Empty>No applications yet.</Empty>}</div>
    <div className="card"><h2 className="mb-2">Authority scorecard (average days in authority-owned stages)</h2>{data?.scorecard.length ? data.scorecard.map(s => <div key={s.utility} className="flex justify-between border-t py-2 text-sm first:border-0"><span>{s.utility} ({s.applications})</span><b>{s.avgDays} days</b></div>) : <p className="text-sm text-slate-500">Needs applications that have passed through Submitted, Under Review or Inspection Scheduled.</p>}
      <p className="mt-2 text-xs text-slate-500">Based only on applications visible to you. Use it to set expectations, not as an official rating.</p></div></div>
}
