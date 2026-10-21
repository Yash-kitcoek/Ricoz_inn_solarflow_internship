'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from './api'

const DEFAULT_ADMIN = {
  id: 'admin',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  approved: true,
}

const Ctx = createContext({
  user: DEFAULT_ADMIN,
  loading: false,
  login: async () => {},
  logout: async () => {},
})

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_ADMIN)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api('/auth/me')
      .then(d => {
        if (d?.user) setUser(d.user)
      })
      .catch(() => {
        // Fallback remains DEFAULT_ADMIN
      })
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email, password } })
      if (d?.user) setUser(d.user)
    } catch {}
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' }).catch(() => {})
  }, [])

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>
}

