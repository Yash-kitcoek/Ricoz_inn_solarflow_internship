import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, FolderKanban, ShieldCheck, Zap, FileText, ListChecks, HardHat, Wallet, BarChart3, TrendingUp, Wrench, CloudSun, BadgeCheck, Cpu, FileX, Bell, Settings, Plus, Menu, PanelLeftClose, PanelLeftOpen, LogOut, CalendarDays, User, ChevronRight } from 'lucide-react'
import { demoMode } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { listTasks, listPermitItems } from '../lib/api'
import { SunLogo } from './ui'
import SyncBadge from './SyncBadge'
import { useT, LangSwitch } from '../i18n'
import { canView, can } from '../lib/permissions'
import type { Role } from '../types'
export const NAV = [['/','Overview',LayoutDashboard],['/projects','Projects',FolderKanban],['/permits','Permits & Approvals',ShieldCheck],['/net-metering','Net Metering',Zap],['/documents','CAD & Documents',FileText],['/tasks','Installation Tasks',ListChecks],['/contractors','Contractors',HardHat],['/payments','Payments',Wallet],['/equipment','Equipment',Cpu],['/rejections','Rejections',FileX],['/weather','Weather Planner',CloudSun],['/subsidy','Subsidy Readiness',BadgeCheck],['/forecast','Cash-flow Forecast',TrendingUp],['/after-install','After Installation',Wrench],['/reports','Reports & Analytics',BarChart3],['/notifications','Notifications',Bell],['/settings','Settings',Settings]] as const
export default function Layout() {
  const { name, role, signOut, setDemoRole } = useAuth(); const { t } = useT(); const [open, setOpen] = useState(false), [mini, setMini] = useState(false), [alerts, setAlerts] = useState(0); const loc = useLocation()
  useEffect(() => { const now = new Date().toISOString().slice(0, 10); void Promise.all([listTasks(), listPermitItems()]).then(([t, p]) =>
    setAlerts((t.data ?? []).filter(x => x.status !== 'Completed' && !!x.due_date && x.due_date < now).length + (p.data ?? []).filter(x => x.status !== 'Approved' && !!x.due_date && x.due_date < now).length)) }, [loc.pathname])
  return <div className="flex h-screen overflow-hidden">
    {open && <div className="fixed inset-0 z-30 bg-navy/50 md:hidden" onClick={() => setOpen(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-[#0E2A4D] to-[#16324F] text-slate-300 transition-all md:static ${mini ? 'md:w-[72px]' : 'md:w-60'} ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-60" style={{ backgroundImage: 'linear-gradient(rgba(120,170,230,.12) 1px,transparent 1px),linear-gradient(90deg,rgba(120,170,230,.12) 1px,transparent 1px)', backgroundSize: '30px 30px', transform: 'perspective(260px) rotateX(48deg)', transformOrigin: 'bottom', maskImage: 'linear-gradient(to top,#000,transparent)', WebkitMaskImage: 'linear-gradient(to top,#000,transparent)' }}/>
      <div className="relative flex items-center gap-2 px-4 py-5 text-white"><SunLogo size={32}/>{!mini && <span className="text-xl font-bold tracking-tight">SolarFlow <span className="text-amber">OS</span></span>}</div>
      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 pb-2">{NAV.filter(([to]) => canView(role, to)).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} title={t(label)} onClick={() => setOpen(false)}
        className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive ? 'bg-[#2A5C9E]/60 font-semibold text-white' : 'hover:bg-white/5 hover:text-white'}`}><Icon size={18} className="shrink-0"/>{!mini && t(label)}</NavLink>)}</nav>
      <Link to="/settings" className="relative m-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs hover:bg-white/10"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-navy"><User size={18}/></span>
        {!mini && <><span className="flex-1"><span className="block text-slate-400">Signed in as</span><b className="text-sm text-white">{role ?? 'unknown'}</b></span><ChevronRight size={16}/></>}</Link>
    </aside>
    <div className="flex min-w-0 flex-1 flex-col">
      {demoMode && <div className="bg-amber/30 px-4 py-1.5 text-xs">Demo mode: Supabase is not configured. Sample data is held in memory and is not saved anywhere.</div>}
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3" style={{ paddingTop: 'max(.75rem, env(safe-area-inset-top))' }}>
        <button className="btn-ghost !px-2 md:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={18}/></button>
        <button className="btn-ghost hidden !px-2 md:inline-flex" aria-label="Collapse sidebar" onClick={() => setMini(m => !m)}>{mini ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
        <span className="flex flex-1 items-center gap-2 text-sm font-medium"><CalendarDays size={18} className="text-solar"/><span className="hidden sm:inline">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span className="sm:hidden">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span></span>
        {can(role, 'project.create') && <NavLink to="/projects?new=1" className="btn !rounded-xl !px-4 !py-2.5"><Plus size={16}/><span className="hidden sm:inline">{t('Create Project')}</span></NavLink>}
        {demoMode && <select className="input !w-auto" aria-label="Demo role (UI only)" title="Demo only: previews what each role can see. Real enforcement needs Supabase." value={role ?? 'admin'} onChange={e => setDemoRole(e.target.value as Role)}>{['admin', 'project_manager', 'engineer', 'contractor', 'finance'].map(r => <option key={r}>{r}</option>)}</select>}
        <LangSwitch/>
        <SyncBadge/>
        <NavLink to="/notifications" className="relative rounded-lg p-2 hover:bg-slate-100" aria-label={`Notifications${alerts ? `, ${alerts} overdue` : ''}`}><Bell size={20}/>{alerts > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-bad ring-2 ring-white"/>}</NavLink>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-solar text-xs font-bold text-white" title={name}>{(name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}</div>
        {!demoMode && <button className="btn-ghost !px-2" aria-label="Sign out" onClick={signOut}><LogOut size={18}/></button>}
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6"><div className="mx-auto max-w-6xl">{canView(role, loc.pathname) ? <Outlet/> : <div className="card text-center"><h1>No access</h1><p className="mt-1 text-sm text-slate-500">Your role ({role}) cannot open this page.</p></div>}</div></main>
    </div></div>
}
