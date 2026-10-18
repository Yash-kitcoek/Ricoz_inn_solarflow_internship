import { useEffect, useState } from 'react'
import { pending, flushQueue } from '../lib/offline'
export default function SyncBadge() {
  const [online, setOnline] = useState(navigator.onLine), [n, setN] = useState(0), [fails, setFails] = useState<string[]>([])
  const refresh = async () => { try { setN((await pending()).length) } catch { setN(0) } }
  const sync = async () => { const r = await flushQueue(); setFails(r.failed); void refresh() }
  useEffect(() => { void refresh(); void sync(); const on = () => { setOnline(true); void sync() }, off = () => setOnline(false), t = setInterval(() => void refresh(), 5000)
    window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t) } }, [])
  if (online && n === 0 && fails.length === 0) return null
  return <span role="status" title={fails.join('\n')} className={`badge ${!online ? 'bg-slate-200 text-slate-800' : fails.length ? 'bg-red-100 text-red-800' : 'bg-amber/25 text-amber-900'}`}>
    {!online ? `Offline${n ? ` · ${n} waiting` : ''}` : fails.length ? `${fails.length} failed to sync` : `Syncing ${n}…`}</span>
}
