import { useEffect, useState } from 'react'
import { listProjects } from '../lib/api'
import { updateProject } from '../lib/api3'
import { listReadings, saveReadings, type Reading } from '../lib/api4'
import type { Project } from '../types'
const addYears = (d: string, y: number) => { const x = new Date(d); x.setFullYear(x.getFullYear() + y); return x.toISOString().slice(0, 10) }
const addMonths = (d: string, m: number) => { const x = new Date(d); x.setMonth(x.getMonth() + m); return x.toISOString().slice(0, 10) }
export default function AfterInstall() {
  const [ps, setPs] = useState<Project[]>([]), [rd, setRd] = useState<Reading[]>([]), [err, setErr] = useState<string | null>(null), [yld, setYld] = useState(120), [svc, setSvc] = useState(6), [paste, setPaste] = useState<Record<string, string>>({})
  const load = async () => { const [a, b] = await Promise.all([listProjects(), listReadings()]); setPs((a.data ?? []).filter(p => p.commissioned_on || ['Commissioning', 'Completed'].includes(p.status))); setRd(b.data); setErr(a.error ?? b.error) }
  useEffect(() => { void load() }, [])
  const today = new Date().toISOString().slice(0, 10)
  async function importRows(p: Project) { const rows: Reading[] = []
    for (const line of (paste[p.id] ?? '').split('\n').map(l => l.trim()).filter(Boolean)) { const [m, k] = line.split(/[,;\t]/).map(x => x.trim()); const kwh = Number(k)
      if (!/^\d{4}-\d{2}/.test(m ?? '') || !Number.isFinite(kwh) || kwh < 0) return setErr(`Cannot read line "${line}". Use YYYY-MM,kWh.`); rows.push({ project_id: p.id, month: m.slice(0, 7) + '-01', kwh }) }
    if (!rows.length) return setErr('Paste lines like 2026-08,640'); setErr(await saveReadings(rows)); setPaste({ ...paste, [p.id]: '' }); void load() }
  return <div className="space-y-4"><h1>After Installation</h1>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <div className="card grid gap-3 sm:grid-cols-2"><label className="text-sm">Assumed yield (kWh per kW per month)<input className="input mt-1" type="number" value={yld} onChange={e => setYld(Number(e.target.value))}/></label>
      <label className="text-sm">Service reminder every (months)<input className="input mt-1" type="number" min={1} value={svc} onChange={e => setSvc(Math.max(1, Number(e.target.value)))}/></label>
      <p className="text-xs text-slate-500 sm:col-span-2">The yield is a rough assumption; real output depends on location, season, shading and tilt. A low month is a prompt to look, not a diagnosis.</p></div>
    {ps.length === 0 && <p className="text-slate-500">No commissioned or completed projects yet.</p>}
    {ps.map(p => { const mine = rd.filter(r => r.project_id === p.id).slice(-6), exp = p.capacity_kw * yld
      return <div key={p.id} className="card space-y-3"><h2>{p.code} · {p.name} ({p.capacity_kw} kW)</h2>
        <form className="grid gap-2 sm:grid-cols-4" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); setErr(await updateProject(p.id, { commissioned_on: String(f.get('c')) || null, warranty_panel_years: Number(f.get('wp')) || null, warranty_inverter_years: Number(f.get('wi')) || null })); void load() }}>
          <label className="text-xs">Commissioned on<input name="c" type="date" className="input" defaultValue={p.commissioned_on ?? ''}/></label><label className="text-xs">Panel warranty (years)<input name="wp" type="number" min={0} max={50} className="input" defaultValue={p.warranty_panel_years ?? ''}/></label>
          <label className="text-xs">Inverter warranty (years)<input name="wi" type="number" min={0} max={50} className="input" defaultValue={p.warranty_inverter_years ?? ''}/></label><button className="btn self-end">Save</button></form>
        {p.commissioned_on && <div className="text-sm">{p.warranty_panel_years ? `Panel warranty ends ${addYears(p.commissioned_on, p.warranty_panel_years)}. ` : ''}{p.warranty_inverter_years ? `Inverter warranty ends ${addYears(p.commissioned_on, p.warranty_inverter_years)}. ` : ''}
          {(() => { let n = p.commissioned_on; while (n < today) n = addMonths(n, svc); return `Next service reminder: ${n}.` })()}</div>}
        <div className="grid gap-3 sm:grid-cols-2"><div><h3 className="mb-1 text-xs font-semibold uppercase text-slate-500">Last readings (expected about {Math.round(exp)} kWh/month)</h3>
          {mine.length === 0 ? <p className="text-sm text-slate-500">No readings yet.</p> : mine.map(r => { const low = r.kwh < exp * 0.8
            return <div key={r.month} className="flex justify-between border-t py-1 text-sm"><span>{r.month.slice(0, 7)}</span><span>{r.kwh} kWh {low && <span className="badge bg-amber/25 text-amber-900">below 80% of expected</span>}</span></div> })}</div>
          <div><textarea className="input h-24" placeholder={'Paste monthly readings, one per line:\n2026-08,640'} value={paste[p.id] ?? ''} onChange={e => setPaste({ ...paste, [p.id]: e.target.value })}/><button className="btn mt-2" onClick={() => void importRows(p)}>Import readings</button></div></div></div> })}</div>
}
