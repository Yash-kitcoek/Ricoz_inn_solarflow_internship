'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { ErrorText, PageHeader, Loading } from '@/components/ui'
const ROLES = ['admin', 'project_manager', 'engineer', 'contractor', 'finance']
export default function Settings() {
  const { data, error, loading, reload } = useLoad(async () => { const [u, c] = await Promise.all([api('/users'), api('/contractors')]); return { users: u.users, contractors: c.contractors } }), [err, setErr] = useState(null)
  const save = async (u, patch) => { try { setErr(null); await api(`/users/${u.id}`, { method: 'PATCH', body: patch }); reload() } catch (x) { setErr(x.message) } }
  if (loading) return <Loading />
  return <div className="space-y-3"><PageHeader title="Users & Roles" /><ErrorText>{err || error}</ErrorText>
    <div className="card overflow-x-auto p-0"><table><thead><tr><th>User</th><th>Approved</th><th>Role</th><th>Contractor company</th></tr></thead><tbody>{data?.users.map(u => <tr key={u.id}><td>{u.name}<div className="text-xs text-slate-500">{u.email}</div></td>
      <td><input type="checkbox" aria-label="Approved" checked={u.approved} onChange={e => save(u, { approved: e.target.checked })} /></td><td><select className="input" value={u.role} onChange={e => save(u, { role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
      <td><select className="input" disabled={u.role !== 'contractor'} value={u.contractor || ''} onChange={e => save(u, { contractor: e.target.value || null })}><option value="">None</option>{data.contractors.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}</select></td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">New sign-ups see nothing until approved here. The server refuses to remove the last approved admin.</p></div>
}
