import { useEffect, useState } from 'react'
import { listNotes, markRead, type Note } from '../lib/api3'
import { listPermitItems, listTasks } from '../lib/api'
import { demoMode } from '../lib/supabase'
export default function Notifications() {
  const [ns, setNs] = useState<Note[]>([]), [err, setErr] = useState<string | null>(null)
  const load = async () => { const now = new Date().toISOString().slice(0, 10); const [p, t] = await Promise.all([listPermitItems(), listTasks()])
    const derived = [...(p.data ?? []).filter(i => i.due_date && i.due_date < now && i.status !== 'Approved').map(i => 'Overdue permit item: ' + i.title), ...(t.data ?? []).filter(x => x.due_date && x.due_date < now && x.status !== 'Completed').map(x => 'Overdue task: ' + x.title)]
    const r = await listNotes(derived); setNs(r.data); setErr(r.error) }
  useEffect(() => { void load() }, [])
  return <div className="space-y-3"><h1 className="text-xl font-bold">Notifications</h1>
    <p className="text-sm text-slate-500">{demoMode ? 'Demo notifications derived from sample data; they are not scheduled reminders.' : 'Items marked "scheduled" come from the daily reminder job, which runs only if pg_cron is enabled (migration 0003).'}</p>{err && <p className="text-sm text-red-600">{err}</p>}
    <div className="card">{ns.map(n => <div key={n.id} className="flex justify-between border-t first:border-0 py-2 text-sm"><span className={n.read ? 'opacity-50' : ''}>{n.message} <i className="text-xs text-slate-400">({n.source})</i></span>
      {!n.read && !demoMode && <button className="underline" onClick={async () => { setErr(await markRead(n.id)); void load() }}>Mark read</button>}</div>)}{ns.length === 0 && <p className="text-slate-500">Nothing to show.</p>}</div></div>
}
