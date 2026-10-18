import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, HardHat, ShieldCheck, Zap, AlertTriangle, IndianRupee, ChevronRight } from 'lucide-react'
import { listProjects, listPermitItems, listTasks, type PermitItem, type Task } from '../lib/api'
import { listNm, listMilestones } from '../lib/api2'
import { useT } from '../i18n'
import { useAuth } from '../auth/AuthContext'
import { Skeleton, Progress, Empty, HeroArt } from '../components/ui'
import { STATUSES, type Project } from '../types'
const barColor = (s: string) => ['Permitting', 'Planning', 'Draft', 'Installation in Progress'].includes(s) ? '#F4B942' : s === 'Completed' ? '#1E9E5A' : s === 'On Hold' ? '#D64545' : '#2878D0'
export default function Dashboard() {
  const { name } = useAuth(), { t } = useT(); const [d, setD] = useState<{ ps: Project[]; pi: PermitItem[]; ts: Task[]; nm: number; owed: number } | null>(null), [err, setErr] = useState<string | null>(null)
  useEffect(() => { Promise.all([listProjects(), listPermitItems(), listTasks(), listNm(), listMilestones()]).then(([a, b, c, n, m]) => {
    setErr(a.error ?? b.error ?? c.error ?? n.error ?? m.error)
    setD({ ps: a.data ?? [], pi: b.data ?? [], ts: c.data ?? [], nm: n.apps.filter(x => !['Approved', 'Connected to Grid'].includes(x.status)).length, owed: (m.data ?? []).filter(x => x.status !== 'paid').reduce((s, x) => s + x.milestone_amount, 0) }) }) }, [])
  if (!d) return <div className="space-y-4"><Skeleton className="h-36"/><div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24"/>)}</div></div>
  const { ps, pi, ts } = d, now = new Date().toISOString().slice(0, 10), kw = ps.reduce((s, p) => s + p.capacity_kw, 0)
  const dist = STATUSES.map(s => ({ status: s, count: ps.filter(p => p.status === s).length })).filter(x => x.count > 0)
  const top = Math.max(4, ...dist.map(x => x.count)), step = Math.ceil(top / 4), ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step), max = ticks[ticks.length - 1]
  const cards = [['Total Projects', ps.length, '/projects', FolderKanban, 'text-solar bg-blue-50'], ['Active Installations', ps.filter(p => p.status === 'Installation in Progress').length, '/projects?status=Installation in Progress', HardHat, 'text-ok bg-green-50'],
    ['Pending Permit Items', pi.filter(i => i.status !== 'Approved').length, '/permits', ShieldCheck, 'text-amber-600 bg-amber/20'], ['Pending Net-Metering', d.nm, '/net-metering', Zap, 'text-solar bg-blue-50'],
    ['Overdue Tasks', ts.filter(t => t.status !== 'Completed' && !!t.due_date && t.due_date < now).length, '/tasks', AlertTriangle, 'text-bad bg-red-50'], ['Unpaid Milestones (Rs)', d.owed.toLocaleString('en-IN'), '/payments', IndianRupee, 'text-ok bg-green-50']] as const
  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0B2A55] via-[#123F78] to-[#1D5FB0] px-6 py-6 text-white shadow-card"><HeroArt/>
      <p className="relative text-sm text-blue-100">Welcome back{name ? `, ${name.split(' ')[0]}` : ''}</p><h1 className="relative mt-1 text-2xl sm:text-3xl">{ps.length} project{ps.length === 1 ? '' : 's'} <span className="text-amber">•</span> {kw.toLocaleString('en-IN')} kW under management</h1>
      <p className="relative mt-2 text-sm text-blue-100">Smarter solar project management for a cleaner tomorrow.</p></section>
    {err && <p className="text-sm text-red-600">Some data failed to load: {err}</p>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([l, v, to, Icon, tone]) => <Link key={l} to={to} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-solar"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={22}/></span>
      <span className="flex-1"><span className="block text-2xl font-bold leading-tight">{v}</span><span className="text-sm text-slate-500">{t(l)}</span></span><ChevronRight size={18} className="text-slate-400"/></Link>)}</div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card"><h2 className="mb-4 text-base">{t('Status distribution')}</h2>{dist.length === 0 ? <Empty title="No projects yet" hint="Create a project to see the pipeline."/> :
        <div className="relative pl-[150px] pr-6"><div className="pointer-events-none absolute inset-y-0 left-[150px] right-6">{ticks.map(t => <div key={t} className="absolute inset-y-0 border-l border-slate-200" style={{ left: `${t / max * 100}%` }}/>)}</div>
          {dist.map(x => <div key={x.status} className="relative flex h-14 items-center"><span className="absolute -left-[150px] w-[140px] text-right text-xs">{x.status}</span><div className="h-10 rounded-lg" style={{ width: `${x.count / max * 100}%`, background: barColor(x.status) }}/><span className="ml-2 text-xs font-medium">{x.count}</span></div>)}
          <div className="relative mt-1 h-5">{ticks.map(t => <span key={t} className="absolute -translate-x-1/2 text-xs text-slate-500" style={{ left: `${t / max * 100}%` }}>{t}</span>)}</div></div>}</div>
      <div className="card"><h2 className="mb-4 text-base">{t('Project progress')}</h2><div className="space-y-5">{ps.slice(0, 6).map(p => <Link key={p.id} to={'/projects/' + p.id} className="flex items-center gap-2"><div className="flex-1"><div className="mb-1.5 text-sm font-medium">{p.name}</div><Progress value={p.progress}/></div><ChevronRight size={18} className="text-slate-400"/></Link>)}{ps.length === 0 && <Empty title="Nothing to show"/>}</div></div>
    </div></div>
}
