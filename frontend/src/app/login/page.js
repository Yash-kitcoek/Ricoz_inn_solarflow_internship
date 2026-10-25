'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ErrorText } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter(), { user, loading, error: authError, login } = useAuth()
  const [error, setError] = useState(null), [busy, setBusy] = useState(false)

  useEffect(() => { if (user) router.replace(user.role === 'customer' ? '/customer' : '/') }, [user, router])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = Object.fromEntries(new FormData(event.currentTarget))
    try {
      const signedInUser = await login(form)
      router.replace(signedInUser.role === 'customer' ? '/customer' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center">Checking your session…</main>

  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
    <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
      <div><h1>SolarFlow OS</h1><p className="mt-1 text-sm text-slate-500">Sign in with your approved account.</p></div>
      <ErrorText>{error || authError}</ErrorText>
      <label className="block text-sm font-medium">Email<input className="input mt-1 w-full" name="email" type="email" autoComplete="username" required /></label>
      <label className="block text-sm font-medium">Password<input className="input mt-1 w-full" name="password" type="password" autoComplete="current-password" required /></label>
      <button className="btn w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </main>
}
