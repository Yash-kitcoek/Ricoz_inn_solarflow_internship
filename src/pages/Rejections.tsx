import { useEffect, useState, FormEvent } from 'react'
import { listProjects } from '../lib/api'
import { listRejections, addRejection, setResolved } from '../lib/api6'
import { REJ_CATS, type Rej } from '../lib/equipment'
import RejectionInsights from '../components/RejectionInsights'
import type { Project } from '../types'
export default function Rejections() {
  const [rows, setRows] = useState<Rej[]>([]), [ps, setPs] = useState<Project[]>([]), [err, setErr] = useState<string | null>(null), [k, setK] = useState(0)
  const load = async () => { const [a, b] = await Promise.all([listRejections(), listProjects()]); setRows(a.data); setPs(b.data ?? []); setErr(a.error ?? b.error); setK(n => n + 1) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget), authority = String(f.get('authority')).trim(), reason = String(f.get('reason')).trim()
    if (!authority || !reason) return setErr('Enter the authority and the reason given.')
    const m = await addRejection({ project_id: String(f.get('project')), authority, office: String(f.get('office')).trim() || null, category: String(f.get('cat')), reason }); setErr(m); if (!m) { e.currentTarget.reset(); void load() } }
  return <div className="space-y-4"><h1>Rejections</h1>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid gap-2 sm:grid-cols-3"><select name="project" className="input" required>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select><input name="authority" className="input" placeholder="Authority or utility" required/><input name="office" className="input" placeholder="Office or division (optional)"/>
      <select name="cat" className="input">{REJ_CATS.map(c => <option key={c}>{c}</option>)}</select><input name="reason" className="input sm:col-span-1" placeholder="Reason given" required/><button className="btn">Log rejection</button></form>
    <RejectionInsights key={k}/>
    <div className="card overflow-x-auto"><table><thead><tr><th>Project</th><th>Authority</th><th>Category</th><th>Reason</th><th>Resolved</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id}><td>{code(r.project_id)}</td><td>{r.authority}{r.office ? ` · ${r.office}` : ''}</td><td>{r.category}</td><td>{r.reason}</td><td><input type="checkbox" checked={r.resolved} aria-label="Resolved" onChange={async e => { setErr(await setResolved(r.id, e.target.checked)); void load() }}/></td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="p-3 text-slate-500">Nothing logged yet.</p>}</div></div>
}
