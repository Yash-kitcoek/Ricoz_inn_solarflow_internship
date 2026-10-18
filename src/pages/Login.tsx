import { useState, FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { SunLogo } from '../components/ui'
type Mode = 'in' | 'up' | 'forgot'
export default function Login() {
  const { signIn, signUp, reset, signInGoogle } = useAuth(); const [mode, setMode] = useState<Mode>('in'), [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null), [info, setInfo] = useState<string | null>(null), [busy, setBusy] = useState(false)
  const go = (m: Mode) => { setMode(m); setErr(null); setInfo(null) }
  async function submit(e: FormEvent) { e.preventDefault(); setErr(null); setInfo(null)
    if (mode !== 'forgot' && password.length < 8) return setErr('Use a password of at least 8 characters.')
    if (mode === 'up' && !name.trim()) return setErr('Enter your name.')
    setBusy(true); const m = mode === 'in' ? await signIn(email, password) : mode === 'up' ? await signUp(name.trim(), email, password) : await reset(email); setBusy(false)
    if (m) return setErr(m)
    if (mode === 'up') setInfo('Account created. Confirm your email if asked, then sign in. An admin must approve your account before you can see any data.')
    if (mode === 'forgot') setInfo('If that email has an account, a reset link is on its way.') }
  return <div className="grid min-h-screen md:grid-cols-2">
    <div className="relative hidden flex-col justify-end overflow-hidden bg-gradient-to-br from-[#0B2A55] to-[#1D5FB0] p-10 text-white md:flex"><div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber/90"/><div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-amber"/>
      <h2 className="text-3xl font-bold leading-tight">From permit to grid connection,<br/>every project in one place.</h2><p className="mt-2 text-blue-100">Permits, net-metering, drawings, tasks and contractor milestones.</p></div>
    <div className="flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-3"><div className="flex items-center gap-2"><SunLogo size={34}/><span className="text-2xl font-bold">SolarFlow <span className="text-amber">OS</span></span></div>
      <p className="text-sm text-slate-500">{mode === 'in' ? 'Sign in to continue' : mode === 'up' ? 'Create your account' : 'Reset your password'}</p>
      {mode === 'up' && <label className="block text-sm">Full name<input className="input mt-1" autoComplete="name" value={name} onChange={e => setName(e.target.value)} required/></label>}
      <label className="block text-sm">Email<input className="input mt-1" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required/></label>
      {mode !== 'forgot' && <label className="block text-sm">Password<input className="input mt-1" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} required/></label>}
      {err && <p role="alert" className="text-sm text-red-600">{err}</p>}{info && <p role="status" className="text-sm text-green-700">{info}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link'}</button>
      {mode !== 'forgot' && <><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200"/>or<span className="h-px flex-1 bg-slate-200"/></div>
        <button type="button" className="btn-ghost w-full" onClick={async () => setErr(await signInGoogle())}><span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold text-solar">G</span>Continue with Google</button></>}
      <div className="flex justify-between text-sm">{mode === 'in' ? <><button type="button" className="underline" onClick={() => go('up')}>Create account</button><button type="button" className="underline" onClick={() => go('forgot')}>Forgot password?</button></> : <button type="button" className="underline" onClick={() => go('in')}>Back to sign in</button>}</div></form></div></div>
}
