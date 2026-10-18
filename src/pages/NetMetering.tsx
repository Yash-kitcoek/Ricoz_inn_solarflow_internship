import { useEffect, useState, FormEvent } from 'react'
import { listNm, setNmStatus, addNm, type NmApp } from '../lib/api2'
import { listProjects } from '../lib/api'
import RejectionInsights from '../components/RejectionInsights'
import { aiEnabled, checkPacket } from '../lib/ai'
import { NM_STATUSES, diagnose, scorecard, type NmEvent } from '../lib/stuck'
import type { Project } from '../types'
export default function NetMetering() {
  const [pre, setPre] = useState<string[]>([]); const [apps, setApps] = useState<NmApp[]>([]), [ev, setEv] = useState<NmEvent[]>([]), [ps, setPs] = useState<Project[]>([]), [err, setErr] = useState<string | null>(null)
  const load = async () => { const [a, p] = await Promise.all([listNm(), listProjects()]); setApps(a.apps); setEv(a.events); setPs(p.data ?? []); setErr(a.error ?? p.error) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  const rows = apps.map(a => ({ a, d: diagnose(a.status, a.status_changed_at) })).sort((x, y) => Number(y.d.late) - Number(x.d.late) || y.d.days - x.d.days)
  const sc = scorecard(apps, ev)
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const u = String(f.get('utility')).trim()
    if (!u) return setErr('Enter the utility or authority.'); const m = await addNm(String(f.get('project')), u); setErr(m); if (!m) { e.currentTarget.reset(); void load() } }
  return <div className="space-y-4"><h1 className="text-xl font-bold">Net Metering</h1>
    <p className="text-sm text-slate-500">Statuses are entered by users and do not reflect any live utility response. Limits are editable defaults (src/lib/stuck.ts), not legal deadlines.</p>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid sm:grid-cols-3 gap-2"><select name="project" className="input" required>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select><input name="utility" className="input" placeholder="Utility / authority" required/><button className="btn">New application</button></form>
    <div className="card overflow-x-auto"><h2 className="font-semibold mb-2">Why is it stuck?</h2><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Project</th><th>Utility</th><th>Status</th><th>Waiting on</th><th>Days</th><th>Next action</th></tr></thead><tbody>
      {rows.map(({ a, d }) => <tr key={a.id} className="border-t align-top"><td>{code(a.project_id)}</td><td>{a.utility_provider}</td>
        <td><select className="input" value={a.status} onChange={async e => { setErr(await setNmStatus(a.id, e.target.value)); void load() }}>{NM_STATUSES.map(s => <option key={s}>{s}</option>)}</select></td>
        <td>{d.owner}</td><td className={d.late ? 'text-red-600 font-semibold' : ''}>{d.days}{d.late && ` (over ${d.owner === 'Nobody' ? '' : 'limit'})`}</td><td>{d.late && <b>Escalate: </b>}{d.action}{aiEnabled && <button className="btn-ghost ml-2 !px-2 !py-1 text-xs" onClick={async () => { const r = await checkPacket(a.project_id); setErr(r.ok ? null : r.error); setPre(r.ok ? r.data.findings.map(f => f.severity + ': ' + f.message) : []) }}>Pre-check packet</button>}</td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="p-3 text-slate-500">No applications yet.</p>}</div>
    {pre.length > 0 && <div className="card"><h2 className="font-semibold mb-2">Packet pre-check (assistive; a person decides)</h2>{pre.map(x => <p key={x} className="text-sm">{x}</p>)}</div>}
    <RejectionInsights/>
    <div className="card"><h2 className="font-semibold mb-2">Authority scorecard (days in authority-owned stages)</h2>
      {sc.length ? <table className="w-full text-sm"><tbody>{sc.map(s => <tr key={s.utility} className="border-t"><td>{s.utility}</td><td>{s.applications} application(s)</td><td className="font-semibold">{s.avgDays} days average</td></tr>)}</tbody></table> : <p className="text-sm text-slate-500">Needs applications that have passed through Submitted, Under Review or Inspection Scheduled.</p>}
      <p className="text-xs text-slate-500 mt-2">Based only on applications you can see in this account. Use it to set customer expectations, not as an official rating.</p></div></div>
}
