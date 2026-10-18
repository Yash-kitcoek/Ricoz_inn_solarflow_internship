import { useState, FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { SunLogo } from '../components/ui'
export function Pending() {
  const { signOut, profileError } = useAuth()
  return <div className="card mx-auto mt-24 max-w-md space-y-3 text-center"><SunLogo size={40}/><h1>Waiting for approval</h1>
    <p className="text-sm text-slate-500">{profileError ? `Your profile could not be loaded: ${profileError}` : 'Your account is created, but an admin must approve it and assign your role before you can use SolarFlow OS.'}</p><button className="btn-ghost" onClick={signOut}>Sign out</button></div>
}
export function ResetPassword() {
  const { updatePassword } = useAuth(); const [p, setP] = useState(''), [err, setErr] = useState<string | null>(null)
  async function submit(e: FormEvent) { e.preventDefault(); if (p.length < 8) return setErr('Use at least 8 characters.'); setErr(await updatePassword(p)) }
  return <form onSubmit={submit} className="card mx-auto mt-24 max-w-sm space-y-3"><h1>Set a new password</h1><input className="input" type="password" autoComplete="new-password" placeholder="New password" value={p} onChange={e => setP(e.target.value)} required/>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}<button className="btn w-full">Save password</button></form>
}
