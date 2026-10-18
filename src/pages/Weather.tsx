import { useEffect, useState, FormEvent } from 'react'
import { listProjects, listTasks, type Task } from '../lib/api'
import { listMilestones, type Milestone } from '../lib/api2'
import { updateProject } from '../lib/api3'
import { fetchForecast, risks, type Day, type Th } from '../lib/weather'
import type { Project } from '../types'
const plus = (d: string, n: number) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10)
export default function Weather() {
  const [ps, setPs] = useState<Project[]>([]), [ts, setTs] = useState<Task[]>([]), [ms, setMs] = useState<Milestone[]>([]), [fc, setFc] = useState<Record<string, Day[] | string>>({}), [th, setTh] = useState<Th>({ rain: 60, wind: 40 }), [err, setErr] = useState<string | null>(null)
  const load = async () => { const [a, b, c] = await Promise.all([listProjects(), listTasks(), listMilestones()]); const P = a.data ?? []; setPs(P); setTs(b.data ?? []); setMs(c.data ?? []); setErr(a.error ?? b.error ?? c.error)
    const out: Record<string, Day[] | string> = {}
    await Promise.all(P.filter(p => p.latitude != null && p.longitude != null).map(async p => { try { out[p.id] = await fetchForecast(p.latitude!, p.longitude!) } catch (e) { out[p.id] = e instanceof Error ? e.message : 'Forecast unavailable' } })); setFc(out) }
  useEffect(() => { void load() }, [])
  async function setLoc(p: Project, lat: number, lng: number) { if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return setErr('Latitude must be -90 to 90 and longitude -180 to 180.'); setErr(await updateProject(p.id, { latitude: lat, longitude: lng })); void load() }
  const here = (p: Project) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(x => void setLoc(p, x.coords.latitude, x.coords.longitude), () => setErr('Could not read your location.')) : setErr('Location is not available in this browser.')
  const submit = (p: Project) => (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const f = new FormData(e.currentTarget); void setLoc(p, Number(f.get('lat')), Number(f.get('lng'))) }
  return <div className="space-y-4"><h1>Weather Planner</h1>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <div className="card grid gap-3 sm:grid-cols-2"><label className="text-sm">Flag rain chance at or above: <b>{th.rain}%</b><input className="w-full" type="range" min={20} max={100} value={th.rain} onChange={e => setTh({ ...th, rain: Number(e.target.value) })}/></label>
      <label className="text-sm">Flag wind at or above: <b>{th.wind} km/h</b><input className="w-full" type="range" min={15} max={80} value={th.wind} onChange={e => setTh({ ...th, wind: Number(e.target.value) })}/></label>
      <p className="text-xs text-slate-500 sm:col-span-2">Forecasts come from Open-Meteo (free for non-commercial use) and get less reliable beyond a few days. Thresholds are your call; the site supervisor decides whether work goes ahead.</p></div>
    {ps.filter(p => !['Completed', 'Draft'].includes(p.status)).map(p => { const f = fc[p.id]
      return <div key={p.id} className="card space-y-2"><h2>{p.code} · {p.name}</h2>
        {p.latitude == null ? <form onSubmit={submit(p)} className="flex flex-wrap items-end gap-2 text-xs"><label>Latitude<input name="lat" type="number" step="any" className="input" required/></label><label>Longitude<input name="lng" type="number" step="any" className="input" required/></label><button className="btn">Save site location</button><button type="button" className="btn-ghost" onClick={() => here(p)}>Use my current location</button></form>
        : typeof f === 'string' ? <p className="text-sm text-red-600">{f}</p> : !f ? <p className="text-sm text-slate-500">Loading forecast…</p> : <>
          <div className="flex flex-wrap gap-1">{f.slice(0, 7).map(d => { const r = risks(d, th); return <span key={d.date} title={r.join(', ') || 'No flags'} className={`badge ${r.length ? 'bg-amber/30 text-amber-900' : 'bg-green-100 text-green-800'}`}>{d.date.slice(5)}: {r.length ? r.join(', ') : 'clear'}</span> })}</div>
          {ts.filter(t => t.project_id === p.id && t.status !== 'Completed' && t.due_date).map(t => { const day = f.find(d => d.date === t.due_date); if (!day) return null; const r = risks(day, th); if (!r.length) return null
            const next = f.find(d => d.date >= t.due_date! && risks(d, th).length === 0), slip = next ? Math.round((Date.parse(next.date) - Date.parse(t.due_date!)) / 864e5) : null
            return <div key={t.id} className="rounded-xl bg-amber/15 p-3 text-sm"><b>{t.title}</b> is due {t.due_date}: {r.join(', ')}. {next ? `The next clear day is ${next.date} (${slip} day${slip === 1 ? '' : 's'} later).` : 'No clear day in the 14-day forecast.'}
              {slip ? ms.filter(m => m.project_id === p.id && m.status !== 'paid' && m.due_date).map(m => <div key={m.id} className="text-xs text-slate-600">Payout "{m.description}" is due {m.due_date}; it may slip to about {plus(m.due_date!, slip)} if this work moves.</div>) : null}</div> })}</>}</div> })}
    {ps.length === 0 && <p className="text-slate-500">No active projects.</p>}</div>
}
