import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listProjects, listPermitItems, listTasks } from '../lib/api'
import { listNm, listMilestones } from '../lib/api2'
import { listDocs, updateProject } from '../lib/api3'
import { useAuth } from '../auth/AuthContext'
import { can } from '../lib/permissions'
import HandoverPanel from '../components/HandoverPanel'
import { STATUSES, type Project } from '../types'
export default function ProjectDetail() {
  const { id } = useParams(), nav = useNavigate(), { role } = useAuth(); const [p, setP] = useState<Project | null>(null), [c, setC] = useState<Record<string, number>>({}), [err, setErr] = useState<string | null>(null)
  const load = async () => { const [a, pi, t, n, m, d] = await Promise.all([listProjects(), listPermitItems(), listTasks(), listNm(), listMilestones(), listDocs()])
    setP((a.data ?? []).find(x => x.id === id) ?? null); const f = <T extends { project_id: string }>(x: T[]) => x.filter(y => y.project_id === id).length
    setC({ Permits: f(pi.data ?? []), 'Net metering': f(n.apps), Tasks: f(t.data ?? []), Payments: f(m.data ?? []), Documents: f(d.data) }); setErr(a.error) }
  useEffect(() => { void load() }, [id])
  if (!p) return <p>{err ?? 'Project not found or not visible to your role.'} <Link className="underline" to="/projects">Back</Link></p>
  const ix = STATUSES.indexOf(p.status)
  return <div className="space-y-3"><Link className="text-sm underline" to="/projects">All projects</Link><h1 className="text-xl font-bold">{p.code} · {p.name}</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    <div className="card text-sm">{p.customer_name} · {p.project_type} · {p.capacity_kw} kW · Rs {p.contract_value.toLocaleString('en-IN')} · {p.progress}% complete</div>
    <div className="card"><h2 className="font-semibold mb-2">Workflow</h2><div className="flex flex-wrap gap-1">{STATUSES.slice(0, 9).map((s, i) => <span key={s} className={`text-xs px-2 py-1 rounded-full ${p.status === 'Completed' || i < ix ? 'bg-green-100' : i === ix ? 'bg-amber' : 'bg-slate-100'}`}>{s}</span>)}{p.status === 'On Hold' && <span className="text-xs px-2 py-1 rounded-full bg-red-100">On Hold (blocked)</span>}</div>
      <select className="input mt-3 max-w-xs" disabled={!can(role, 'project.edit')} value={p.status} onChange={async e => { setErr(await updateProject(p.id, { status: e.target.value as Project['status'] })); void load() }}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{Object.entries(c).map(([k, v]) => <div key={k} className="card"><div className="text-xl font-bold">{v}</div><div className="text-xs text-slate-500">{k}</div></div>)}</div>
    <HandoverPanel p={p}/>
    {can(role, 'project.edit') && <button className="btn" onClick={async () => { if (!confirm('Archive this project? It will be hidden from lists.')) return; const m = await updateProject(p.id, { archived: true }); if (m) setErr(m); else nav('/projects') }}>Archive project</button>}</div>
}
