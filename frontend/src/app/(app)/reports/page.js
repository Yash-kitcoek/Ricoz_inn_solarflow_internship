'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { useAuth } from '@/lib/auth'
import { day } from '@/lib/format'
import { Empty, ErrorText, Loading, PageHeader } from '@/components/ui'

const localDate = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
const canFilterAssignee = role => ['admin', 'project_manager', 'engineer'].includes(role)

export default function DailyReportsPage() {
  const { user } = useAuth(), staff = canFilterAssignee(user.role)
  const [date, setDate] = useState(localDate), [assignee, setAssignee] = useState(''), [note, setNote] = useState(''), [project, setProject] = useState(''), [error, setError] = useState(null), [success, setSuccess] = useState(null)
  const params = new URLSearchParams({ date, ...(assignee && staff ? { assignee } : {}) })
  const { data, error: loadError, loading, reload } = useLoad(() => api(`/reports/daily?${params}`), [params.toString()])
  const { data: options } = useLoad(async () => {
    if (!staff) return { users: [], projects: [] }
    const [users, projects] = await Promise.all([api('/tasks/assignees'), api('/projects')])
    return { users: users.users, projects: projects.projects }
  }, [staff])

  async function saveNote(event) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    try {
      await api('/reports/daily/notes', { method: 'POST', body: { date, note, project: project || null } })
      setNote('')
      setSuccess('Operational note saved.')
      await reload()
    } catch (err) { setError(err.message) }
  }

  function downloadCsv() {
    const query = new URLSearchParams({ date, ...(assignee && staff ? { assignee } : {}) })
    window.location.assign(`/api/reports/daily.csv?${query}`)
  }

  return <div className="space-y-4 print:space-y-2">
    <PageHeader title="Daily Operations Report">
      <button className="btn-ghost print:hidden" onClick={downloadCsv}>Download CSV</button>
      <button className="btn print:hidden" onClick={() => window.print()}>Print report</button>
    </PageHeader>
    <div className="card grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Report date<input className="input mt-1 w-full" type="date" value={date} onChange={event => setDate(event.target.value)} /></label>
      {staff && <label className="text-sm font-medium">Assigned user<select className="input mt-1 w-full" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">All users in your access scope</option>{options?.users.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>}
    </div>
    <p className="text-xs text-slate-500">Task status groups use the saved status history as of the selected date. Completed tasks are counted when they were marked complete on that date. Times are evaluated using UTC calendar days.</p>
    <ErrorText>{error || loadError}</ErrorText>
    {success && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 print:hidden">{success}</p>}
    {loading ? <Loading /> : data && <>
      <div className="card flex flex-wrap items-center justify-between gap-2"><h2>Report for {new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-IN', { timeZone: 'UTC', dateStyle: 'long' })}</h2><span className="text-xs text-slate-500">{data.taskRecords} task records in your access scope</span></div>
      {!data.dataAvailable && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">No task data is available in your access scope. Empty metrics below do not imply that tasks were completed.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Completed on date', data.metrics.completed], ['Pending at end of date', data.metrics.pending], ['Overdue at end of date', data.metrics.overdue], ['Blocked at end of date', data.metrics.blocked]].map(([label, value]) =>
          <div className="card p-3" key={label}><p className="text-xs text-slate-500">{label}</p><p className={`text-2xl font-bold ${label.startsWith('Overdue') && value ? 'text-bad' : ''}`}>{value}</p></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[['Tasks completed on this date', data.completedTasks], ['Pending tasks at end of date', data.pendingTasks], ['Overdue tasks at end of date', data.overdueTasks], ['Blocked tasks at end of date', data.blockedTasks]].map(([title, tasks]) =>
          <section className="card" key={title}><h2 className="mb-2">{title} <span className="text-sm font-normal text-slate-500">({tasks.length})</span></h2>
            {tasks.length ? <ul className="divide-y">{tasks.map(task => <li className="py-2 text-sm" key={`${title}-${task._id}`}><b>{task.title}</b><div className="text-slate-500">{task.project ? `${task.project.code} · ${task.project.name}` : 'No project'} · {task.assignedTo?.name} · {task.status}{task.dueDate ? ` · Due ${day(task.dueDate)}` : ''}</div>{task.description && <p className="mt-1 whitespace-pre-wrap">{task.description}</p>}</li>)}</ul> : <Empty>No task records in this category.</Empty>}
          </section>)}
      </div>
      <section className="card"><h2 className="mb-2">Operational issues & follow-up notes</h2>
        {data.notes.length ? <ul className="mb-3 divide-y">{data.notes.map(item => <li className="py-2 text-sm" key={item._id}><p className="whitespace-pre-wrap">{item.note}</p><p className="mt-1 text-xs text-slate-500">{item.createdBy?.name} · {item.project ? `${item.project.code} ${item.project.name} · ` : ''}{day(item.createdAt)}</p></li>)}</ul> : <Empty>No operational notes for this date.</Empty>}
        {staff && <form onSubmit={saveNote} className="grid gap-2 border-t pt-3 sm:grid-cols-[1fr_2fr_auto] print:hidden">
          <select aria-label="Related project" className="input" value={project} onChange={event => setProject(event.target.value)}><option value="">No project</option>{options?.projects.map(item => <option key={item._id} value={item._id}>{item.code} · {item.name}</option>)}</select>
          <textarea className="input min-h-12" value={note} onChange={event => setNote(event.target.value)} placeholder="Operational issue or follow-up action" required minLength={2} maxLength={2000} />
          <button className="btn">Save note</button>
        </form>}
      </section>
    </>}
  </div>
}
