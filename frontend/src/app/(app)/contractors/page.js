'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { ErrorText, PageHeader, Empty, Loading } from '@/components/ui'
export default function Contractors() {
  const { user } = useAuth(), { data, error, loading, reload } = useLoad(() => api('/contractors')), [err, setErr] = useState(null), canAdd = ['admin', 'project_manager'].includes(user.role)
  async function add(e) { e.preventDefault(); const form = e.currentTarget; setErr(null); try { await api('/contractors', { method: 'POST', body: Object.fromEntries(new FormData(form)) }); form.reset(); reload() } catch (x) { setErr(x.message) } }
  if (loading) return <Loading />
  return <div className="space-y-3"><PageHeader title="Contractors" /><ErrorText>{err || error}</ErrorText>
    {canAdd && <form onSubmit={add} className="card grid gap-2 sm:grid-cols-5"><input name="companyName" className="input" placeholder="Company" required /><input name="contactPerson" className="input" placeholder="Contact person" /><input name="phone" className="input" placeholder="Phone" /><input name="specialization" className="input" placeholder="Specialization" /><button className="btn">Add</button></form>}
    <div className="card overflow-x-auto p-0"><table><thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Specialization</th><th>Active</th></tr></thead><tbody>{data?.contractors.map(c => <tr key={c._id}><td>{c.companyName}</td><td>{c.contactPerson}</td><td>{c.phone}</td><td>{c.specialization}</td><td>{c.active ? 'Yes' : 'No'}</td></tr>)}</tbody></table>{data?.contractors.length === 0 && <Empty>No contractors yet.</Empty>}</div>
    <p className="text-xs text-slate-500">To give a contractor user access, link their account to a company under Users &amp; Roles.</p></div>
}
