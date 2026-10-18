import { useEffect, useState } from 'react'
import { listRejections } from '../lib/api6'
import { insights, type Rej } from '../lib/equipment'
export default function RejectionInsights() {
  const [rows, setRows] = useState<Rej[]>([])
  useEffect(() => { void listRejections().then(r => setRows(r.data)) }, [])
  const g = insights(rows)
  return <div className="card"><h2 className="mb-2">Common rejection reasons by authority</h2>
    {g.length === 0 ? <p className="text-sm text-slate-500">No rejections logged yet. Log each rejection on the Rejections page and this builds up from your own history.</p>
      : g.map(x => <div key={x.authority} className="border-t py-2 text-sm first:border-0"><b>{x.authority}</b> <span className="text-slate-500">({x.total} logged)</span>
        <div className="mt-1 flex flex-wrap gap-1">{x.top.map(([c, n]) => <span key={c} className="badge bg-amber/25 text-amber-900">{c}: {n} of {x.total}</span>)}</div></div>)}
    <p className="mt-2 text-xs text-slate-500">Counts come only from rejections recorded in this account, so small numbers prove little.</p></div>
}
