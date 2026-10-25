'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { ErrorText, PageHeader, Loading } from '@/components/ui'
const ROLES = ['admin', 'project_manager', 'engineer', 'contractor', 'finance']
export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { data, error, loading, reload } = useLoad(async () => { const [u, c] = await Promise.all([api('/users'), api('/contractors')]); return { users: u.users, contractors: c.contractors } }, [])
  const [err, setErr] = useState(null)
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' })
  const [profilePassword, setProfilePassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' })
  const [adminSaving, setAdminSaving] = useState(false)

  const saveUser = async (u, patch) => { try { setErr(null); await api(`/users/${u.id}`, { method: 'PATCH', body: patch }); reload() } catch (x) { setErr(x.message) } }

  const saveProfile = async (event) => {
    event.preventDefault()
    try {
      setErr(null)
      setProfileSaving(true)
      const payload = { name: profile.name, email: profile.email }
      if (profilePassword.trim()) payload.password = profilePassword
      const result = await api('/users/me', { method: 'PATCH', body: payload })
      await refreshUser()
      setProfile({ name: result.user.name, email: result.user.email })
      setProfilePassword('')
    } catch (x) {
      setErr(x.message)
    } finally {
      setProfileSaving(false)
    }
  }

  const createAdmin = async (event) => {
    event.preventDefault()
    try {
      setErr(null)
      setAdminSaving(true)
      await api('/users/admins', { method: 'POST', body: adminForm })
      setAdminForm({ name: '', email: '', password: '' })
      reload()
    } catch (x) {
      setErr(x.message)
    } finally {
      setAdminSaving(false)
    }
  }

  if (loading || !user) return <Loading />

  return <div className="space-y-4"><PageHeader title="Users & Roles" /><ErrorText>{err || error}</ErrorText>
    <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
      <div className="card space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">My profile</p>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-lg font-semibold text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-600">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">{user.role.replace('_', ' ')}</p>
          </div>
        </div>

        <form className="space-y-3" onSubmit={saveProfile}>
          <label className="block text-sm font-medium">Full name<input className="input mt-1 w-full" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required /></label>
          <label className="block text-sm font-medium">Email<input className="input mt-1 w-full" type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required /></label>
          <label className="block text-sm font-medium">New password (optional)<input className="input mt-1 w-full" type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Leave blank to keep current password" /></label>
          <button className="btn w-full" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Update profile'}</button>
        </form>
      </div>

      <div className="card space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Create admin</p>
          <p className="mt-1 text-sm text-slate-600">Create another administrator account with their own email and password.</p>
        </div>
        <form className="space-y-3" onSubmit={createAdmin}>
          <label className="block text-sm font-medium">Full name<input className="input mt-1 w-full" value={adminForm.name} onChange={e => setAdminForm({ ...adminForm, name: e.target.value })} required /></label>
          <label className="block text-sm font-medium">Email<input className="input mt-1 w-full" type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} required /></label>
          <label className="block text-sm font-medium">Password<input className="input mt-1 w-full" type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} minLength={8} required /></label>
          <button className="btn w-full" disabled={adminSaving}>{adminSaving ? 'Creating…' : 'Create admin account'}</button>
        </form>
      </div>
    </div>

    <div className="card overflow-x-auto p-0"><table><thead><tr><th>User</th><th>Approved</th><th>Role</th><th>Contractor company</th></tr></thead><tbody>{data?.users.map(u => <tr key={u.id}><td>{u.name}<div className="text-xs text-slate-500">{u.email}</div></td>
      <td><input type="checkbox" aria-label="Approved" checked={u.approved} onChange={e => saveUser(u, { approved: e.target.checked })} /></td><td><select className="input" value={u.role} onChange={e => saveUser(u, { role: e.target.value })}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></td>
      <td><select className="input" disabled={u.role !== 'contractor'} value={u.contractor || ''} onChange={e => saveUser(u, { contractor: e.target.value || null })}><option value="">None</option>{data.contractors.map(c => <option key={c._id} value={c._id}>{c.companyName}</option>)}</select></td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">New sign-ups see nothing until approved here. The server refuses to remove the last approved admin.</p></div>
}
