import { useEffect, useState } from 'react'
import { listProjects, listPermitItems, listTasks } from '../lib/api'
import { listNm, listMilestones } from '../lib/api2'
const csv = (name: string, rows: (string | number)[][]) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' })); a.download = name; a.click() }
export default function Reports() {
  const [d, setD] = useState<null | { m: [string, string][]; proj: (string | number)[][]; pay: (string | number)[][] }>(null), [err, setErr] = useState<string | null>(null)
  useEffect(() => { void (async () => { const [p, i, t, n, m] = await Promise.all([listProjects(), listPermitItems(), listTasks(), listNm(), listMilestones()])
    setErr(p.error ?? i.error ?? t.error ?? n.error ?? m.error); const ps = p.data ?? [], now = new Date().toISOString().slice(0, 10), ms = m.data ?? []
    const paid = ms.filter(x => x.status === 'paid').reduce((s, x) => s + x.milestone_amount, 0), open = ms.filter(x => x.status !== 'paid').reduce((s, x) => s + x.milestone_amount, 0)
    setD({ m: [['Project completion rate', ps.length ? Math.round(ps.filter(x => x.status === 'Completed').length / ps.length * 100) + '%' : '0%'], ['Permit items approved', `${(i.data ?? []).filter(x => x.status === 'Approved').length} of ${(i.data ?? []).length}`],
      ['Net-metering connected', `${n.apps.filter(x => x.status === 'Connected to Grid').length} of ${n.apps.length}`], ['Overdue tasks', String((t.data ?? []).filter(x => x.status !== 'Completed' && !!x.due_date && x.due_date < now).length)],
      ['Total contract value (Rs)', ps.reduce((s, x) => s + x.contract_value, 0).toLocaleString('en-IN')], ['Milestones paid (Rs)', paid.toLocaleString('en-IN')], ['Milestones not yet paid (Rs)', open.toLocaleString('en-IN')]],
      proj: [['code', 'name', 'customer', 'kW', 'status', 'value'], ...ps.map(x => [x.code, x.name, x.customer_name, x.capacity_kw, x.status, x.contract_value])], pay: [['project_id', 'milestone', 'amount', 'status'], ...ms.map(x => [x.project_id, x.description, x.milestone_amount, x.status])] }) })() }, [])
  if (!d) return <p>Loading…</p>
  return <div className="space-y-3"><h1 className="text-xl font-bold">Reports &amp; Analytics</h1>{err && <p className="text-sm text-red-600">Some data failed to load: {err}</p>}
    <div className="flex gap-2"><button className="btn" onClick={() => csv('projects.csv', d.proj)}>Export projects CSV</button><button className="btn" onClick={() => csv('payments.csv', d.pay)}>Export payments CSV</button></div>
    <div className="card">{d.m.map(([k, v]) => <div key={k} className="flex justify-between border-t first:border-0 py-2 text-sm"><span>{k}</span><b>{v}</b></div>)}</div>
    <p className="text-xs text-slate-500">Figures come from the records your role can see. Date-range and contractor filters are not built yet. CSV export is not restricted by role beyond what the database lets you read.</p></div>
}
