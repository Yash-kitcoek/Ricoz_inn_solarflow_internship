import { useEffect, useState, FormEvent } from 'react'
import { listProjects } from '../lib/api'
import { listDocs, createDoc, newVersion, setDocStatus, openDoc, checkFile, DOC_CATS, DOC_STATUS, type Doc } from '../lib/api3'
import { demoMode } from '../lib/supabase'
import type { Project } from '../types'
export default function Documents() {
  const [ds, setDs] = useState<Doc[]>([]), [ps, setPs] = useState<Project[]>([]), [cat, setCat] = useState(''), [q, setQ] = useState(''), [err, setErr] = useState<string | null>(null)
  const load = async () => { const [a, b] = await Promise.all([listDocs(), listProjects()]); setDs(a.data); setPs(b.data ?? []); setErr(a.error ?? b.error) }
  useEffect(() => { void load() }, [])
  const code = (id: string) => ps.find(p => p.id === id)?.code ?? '-'
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget), file = f.get('file') as File
    if (!file?.name) return setErr('Choose a file.'); const bad = checkFile(file); if (bad) return setErr(bad)
    const m = await createDoc(String(f.get('project')), String(f.get('title')).trim() || file.name, String(f.get('cat')), file, String(f.get('model')).trim() || undefined); setErr(m); if (!m) { e.currentTarget.reset(); void load() } }
  const rows = ds.filter(d => (!cat || d.category === cat) && d.title.toLowerCase().includes(q.toLowerCase()))
  return <div className="space-y-3"><h1 className="text-xl font-bold">CAD &amp; Documents</h1>
    <p className="text-sm text-slate-500">Files are stored privately and opened with a 60-second signed link. {demoMode && 'Demo mode keeps records only; no file is stored.'}</p>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid sm:grid-cols-6 gap-2"><select name="project" className="input" required>{ps.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      <input name="title" className="input" placeholder="Title (optional)"/><input name="model" className="input" placeholder="Equipment model named (optional)"/><select name="cat" className="input">{DOC_CATS.map(c => <option key={c}>{c}</option>)}</select><input name="file" type="file" className="input" required/><button className="btn">Upload</button></form>
    <div className="flex gap-2"><input className="input max-w-xs" placeholder="Search" value={q} onChange={e => setQ(e.target.value)}/><select className="input max-w-xs" value={cat} onChange={e => setCat(e.target.value)}><option value="">All categories</option>{DOC_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Project</th><th>Title</th><th>Category</th><th>Ver.</th><th>Status</th><th></th></tr></thead><tbody>
      {rows.map(d => <tr key={d.id} className="border-t"><td>{code(d.project_id)}</td><td>{d.title}</td><td>{d.category}</td><td>v{d.current_version}</td>
        <td><select className="input" value={d.status} onChange={async e => { setErr(await setDocStatus(d.id, e.target.value)); void load() }}>{DOC_STATUS.map(s => <option key={s}>{s}</option>)}</select></td>
        <td className="space-x-2">{d.path && <button className="underline" onClick={async () => setErr(await openDoc(d.path!))}>Download</button>}
          <label className="underline cursor-pointer">New version<input type="file" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const bad = checkFile(f); if (bad) return setErr(bad); setErr(await newVersion(d, f)); void load() }}/></label></td></tr>)}</tbody></table>
      {rows.length === 0 && <p className="p-3 text-slate-500">No documents match.</p>}</div></div>
}
