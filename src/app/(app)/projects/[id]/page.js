'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { money, day } from '@/lib/format'
import { Badge, Progress, ErrorText, Loading } from '@/components/ui'
const STATUSES = ['Draft', 'Planning', 'Permitting', 'Design', 'Ready for Installation', 'Installation in Progress', 'Inspection', 'Commissioning', 'Completed', 'On Hold']
export default function ProjectDetail() {
  const { id } = useParams(), router = useRouter(), { user } = useAuth(), [err, setErr] = useState(null), canEdit = ['admin', 'project_manager'].includes(user.role)
  const { data, error, loading, reload } = useLoad(() => api(`/projects/${id}`), [id])
  const patch = async body => { try { setErr(null); await api(`/projects/${id}`, { method: 'PATCH', body }); return true } catch (x) { setErr(x.message); return false } }
  if (loading) return <Loading />
  if (!data) return <div><ErrorText>{error}</ErrorText><Link className="underline" href="/projects">Back to projects</Link></div>
  const { project: p, counts, activity } = data, ix = STATUSES.indexOf(p.status)
  return <div className="space-y-4"><Link className="text-sm underline" href="/projects">All projects</Link><h1>{p.code} · {p.name}</h1><ErrorText>{err || error}</ErrorText>
    <div className="card text-sm">{p.customerName} · {p.type} · {p.capacityKw} kW · {money(p.contractValue)} · {day(p.startDate)} to {day(p.endDate)}<div className="mt-3"><Progress value={p.progress} /></div></div>
    <div className="card"><h2 className="mb-2">Workflow</h2><div className="flex flex-wrap gap-1">{STATUSES.slice(0, 9).map((s, i) => <span key={s} className={`badge ${p.status === 'Completed' || i < ix ? 'bg-green-100' : i === ix ? 'bg-amber' : 'bg-slate-100'}`}>{s}</span>)}{p.status === 'On Hold' && <Badge text="On Hold" />}</div>
      {canEdit && <select className="input mt-3 max-w-xs" value={p.status} onChange={async e => { if (await patch({ status: e.target.value })) reload() }}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>}</div>
    <div className="grid grid-cols-3 gap-3 text-center">{[['Permit items', counts.permits], ['Net-metering apps', counts.netMetering], ['Milestones', counts.milestones]].map(([l, v]) => <div key={l} className="card"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-slate-500">{l}</div></div>)}</div>
    <div className="card"><h2 className="mb-2">Recent activity</h2>{activity.length === 0 ? <p className="text-sm text-slate-500">Nothing yet.</p> : activity.map(a => <div key={a._id} className="border-t py-1.5 text-sm first:border-0"><b>{a.actorName}</b> {a.action} {a.detail && <span className="text-slate-500">· {a.detail}</span>} <span className="float-right text-xs text-slate-400">{new Date(a.at).toLocaleString('en-IN')}</span></div>)}</div>
    {canEdit && <button className="btn-ghost" onClick={async () => { if (confirm('Archive this project? It will be hidden from lists.') && await patch({ archived: true })) router.replace('/projects') }}>Archive project</button>}</div>
}
