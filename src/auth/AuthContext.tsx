import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, demoMode } from '../lib/supabase'
import type { Role } from '../types'
type Err = Promise<string | null>
interface Ctx { ready: boolean; userId: string | null; name: string; role: Role | null; approved: boolean; recovery: boolean; profileError: string | null
  setDemoRole: (r: Role) => void; signIn: (e: string, p: string) => Err; signInGoogle: () => Err; signUp: (n: string, e: string, p: string) => Err; reset: (e: string) => Err; updatePassword: (p: string) => Err; signOut: () => Promise<void> }
const C = createContext<Ctx>(null as unknown as Ctx)
export const useAuth = () => useContext(C)
const base = demoMode ? { ready: true, userId: 'demo', name: 'Demo User', role: 'admin' as Role | null, approved: true, recovery: false, profileError: null as string | null } : { ready: false, userId: null as string | null, name: '', role: null as Role | null, approved: false, recovery: false, profileError: null as string | null }
export function AuthProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(base)
  useEffect(() => {
    if (demoMode) return
    const load = async (uid: string | null) => {
      if (!uid) return setS({ ...base, ready: true })
      const { data, error } = await supabase!.from('profiles').select('full_name,role,approved').eq('id', uid).single()
      setS(p => ({ ...p, ready: true, userId: uid, name: data?.full_name ?? '', role: data?.approved ? (data.role as Role) : null, approved: !!data?.approved, profileError: error?.message ?? null }))
    }
    void supabase!.auth.getSession().then(({ data }) => load(data.session?.user.id ?? null))
    const { data: sub } = supabase!.auth.onAuthStateChange((ev, session) => { if (ev === 'PASSWORD_RECOVERY') setS(p => ({ ...p, recovery: true })); void load(session?.user.id ?? null) })
    return () => sub.subscription.unsubscribe()
  }, [])
  const val: Ctx = { ...s, setDemoRole: r => setS(p => ({ ...p, role: r })),
    signInGoogle: async () => (await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })).error?.message ?? null,
    signIn: async (email, password) => (await supabase!.auth.signInWithPassword({ email, password })).error?.message ?? null,
    signUp: async (name, email, password) => (await supabase!.auth.signUp({ email, password, options: { data: { full_name: name } } })).error?.message ?? null,
    reset: async email => (await supabase!.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })).error?.message ?? null,
    updatePassword: async password => { const r = await supabase!.auth.updateUser({ password }); if (!r.error) setS(p => ({ ...p, recovery: false })); return r.error?.message ?? null },
    signOut: async () => { await supabase?.auth.signOut() } }
  return <C.Provider value={val}>{children}</C.Provider>
}
