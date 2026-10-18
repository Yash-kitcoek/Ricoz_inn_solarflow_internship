import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { can } from '../lib/permissions'
import { listPeople, setProfile, listContractors, ROLES, type Person, type Contractor } from '../lib/api3'
export default function Settings() {
  const { name, role } = useAuth(); const [ps, setPs] = useState<Person[]>([]), [cs, setCs] = useState<Contractor[]>([]), [err, setErr] = useState<string | null>(null), admin = can(role, 'users.manage')
  const load = async () => { const [a, b] = await Promise.all([listPeople(), listContractors()]); setPs(a.data); setCs(b.data); setErr(a.error ?? b.error) }
  useEffect(() => { void load() }, [])
  const save = async (id: string, patch: Partial<Person>) => { setErr(await setProfile(id, patch)); void load() }
  return <div className="space-y-3"><h1>Settings</h1><p className="text-sm">Signed in as <b>{name}</b> ({role}).</p>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <div className="card overflow-x-auto"><h2 className="mb-2">Users, roles and approval</h2><table><thead><tr><th>User</th><th>Approved</th><th>Role</th><th>Contractor company</th><th>WhatsApp number</th></tr></thead><tbody>
      {ps.map(p => <tr key={p.id}><td>{p.full_name ?? p.email}<div className="text-xs text-slate-500">{p.email}</div></td>
        <td>{admin ? <input type="checkbox" checked={p.approved} onChange={e => void save(p.id, { approved: e.target.checked })} aria-label="Approved"/> : p.approved ? 'Yes' : 'No'}</td>
        <td><select className="input" value={p.role} disabled={!admin} onChange={e => void save(p.id, { role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
        <td><select className="input" value={p.contractor_id ?? ''} disabled={!admin || p.role !== 'contractor'} onChange={e => void save(p.id, { contractor_id: e.target.value || null })}><option value="">None</option>{cs.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></td><td><input className="input" defaultValue={p.phone ?? ''} placeholder="919876543210" disabled={!admin} onBlur={e => { const v = e.target.value.replace(/\D/g, ''); if (v !== (p.phone ?? '')) void save(p.id, { phone: v || null }) }}/></td></tr>)}</tbody></table>
      <p className="mt-2 text-xs text-slate-500">Only admins can change these. The database rejects everyone else, and refuses to remove the last admin. New sign-ups see nothing until approved.</p></div></div>
}
