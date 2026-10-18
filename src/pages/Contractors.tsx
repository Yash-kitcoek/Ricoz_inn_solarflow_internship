import { useEffect, useState, FormEvent } from 'react'
import { listMilestones, type Milestone } from '../lib/api2'
import { listContractors, addContractor, type Contractor } from '../lib/api3'
export default function Contractors() {
  const [ms, setMs] = useState<Milestone[]>([]); const [cs, setCs] = useState<Contractor[]>([]), [err, setErr] = useState<string | null>(null)
  const load = async () => { const r = await listContractors(); setCs(r.data); setMs((await listMilestones()).data ?? []); setErr(r.error) }
  useEffect(() => { void load() }, [])
  async function add(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const f = new FormData(e.currentTarget); const n = String(f.get('name')).trim(); if (!n) return setErr('Enter a company name.')
    const m = await addContractor(n, String(f.get('contact')), String(f.get('phone')), String(f.get('spec'))); setErr(m); if (!m) { e.currentTarget.reset(); void load() } }
  return <div className="space-y-3"><h1 className="text-xl font-bold">Contractors</h1>{err && <p className="text-sm text-red-600">{err}</p>}
    <form onSubmit={add} className="card grid sm:grid-cols-5 gap-2"><input name="name" className="input" placeholder="Company" required/><input name="contact" className="input" placeholder="Contact person"/><input name="phone" className="input" placeholder="Phone"/><input name="spec" className="input" placeholder="Specialization"/><button className="btn">Add</button></form>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-slate-500"><th>Company</th><th>Contact</th><th>Phone</th><th>Specialization</th><th>Active</th><th>Reliability</th></tr></thead><tbody>
      {cs.map(c => <tr key={c.id} className="border-t"><td>{c.company_name}</td><td>{c.contact_person}</td><td>{c.phone}</td><td>{c.specialization}</td><td>{c.active ? 'Yes' : 'No'}</td><td>{(() => { const m = ms.filter(x => x.contractor_id === c.id), paid = m.filter(x => x.status === 'paid').length, bad = m.filter(x => x.status === 'disputed' || (x.status !== 'paid' && !!x.due_date && x.due_date < new Date().toISOString().slice(0, 10))).length; return paid + bad === 0 ? 'No history' : `${Math.round(paid / (paid + bad) * 100)}% (${paid} paid, ${bad} disputed or late)` })()}</td></tr>)}</tbody></table>{cs.length === 0 && <p className="p-3 text-slate-500">No contractors visible to your role.</p>}</div>
    <p className="text-xs text-slate-500">Contractor logins see only their own company and assigned work; this is enforced by database policies. Link a contractor user to a company by setting profiles.contractor_id in SQL.</p></div>
}
