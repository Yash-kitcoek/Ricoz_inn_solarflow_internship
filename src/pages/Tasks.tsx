import { useEffect, useState, FormEvent } from 'react'
import { enqueue } from '../lib/offline'
import { listProjects, listTasks, addTask, setTaskStatus, TASK_STATUSES, type Task } from '../lib/api'
import type { Project } from '../types'
const today = () => new Date().toISOString().slice(0, 10)
export default function Tasks() {
  const [ts, setTs] = useState<Task[]>([]), [ps, setPs] = useState<Project[]>([]), [err, setErr] = useState<string|null>(null)
  const load = async () => { const [a, b] = await Promise.all([listTasks(), listProjects()]); setTs(a.data ?? []); setPs(b.data ?? []); setErr(a.error ?? b.error) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget)
    const title = String(f.get('title')).trim(); if (!title) return setErr('Enter a task title.')
    const m = await addTask(String(f.get('project')), title, String(f.get('due')) || null); if (m) return setErr(m); setErr(null); e.currentTarget.reset(); void load() }
  return <div className="space-y-3"><h1 className="text-xl font-bold">Installation Tasks</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid sm:grid-cols-4 gap-2"><select name="project" className="input" required>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      <input name="title" className="input" placeholder="Task" required/><input name="due" type="date" className="input"/><button className="btn">Add task</button></form>
    <div className="grid md:grid-cols-4 gap-3">{TASK_STATUSES.map(s => <div key={s}><h2 className="font-semibold text-sm mb-2">{s} ({ts.filter(t => t.status === s).length})</h2>
      {ts.filter(t => t.status === s).map(t => <div key={t.id} className="card mb-2 text-sm"><b>{t.title}</b><div className="text-slate-500">{code(t.project_id)} · {t.due_date ?? 'no date'}
        {t.due_date && t.due_date < today() && t.status !== 'Completed' && <span className="text-red-600 font-semibold"> overdue</span>}</div>
        <select className="input mt-1" value={t.status} onChange={async e => { if (!navigator.onLine) { await enqueue({ kind: 'task', payload: { id: t.id, status: e.target.value } }); setErr('Offline: this change is saved on this device and will sync later.'); return } setErr(await setTaskStatus(t.id, e.target.value)); void load() }}>{TASK_STATUSES.map(x => <option key={x}>{x}</option>)}</select></div>)}</div>)}</div></div>
}
