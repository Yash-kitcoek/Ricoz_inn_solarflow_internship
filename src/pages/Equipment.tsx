import { useEffect, useState, FormEvent } from 'react'
import { listProjects } from '../lib/api'
import { listDocs, type Doc } from '../lib/api3'
import { listEquipment, addEquipment, deleteEquipment } from '../lib/api6'
import { mismatches, type Equip } from '../lib/equipment'
import { aiEnabled, extractNameplate } from '../lib/ai'
import { useAuth } from '../auth/AuthContext'
import { can } from '../lib/permissions'
import type { Project } from '../types'
export default function Equipment() {
  const { role } = useAuth(); const [eq, setEq] = useState<Equip[]>([]), [ps, setPs] = useState<Project[]>([]), [docs, setDocs] = useState<Doc[]>([]), [err, setErr] = useState<string | null>(null), [note, setNote] = useState<string | null>(null), [q, setQ] = useState('')
  const [f, setF] = useState({ project: '', kind: 'panel', make: '', model: '', serial: '', quantity: 1 })
  const load = async () => { const [a, b, c] = await Promise.all([listEquipment(), listProjects(), listDocs()]); setEq(a.data); setPs(b.data ?? []); setDocs(c.data); setErr(a.error ?? b.error ?? c.error); setF(x => ({ ...x, project: x.project || (b.data ?? [])[0]?.id || '' })) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  async function add(e: FormEvent) { e.preventDefault(); if (!f.model.trim()) return setErr('Enter the model.'); if (!(f.quantity >= 1)) return setErr('Quantity must be at least 1.')
    const m = await addEquipment({ project_id: f.project, kind: f.kind, make: f.make.trim() || null, model: f.model.trim(), serial: f.serial.trim() || null, quantity: f.quantity }); setErr(m); if (!m) { setF({ ...f, make: '', model: '', serial: '', quantity: 1 }); void load() } }
  async function read(file: File | undefined) { if (!file) return; setNote('Reading the nameplate…'); const r = await extractNameplate(file)
    if (!r.ok) return setNote('Could not read the nameplate: ' + r.error); setF(x => ({ ...x, make: r.data.make ?? x.make, model: r.data.model ?? x.model, serial: r.data.serial ?? x.serial })); setNote('Filled from the photo. Check every field against the nameplate before saving.') }
  const bad = mismatches(eq, docs), rows = eq.filter(e => !q || (e.serial ?? '').toLowerCase().includes(q.toLowerCase()) || e.model.toLowerCase().includes(q.toLowerCase()))
  return <div className="space-y-4"><h1>Equipment</h1>{err && <p role="alert" className="text-sm text-red-600">{err}</p>}{note && <p className="text-sm text-amber-700">{note}</p>}
    {can(role, 'equipment.edit') && <form onSubmit={add} className="card grid gap-2 sm:grid-cols-4"><select className="input" value={f.project} onChange={e => setF({ ...f, project: e.target.value })}>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      <select className="input" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{['panel', 'inverter', 'battery', 'other'].map(k => <option key={k}>{k}</option>)}</select>
      <input className="input" placeholder="Make" value={f.make} onChange={e => setF({ ...f, make: e.target.value })}/><input className="input" placeholder="Model" value={f.model} onChange={e => setF({ ...f, model: e.target.value })} required/>
      <input className="input" placeholder="Serial number (optional)" value={f.serial} onChange={e => setF({ ...f, serial: e.target.value })}/><input className="input" type="number" min={1} value={f.quantity} onChange={e => setF({ ...f, quantity: Number(e.target.value) })}/>
      <button className="btn">Add equipment</button>{aiEnabled && <label className="btn-ghost cursor-pointer">Read nameplate photo<input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => void read(e.target.files?.[0])}/></label>}</form>}
    {bad.length > 0 && <div className="card border-amber"><h2 className="mb-1">Possible mismatches</h2>{bad.map(b => <p key={b.message} className="text-sm">{code(b.project_id)}: {b.message}</p>)}</div>}
    <input className="input max-w-sm" placeholder="Search serial or model (warranty lookup)" value={q} onChange={e => setQ(e.target.value)}/>
    <div className="card overflow-x-auto"><table><thead><tr><th>Project</th><th>Kind</th><th>Make</th><th>Model</th><th>Serial</th><th>Qty</th><th></th></tr></thead><tbody>
      {rows.map(e => <tr key={e.id}><td>{code(e.project_id)}</td><td>{e.kind}</td><td>{e.make}</td><td>{e.model}</td><td>{e.serial}</td><td>{e.quantity}</td><td>{can(role, 'contractor.manage') && <button className="underline" onClick={async () => { if (confirm('Delete this equipment record?')) { setErr(await deleteEquipment(e.id)); void load() } }}>Delete</button>}</td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="p-3 text-slate-500">No equipment recorded.</p>}</div>
    <p className="text-xs text-slate-500">Mismatch checks compare the model you enter on a document (Documents page) with this registry. They only catch what has been entered, and a person should confirm.</p></div>
}
