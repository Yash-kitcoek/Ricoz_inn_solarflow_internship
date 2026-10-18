'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api'
const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [loading, setLoading] = useState(true)
  useEffect(() => { api('/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false)) }, [])
  const login = useCallback(async (email, password) => { const d = await api('/auth/login', { method: 'POST', body: { email, password } }); setUser(d.user) }, [])
  const logout = useCallback(async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setUser(null) }, [])
  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}
