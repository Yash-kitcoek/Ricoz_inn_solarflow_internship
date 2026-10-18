'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { SunLogo, ErrorText } from '@/components/ui'
export default function Login() {
  const { login } = useAuth(), router = useRouter(), [mode, setMode] = useState('in'), [f, setF] = useState({ name: '', email: '', password: '' }), [err, setErr] = useState(null), [info, setInfo] = useState(null), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function submit(e) { e.preventDefault(); setErr(null); setInfo(null); setBusy(true)
    try { if (mode === 'in') { await login(f.email, f.password); router.replace('/') } else { const d = await api('/auth/register', { method: 'POST', body: f }); setInfo(d.message); setMode('in') } } catch (x) { setErr(x.message) } finally { setBusy(false) } }
  return <div className="grid min-h-screen md:grid-cols-2">
    <div className="relative hidden flex-col justify-end overflow-hidden bg-gradient-to-br from-[#0B2A55] to-[#1D5FB0] p-10 text-white md:flex"><div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber/90" /><div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-amber" />
      <h2 className="text-3xl font-bold leading-tight">From permit to grid connection,<br />every project in one place.</h2><p className="mt-2 text-blue-100">Permits, net-metering applications and contractor milestones.</p></div>
    <div className="flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-3"><div className="flex items-center gap-2"><SunLogo size={34} /><span className="text-2xl font-bold">SolarFlow <span className="text-amber">OS</span></span></div>
      <p className="text-sm text-slate-500">{mode === 'in' ? 'Sign in to continue' : 'Create your account'}</p>
      {mode === 'up' && <label className="block text-sm">Full name<input className="input mt-1" autoComplete="name" value={f.name} onChange={set('name')} required minLength={2} /></label>}
      <label className="block text-sm">Email<input className="input mt-1" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></label>
      <label className="block text-sm">Password<input className="input mt-1" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} required minLength={mode === 'up' ? 8 : 1} /></label>
      <ErrorText>{err}</ErrorText>{info && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{info}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}</button>
      <button type="button" className="text-sm underline" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(null) }}>{mode === 'in' ? 'Create an account' : 'Back to sign in'}</button></form></div></div>
}
