'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const Ctx = createContext({ user: null, loading: true, error: null, refreshUser: async () => null })

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshUser = useCallback(async () => {
    try {
      const { user: currentUser } = await api('/auth/me')
      setUser(currentUser)
      setError(null)
      return currentUser
    } catch (err) {
      if (err.status !== 401) setError(err.message)
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setLoading(false))
  }, [refreshUser])

  const login = useCallback(async credentials => {
    setError(null)
    const result = await api('/auth/login', { method: 'POST', body: credentials })
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
    setError(null)
  }, [])

  return <Ctx.Provider value={{ user, loading, error, login, logout, refreshUser }}>{children}</Ctx.Provider>
}
