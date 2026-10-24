'use client'
import { createContext, useContext } from 'react'

const ADMIN = {
  id: 'admin',
  name: 'Admin',
  email: 'admin@example.com',
  role: 'admin',
  approved: true,
}

const Ctx = createContext({ user: ADMIN, loading: false })

export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  return <Ctx.Provider value={{ user: ADMIN, loading: false }}>{children}</Ctx.Provider>
}
