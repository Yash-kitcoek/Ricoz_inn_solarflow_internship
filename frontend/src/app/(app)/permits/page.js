'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { day } from '@/lib/format'
import { ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
const STATUSES = ['Not Started', 'In Progress', 'Submitted', 'Approved', 'Rejected', 'Blocked']
export default function Permits() {
  const { data, error, loading, reload } = useLoad(async () => { const [a, b] = await Promise.all([api('/permits'), api('/projects')]); return { items: a.items, projects: b.projects } }), [err, setErr] = useState(null)
  usePolling(reload)
  async function add(e) { e.preventDefault(); const form = e.currentTarget, f = Object.fromEntries(new FormData(form)); if (!f.dueDate) delete f.dueDate; setErr(null)
    try { await api('/permits', { method: 'POST', body: f }); form.reset(); reload() } catch (x) { setErr(x.message) } }
  async function change(i, status) { let reason; if (status === 'Rejected' || status === 'Blocked') { reason = (prompt('Reason (required):') || '').trim(); if (!reason) return setErr(`A reason is required for ${status}.`) }
    try { setErr(null); await api(`/permits/${i._id}`, { method: 'PATCH', body: { status, reason } }); reload() } catch (x) { setErr(x.message) } }
  if (loading) return <Loading />
  const items = data?.items ?? [], done = items.filter(i => i.status === 'Approved').length
  return <div><PageHeader title="Permits & Approvals" /><p className="mb-3 text-sm text-slate-500">Completion: <b>{items.length ? Math.round(done / items.length * 100) : 0}%</b> ({done} of {items.length} approved). This tracks status only; nothing is submitted to any authority.</p>
    <ErrorText>{err || error}</ErrorText>
    <form onSubmit={add} className="card mb-4 grid gap-2 sm:grid-cols-4"><select name="project" className="input" required>{data?.projects.map(p => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}</select><input name="title" className="input" placeholder="Checklist item" required /><input name="dueDate" type="date" className="input" /><button className="btn">Add item</button></form>
    <div className="card overflow-x-auto p-0"><table><thead><tr><th>Project</th><th>Item</th><th>Due</th><th>Status</th><th>Reason</th></tr></thead><tbody>
      {items.map(i => <tr key={i._id}><td>{i.project?.code}</td><td>{i.title}</td><td className={i.overdue ? 'font-semibold text-bad' : ''}>{day(i.dueDate)}{i.overdue && ' (overdue)'}</td>
        <td><select className="input" value={i.status} onChange={e => change(i, e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></td><td>{i.reason}</td></tr>)}</tbody></table>{items.length === 0 && <Empty>No checklist items yet.</Empty>}</div></div>
}
