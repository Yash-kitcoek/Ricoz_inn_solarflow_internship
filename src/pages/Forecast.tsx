import { useEffect, useState } from 'react'
import { listProjects } from '../lib/api'
import { listNm, listMilestones } from '../lib/api2'
import { diagnose, scorecard, DISCOM_STAGES } from '../lib/stuck'
import { forecast } from '../lib/forecast'
import type { Project } from '../types'
const rs = (n: number) => (n < 0 ? '-' : '') + 'Rs ' + Math.abs(Math.round(n)).toLocaleString('en-IN')
export default function Forecast() {
  const [d, setD] = useState<Awaited<ReturnType<typeof listNm>> & { ps: Project[]; ms: Awaited<ReturnType<typeof listMilestones>>['data'] } | null>(null)
  const [open, setOpen] = useState(0), [pct, setPct] = useState(25), [delay, setDelay] = useState(30)
  useEffect(() => { void Promise.all([listProjects(), listNm(), listMilestones()]).then(([p, n, m]) => setD({ ...n, ps: p.data ?? [], ms: m.data ?? [], error: n.error ?? p.error ?? m.error })) }, [])
  if (!d) return <p>Loading…</p>
  const today = new Date(), add = (n: number) => new Date(today.getTime() + n * 864e5)
  const sc = scorecard(d.apps, d.events), avg = sc.length ? Math.round(sc.reduce((s, x) => s + x.avgDays, 0) / sc.length) : 18
  const inflowsFor = (extra: number) => d.apps.filter(a => a.status !== 'Connected to Grid').map(a => {
    const w = diagnose(a.status, a.status_changed_at).days, rem = DISCOM_STAGES.includes(a.status) ? Math.max(5, avg - w) : avg + 10, p = d.ps.find(x => x.id === a.project_id)
    return { amount: (p?.contract_value ?? 0) * pct / 100, date: add(rem + extra) } })
  const out = d.ms.filter(m => m.status !== 'paid').map(m => ({ amount: m.milestone_amount, date: m.due_date ? new Date(m.due_date) : add(30) }))
  const base = forecast(open, inflowsFor(0), out), late = forecast(open, inflowsFor(delay), out), low = late.reduce((a, r) => (r.balance < a.balance ? r : a), late[0]), mx = Math.max(1, ...base.concat(late).map(r => Math.abs(r.balance)))
  return <div className="space-y-4"><h1>Cash-flow Forecast</h1>{d.error && <p className="text-sm text-red-600">{d.error}</p>}
    <div className="card grid gap-3 sm:grid-cols-3"><label className="text-sm">Opening balance (Rs)<input className="input mt-1" type="number" value={open} onChange={e => setOpen(Number(e.target.value))}/></label>
      <label className="text-sm">Collected at grid connection (% of contract value)<input className="input mt-1" type="number" min={0} max={100} value={pct} onChange={e => setPct(Math.min(100, Math.max(0, Number(e.target.value))))}/></label>
      <label className="text-sm">Extra utility delay: <b>{delay} days</b><input className="mt-3 w-full" type="range" min={0} max={90} value={delay} onChange={e => setDelay(Number(e.target.value))}/></label></div>
    <div className={`card ${low.balance < 0 ? 'border-bad' : ''}`}><b>{delay} extra days of delay: </b>{low.balance < 0 ? <>the lowest balance is <b className="text-bad">{rs(low.balance)}</b> in {low.label}.</> : <>balance stays positive (lowest {rs(low.balance)} in {low.label}).</>}</div>
    <div className="card overflow-x-auto"><table><thead><tr><th>Month</th><th>Money in (on time)</th><th>Money out</th><th>Balance, on time</th><th>Balance, +{delay} days</th></tr></thead><tbody>
      {base.map((r, i) => <tr key={r.label}><td>{r.label}</td><td>{rs(r.inflow)}</td><td>{rs(r.outflow)}</td><td>{rs(r.balance)}</td><td><div className="flex items-center gap-2"><div className="h-3 rounded" style={{ width: `${Math.abs(late[i].balance) / mx * 100}px`, maxWidth: 140, background: late[i].balance < 0 ? '#D64545' : '#2878D0' }}/>{rs(late[i].balance)}</div></td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-500">An estimate, not a bank forecast. Collections happen when each project's utility application is expected to finish (average authority-stage days {avg}{sc.length ? ' from your own history' : ', a default because there is no history yet'}); contractor payments use milestone due dates (30 days out if none). Projects without a net-metering application add no income. Other costs and customer payment terms are not modelled.</p></div>
}
