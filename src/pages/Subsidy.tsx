import { useEffect, useState } from 'react'
import { listProjects } from '../lib/api'
import { listNm, listMilestones } from '../lib/api2'
import { listDocs } from '../lib/api3'
import { listChecks, setCheck } from '../lib/api5'
import { ITEMS, SCHEME, type Ctx } from '../lib/subsidy'
export default function Subsidy() {
  const [all, setAll] = useState<{ ps: Ctx['project'][]; docs: Ctx['docs']; nm: Ctx['nm']; ms: Ctx['ms'] }>({ ps: [], docs: [], nm: [], ms: [] }), [pid, setPid] = useState(''), [manual, setManual] = useState<Record<string, boolean>>({}), [err, setErr] = useState<string | null>(null)
  useEffect(() => { void Promise.all([listProjects(), listDocs(), listNm(), listMilestones()]).then(([p, d, n, m]) => { setAll({ ps: p.data ?? [], docs: d.data, nm: n.apps, ms: m.data ?? [] }); setPid(x => x || (p.data ?? [])[0]?.id || ''); setErr(p.error ?? d.error ?? n.error ?? m.error) }) }, [])
  useEffect(() => { if (pid) void listChecks(pid).then(r => { setManual(r.data); setErr(r.error) }) }, [pid])
  const project = all.ps.find(p => p.id === pid)
  if (!project) return <div><h1>Subsidy Readiness</h1><p className="mt-2 text-slate-500">{err ?? 'No projects yet.'}</p></div>
  const c: Ctx = { project, docs: all.docs.filter(d => d.project_id === pid), nm: all.nm.filter(a => a.project_id === pid), ms: all.ms.filter(m => m.project_id === pid) }
  const state = ITEMS.map(i => ({ i, ok: i.auto ? i.auto(c) : !!manual[i.key] })), done = state.filter(s => s.ok).length
  return <div className="space-y-3"><h1>Subsidy Readiness</h1>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <p className="text-sm text-slate-500">{SCHEME}. These items are an editable starting point (src/lib/subsidy.ts). Replace them with your scheme's current official checklist; this page does not know the scheme's real rules and does not file anything.</p>
    <select className="input max-w-sm" value={pid} onChange={e => setPid(e.target.value)}>{all.ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
    <div className="card"><b>{done} of {ITEMS.length} items ready</b> ({Math.round(done / ITEMS.length * 100)}%)<div className="mt-3 space-y-1">{state.map(({ i, ok }) => <label key={i.key} className="flex items-start gap-2 border-t py-2 text-sm first:border-0">
      <input type="checkbox" className="mt-1" checked={ok} disabled={!!i.auto} onChange={async e => { setManual({ ...manual, [i.key]: e.target.checked }); setErr(await setCheck(pid, i.key, e.target.checked)) }}/>
      <span className="flex-1">{i.title}</span><span className={`badge ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{ok ? 'Ready' : 'Missing'}</span>{i.auto && <span className="text-xs text-slate-400">from your records</span>}</label>)}</div></div></div>
}
