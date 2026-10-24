'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { money } from '@/lib/format'
import { Badge, Progress, ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
const STATUSES = ['Draft', 'Planning', 'Permitting', 'Design', 'Ready for Installation', 'Installation in Progress', 'Inspection', 'Commissioning', 'Completed', 'On Hold']
export default function Projects() {
  const { user } = useAuth(), [q, setQ] = useState(''), [status, setStatus] = useState(''), [open, setOpen] = useState(false), [err, setErr] = useState(null), canCreate = ['admin', 'project_manager'].includes(user.role)
  const { data, error, loading, reload } = useLoad(() => api('/projects?' + new URLSearchParams({ ...(q && { q }), ...(status && { status }) })), [q, status])
  async function create(e) { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget)); setErr(null)
    try { await api('/projects', { method: 'POST', body: f }); setOpen(false); reload() } catch (x) { setErr(x.message) } }
  return <div><PageHeader title="Projects"><input className="input !w-48" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
    <select className="input !w-44" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
    {canCreate && <button className="btn" onClick={() => setOpen(o => !o)}>New project</button>}</PageHeader>
    <ErrorText>{err || error}</ErrorText>
    {open && <form onSubmit={create} className="card mb-4 grid gap-2 sm:grid-cols-5"><input name="name" className="input" placeholder="Project name" required /><input name="customerName" className="input" placeholder="Customer" required />
      <select name="type" className="input"><option>Residential</option><option>Commercial</option></select><input name="capacityKw" type="number" step="0.1" min="0.1" className="input" placeholder="kW" required /><input name="contractValue" type="number" min="0" className="input" placeholder="Contract value (Rs)" /><button className="btn sm:col-span-5">Save project</button></form>}
    <div className="card overflow-x-auto p-0">{loading ? <Loading /> : <table><thead><tr><th>ID</th><th>Project</th><th>Customer</th><th>kW</th><th>Status</th><th>Progress</th><th>Value</th></tr></thead><tbody>
      {data?.projects.map(p => <tr key={p._id}><td>{p.code}</td><td><Link className="font-medium underline" href={`/projects/${p._id}`}>{p.name}</Link></td><td>{p.customerName}</td><td>{p.capacityKw}</td><td><Badge text={p.status} /></td><td className="min-w-[120px]"><Progress value={p.progress} /></td><td>{money(p.contractValue)}</td></tr>)}</tbody></table>}
      {!loading && data?.projects.length === 0 && <Empty>No projects match.</Empty>}</div></div>
}
