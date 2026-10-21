'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { NAV, canSee } from '@/lib/nav'
import { SunLogo } from './ui'

export default function Shell({ children }) {
  const { user } = useAuth(), path = usePathname(), [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [path])

  const activeUser = user || { name: 'Admin', role: 'admin' }

  return <div className="flex h-screen overflow-hidden">
    {open && <div className="fixed inset-0 z-30 bg-navy/50 md:hidden" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-[#0E2A4D] to-navy text-slate-300 transition-transform md:static md:w-60 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2 px-4 py-5 text-white"><SunLogo size={32} /><span className="text-xl font-bold tracking-tight">SolarFlow <span className="text-amber">OS</span></span></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">{NAV.filter(n => n.roles.includes(activeUser.role)).map(n => { const on = n.href === '/' ? path === '/' : path.startsWith(n.href), Icon = n.icon
        return <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${on ? 'bg-[#2A5C9E]/60 font-semibold text-white' : 'hover:bg-white/5 hover:text-white'}`}><Icon size={18} />{n.label}</Link> })}</nav>
      <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs"><span className="text-slate-400">Current User</span><br /><b className="text-sm text-white">{activeUser.name}</b><br /><span className="capitalize">{activeUser.role.replace('_', ' ')}</span></div>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <button className="btn-ghost !px-2 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <span className="flex-1 text-sm font-medium">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/20 px-3 py-1 text-xs font-semibold text-amber-800">
          <ShieldCheck size={14} /> Admin Access
        </span>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6"><div className="mx-auto max-w-6xl">{canSee(activeUser.role, path) ? children : <div className="card text-center"><h1>No access</h1><p className="mt-1 text-sm text-slate-500">Your role ({activeUser.role.replace('_', ' ')}) cannot open this page.</p></div>}</div></main>
    </div></div>
}
