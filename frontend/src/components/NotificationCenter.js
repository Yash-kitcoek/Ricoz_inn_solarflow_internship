'use client'
import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { day } from '@/lib/format'
import { ErrorText } from './ui'
import { usePolling } from '@/lib/usePolling'

export default function NotificationCenter() {
  const [open, setOpen] = useState(false), [actionError, setActionError] = useState(null)
  const { data, error, loading, reload } = useLoad(() => api('/notifications'), [])

  usePolling(reload)

  async function markRead(id) {
    setActionError(null)
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' })
      await reload()
    } catch (err) { setActionError(err.message) }
  }

  async function markAllRead() {
    setActionError(null)
    try {
      await api('/notifications/read-all', { method: 'POST' })
      await reload()
    } catch (err) { setActionError(err.message) }
  }

  return <div className="relative">
    <button className="btn-ghost relative !px-2" aria-label={`Notifications, ${data?.unreadCount ?? 0} unread`} aria-expanded={open} onClick={() => { setOpen(value => !value); if (!open) reload() }}>
      <Bell size={18} />
      {data?.unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}
    </button>
    {open && <section className="absolute right-0 top-11 z-50 w-[min(92vw,24rem)] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl">
      <header className="mb-2 flex items-center justify-between gap-2"><h2 className="text-base">Notifications</h2>{data?.unreadCount > 0 && <button className="btn-ghost !px-2 !py-1 text-xs" onClick={markAllRead}><CheckCheck size={14} /> Mark all read</button>}</header>
      <ErrorText>{actionError || error}</ErrorText>
      <div className="max-h-[65vh] space-y-2 overflow-y-auto">
        {loading && !data ? <p className="p-2 text-sm text-slate-500">Loading notifications…</p>
          : data?.notifications.length ? data.notifications.map(item => <article className={`rounded-lg border p-2 ${item.readAt ? 'border-slate-100 bg-slate-50' : 'border-blue-200 bg-blue-50'}`} key={item._id}>
            <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-xs text-slate-600">{item.message}</p>{item.task && <p className="mt-1 text-xs text-slate-500">Task: {item.task.title}</p>}{item.project && <p className="mt-1 text-xs text-slate-500">Project: {item.project.code} {item.project.name}</p>}<p className="mt-1 text-[11px] text-slate-400">{day(item.createdAt)}</p></div>
              {!item.readAt && <button className="btn-ghost shrink-0 !px-2 !py-1 text-xs" onClick={() => markRead(item._id)}>Mark read</button>}</div>
          </article>)
            : <p className="p-2 text-sm text-slate-500">No notifications yet.</p>}
      </div>
    </section>}
  </div>
}
