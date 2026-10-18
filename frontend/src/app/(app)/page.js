'use client'
import Link from 'next/link'
import { FolderKanban, HardHat, ShieldCheck, Zap, AlertTriangle, IndianRupee, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { isStaff } from '@/lib/nav'
import { money } from '@/lib/format'
import { ErrorText, Loading, Empty } from '@/components/ui'
export default function Dashboard() {
  const { user } = useAuth(), { data: d, error, loading } = useLoad(() => api('/dashboard'))
  if (loading) return <Loading />
  if (!d) return <ErrorText>{error}</ErrorText>
  const staff = isStaff(user.role)
  const cards = [['Total projects', d.totalProjects, '/projects', FolderKanban, 'text-solar bg-blue-50'], ['Active installations', d.activeInstallations, '/projects', HardHat, 'text-ok bg-green-50'],
    ...(staff ? [['Open permit items', d.openPermitItems, '/permits', ShieldCheck, 'text-amber-600 bg-amber/20'], ['Overdue permit items', d.overduePermitItems, '/permits', AlertTriangle, 'text-bad bg-red-50'], ['Pending net-metering', d.pendingNetMetering, '/net-metering', Zap, 'text-solar bg-blue-50']] : []),
    ['Unpaid milestones', money(d.unpaidMilestoneAmount), '/payments', IndianRupee, 'text-ok bg-green-50']]
  return <div className="space-y-5"><h1>Welcome back, {user.name.split(' ')[0]}</h1><ErrorText>{error}</ErrorText>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map(([l, v, to, Icon, tone]) => <Link key={l} href={to} className="card flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-solar">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tone}`}><Icon size={22} /></span><span className="flex-1"><span className="block text-2xl font-bold leading-tight">{v}</span><span className="text-sm text-slate-500">{l}</span></span><ChevronRight size={18} className="text-slate-400" /></Link>)}</div>
    {staff && <div className="card"><h2 className="mb-2">Applications that are stuck</h2>{d.stuckApplications.length === 0 ? <Empty>Nothing is over its time limit.</Empty> : d.stuckApplications.map(a => <div key={a.id} className="border-t py-2 text-sm first:border-0">
      <b>{a.project?.code} {a.project?.name}</b> · {a.utility} · {a.status}<div className="text-slate-600">Waiting on {a.owner} for {a.days} days. {a.action}</div></div>)}</div>}</div>
}
