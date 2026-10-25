'use client'
import { useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { useAuth } from '@/lib/auth'
import { money } from '@/lib/format'
import { Badge, Progress, ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
const STATUSES = ['Draft', 'Planning', 'Permitting', 'Design', 'Ready for Installation', 'Installation in Progress', 'Inspection', 'Commissioning', 'Completed', 'On Hold']
export default function Projects() {
  const { user } = useAuth(), [q, setQ] = useState(''), [status, setStatus] = useState(''), [open, setOpen] = useState(false), [err, setErr] = useState(null), canCreate = ['admin', 'project_manager'].includes(user.role)
  const { data, error, loading, reload } = useLoad(() => api('/projects?' + new URLSearchParams({ ...(q && { q }), ...(status && { status }) })), [q, status])
  usePolling(reload)
  const { data: assignments } = useLoad(() => canCreate ? api('/projects/assignments') : Promise.resolve({ customers: [], team: [] }), [canCreate])
  async function create(e) { e.preventDefault(); const form = Object.fromEntries(new FormData(e.currentTarget)); setErr(null)
    const payload = { ...form, requiredDocuments: form.requiredDocuments.split('\n').map(value => value.trim()).filter(Boolean), customerActions: form.customerActions.split('\n').map(value => value.trim()).filter(Boolean) }
    for (const key of ['customerAccount', 'projectManager', 'engineer']) if (!payload[key]) delete payload[key]
    try { await api('/projects', { method: 'POST', body: payload }); setOpen(false); reload() } catch (x) { setErr(x.message) } }
  return <div><PageHeader title="Projects"><input className="input !w-48" placeholder="Search" value={q} onChange={e => setQ(e.target.value)} />
    <select className="input !w-44" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
    {canCreate && <button className="btn" onClick={() => setOpen(o => !o)}>New project</button>}</PageHeader>
    <ErrorText>{err || error}</ErrorText>
    {open && <form onSubmit={create} className="card mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      <input name="name" className="input" placeholder="Project name" required /><input name="customerName" className="input" placeholder="Customer display name" required />
      {user.role === 'admin' && <select name="customerAccount" className="input"><option value="">Link customer account (optional)</option>{assignments?.customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name} · {customer.email}</option>)}</select>}
      <select name="projectManager" className="input"><option value="">No project manager</option>{assignments?.team.filter(member => ['admin', 'project_manager'].includes(member.role)).map(member => <option key={member.id} value={member.id}>{member.name} · {member.role.replace('_', ' ')}</option>)}</select>
      <select name="engineer" className="input"><option value="">No engineer</option>{assignments?.team.filter(member => member.role === 'engineer').map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
      <select name="type" className="input"><option>Residential</option><option>Commercial</option></select><input name="capacityKw" type="number" step="0.1" min="0.1" className="input" placeholder="kW" required /><input name="contractValue" type="number" min="0" className="input" placeholder="Contract value (Rs)" />
      <textarea name="requiredDocuments" className="input" rows={3} placeholder="Required customer documents (one per line)" /><textarea name="customerActions" className="input" rows={3} placeholder="Pending customer actions (one per line)" />
      <button className="btn lg:col-span-3">Save project</button></form>}
    <div className="card overflow-x-auto p-0">{loading ? <Loading /> : <table><thead><tr><th>ID</th><th>Project</th><th>Customer</th><th>kW</th><th>Status</th><th>Progress</th><th>Value</th></tr></thead><tbody>
      {data?.projects.map(p => <tr key={p._id}><td>{p.code}</td><td><Link className="font-medium underline" href={`/projects/${p._id}`}>{p.name}</Link></td><td>{p.customerName}</td><td>{p.capacityKw}</td><td><Badge text={p.status} /></td><td className="min-w-[120px]"><Progress value={p.progress} /></td><td>{money(p.contractValue)}</td></tr>)}</tbody></table>}
      {!loading && data?.projects.length === 0 && <Empty>No projects match.</Empty>}</div></div>
}
