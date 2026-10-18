import { useEffect, useState, FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { listProjects, createProject } from '../lib/api'
import { type Project } from '../types'
import { useAuth } from '../auth/AuthContext'
import { can } from '../lib/permissions'
import { Badge, Progress, Empty } from '../components/ui'
export default function Projects() {
  const { role } = useAuth()
  const [sp] = useSearchParams(); const [ps,setPs]=useState<Project[]>([]),[q,setQ]=useState(''),[err,setErr]=useState<string|null>(null),[open,setOpen]=useState(sp.get('new')==='1')
  const status = sp.get('status')
  const load = () => listProjects().then(r=>{ setPs(r.data ?? []); setErr(r.error) })
  useEffect(()=>{ void load() },[])
  const rows = ps.filter(p=>(!status||p.status===status)&&(p.name+p.customer_name+p.code).toLowerCase().includes(q.toLowerCase()))
  async function submit(e: FormEvent<HTMLFormElement>){ e.preventDefault(); const f=new FormData(e.currentTarget)
    const kw=Number(f.get('kw')); if(!(kw>0)) return setErr('Capacity must be above 0 kW.')
    const r = await createProject({ name:String(f.get('name')), customer_name:String(f.get('customer')), project_type:f.get('type') as Project['project_type'], capacity_kw:kw,
      contract_value:0, status:'Draft', progress:0, start_date:null, end_date:null })
    if (r.error) return setErr(r.error); setOpen(false); setErr(null); void load() }
  return <div className="space-y-3"><div className="flex gap-2"><h1 className="text-xl font-bold flex-1">Projects</h1><input className="input max-w-xs" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)}/>{can(role, 'project.create') && <button className="btn" onClick={()=>setOpen(o=>!o)}>New project</button>}</div>
    {err && <p className="text-red-600 text-sm">{err}</p>}
    {open && <form onSubmit={submit} className="card grid sm:grid-cols-5 gap-2"><input name="name" className="input" placeholder="Project name" required/><input name="customer" className="input" placeholder="Customer" required/>
      <select name="type" className="input"><option>Residential</option><option>Commercial</option></select><input name="kw" type="number" step="0.1" className="input" placeholder="kW" required/><button className="btn">Save</button></form>}
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>ID</th><th>Project</th><th>Customer</th><th>kW</th><th>Status</th><th>Progress</th></tr></thead>
      <tbody>{rows.map(p=><tr key={p.id} className="border-t"><td>{p.code}</td><td><Link className="underline" to={'/projects/'+p.id}>{p.name}</Link></td><td>{p.customer_name}</td><td>{p.capacity_kw}</td><td><Badge text={p.status}/></td><td className="min-w-[120px]"><Progress value={p.progress}/></td></tr>)}</tbody></table>
      {rows.length===0 && <Empty title="No projects match" hint="Clear the search or create a new project."/>}</div></div>
}
