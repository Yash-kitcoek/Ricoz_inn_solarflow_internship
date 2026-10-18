import { useEffect, useState, FormEvent } from 'react'
import { listProjects, listPermitItems, addPermitItem, setPermitStatus, PERMIT_STATUSES, type PermitItem } from '../lib/api'
import type { Project } from '../types'
const today = () => new Date().toISOString().slice(0, 10)
export default function Permits() {
  const [items, setItems] = useState<PermitItem[]>([]), [ps, setPs] = useState<Project[]>([]), [err, setErr] = useState<string|null>(null)
  const load = async () => { const [a, b] = await Promise.all([listPermitItems(), listProjects()]); setItems(a.data ?? []); setPs(b.data ?? []); setErr(a.error ?? b.error) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  const done = items.filter(i => i.status === 'Approved').length
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget)
    const title = String(f.get('title')).trim(); if (!title) return setErr('Enter an item title.')
    const m = await addPermitItem(String(f.get('project')), title, String(f.get('due')) || null); if (m) return setErr(m); setErr(null); e.currentTarget.reset(); void load() }
  async function change(i: PermitItem, status: string) {
    let reason: string | undefined
    if (status === 'Rejected' || status === 'Blocked') { reason = (prompt('Reason (required):') ?? '').trim(); if (!reason) return setErr('A reason is required for ' + status + '.') }
    const m = await setPermitStatus(i.id, status, reason); setErr(m); void load() }
  return <div className="space-y-3"><h1 className="text-xl font-bold">Permits &amp; Approvals</h1>
    <p className="text-sm text-slate-500">Completion: <b>{items.length ? Math.round(done / items.length * 100) : 0}%</b> ({done} of {items.length} approved). This tracks status only; nothing is submitted to any authority.</p>
    {err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid sm:grid-cols-4 gap-2"><select name="project" className="input" required>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      <input name="title" className="input" placeholder="Checklist item" required/><input name="due" type="date" className="input"/><button className="btn">Add item</button></form>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Project</th><th>Item</th><th>Due</th><th>Status</th><th>Reason</th></tr></thead><tbody>
      {items.map(i => { const late = i.due_date && i.due_date < today() && i.status !== 'Approved'
        return <tr key={i.id} className="border-t"><td>{code(i.project_id)}</td><td>{i.title}</td><td className={late ? 'text-red-600 font-semibold' : ''}>{i.due_date ?? '-'}{late && ' (overdue)'}</td>
          <td><select className="input" value={i.status} onChange={e => void change(i, e.target.value)}>{PERMIT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></td><td>{i.rejection_reason}</td></tr> })}</tbody></table>
      {items.length === 0 && <p className="p-4 text-slate-500">No checklist items yet.</p>}</div></div>
}
