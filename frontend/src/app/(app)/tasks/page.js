'use client'
import { useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { useAuth } from '@/lib/auth'
import { day } from '@/lib/format'
import { Badge, Empty, ErrorText, Loading, PageHeader } from '@/components/ui'

const STATUSES = ['To Do', 'In Progress', 'Completed', 'Blocked']
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']
const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : ''
const isOverdue = task => task.status !== 'Completed' && task.dueDate && new Date(task.dueDate).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)

export default function TasksPage() {
  const { user } = useAuth()
  const canManage = ['admin', 'project_manager'].includes(user.role)
  const canFilterAssignee = ['admin', 'project_manager', 'engineer'].includes(user.role)
  const [filters, setFilters] = useState({ q: '', status: '', priority: '', assignee: '', dueOn: '' })
  const [formOpen, setFormOpen] = useState(false), [editing, setEditing] = useState(null), [error, setError] = useState(null), [success, setSuccess] = useState(null)
  const query = useMemo(() => new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([, value]) => value))), [filters])
  const { data, error: loadError, loading, reload } = useLoad(() => api(`/tasks?${query}`), [query.toString()])
  usePolling(reload)
  const { data: options } = useLoad(async () => {
    if (!canFilterAssignee) return { users: [], projects: [] }
    const users = await api('/tasks/assignees')
    const projects = canManage ? await api('/projects') : { projects: [] }
    return { users: users.users, projects: projects.projects }
  }, [canFilterAssignee, canManage])

  async function save(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    values.dueDate = values.dueDate || null
    values.project = values.project || null
    if (!values.description) values.description = ''
    setError(null)
    setSuccess(null)
    try {
      if (editing) await api(`/tasks/${editing._id}`, { method: 'PATCH', body: values })
      else await api('/tasks', { method: 'POST', body: values })
      setEditing(null)
      setFormOpen(false)
      setSuccess(editing ? 'Task updated.' : 'Task created.')
      await reload()
    } catch (err) { setError(err.message) }
  }

  async function updateStatus(task, status) {
    setError(null)
    setSuccess(null)
    try {
      await api(`/tasks/${task._id}`, { method: 'PATCH', body: { status } })
      setSuccess(`“${task.title}” marked ${status.toLowerCase()}.`)
      await reload()
    } catch (err) { setError(err.message) }
  }

  function openEdit(task) {
    setEditing(task)
    setFormOpen(true)
    setError(null)
  }

  return <div className="space-y-4">
    <PageHeader title="Operations Tasks">
      {canManage && <button className="btn" onClick={() => { setEditing(null); setError(null); setFormOpen(open => !open) }}>New task</button>}
    </PageHeader>
    <p className="text-sm text-slate-500">Tasks are stored in the operations database. Overdue tasks have a due date before today and are not completed.</p>
    <ErrorText>{error || loadError}</ErrorText>
    {success && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>}

    {formOpen && canManage && <form key={editing?._id || 'new'} onSubmit={save} className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm font-medium">Task title<input className="input mt-1 w-full" name="title" defaultValue={editing?.title || ''} required minLength={2} maxLength={160} /></label>
      <label className="text-sm font-medium">Assigned user<select className="input mt-1 w-full" name="assignedTo" defaultValue={editing?.assignedTo?._id || ''} required><option value="">Select a user</option>{options?.users.map(person => <option key={person.id} value={person.id}>{person.name} ({person.role.replace('_', ' ')})</option>)}</select></label>
      <label className="text-sm font-medium">Related project (optional)<select className="input mt-1 w-full" name="project" defaultValue={editing?.project?._id || ''}><option value="">No project</option>{options?.projects.map(project => <option key={project._id} value={project._id}>{project.code} · {project.name}</option>)}</select></label>
      <label className="text-sm font-medium">Priority<select className="input mt-1 w-full" name="priority" defaultValue={editing?.priority || 'Medium'}>{PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select></label>
      <label className="text-sm font-medium">Due date<input className="input mt-1 w-full" type="date" name="dueDate" defaultValue={dateInput(editing?.dueDate)} /></label>
      {editing && <label className="text-sm font-medium">Status<select className="input mt-1 w-full" name="status" defaultValue={editing.status}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select></label>}
      <label className="text-sm font-medium sm:col-span-2 lg:col-span-3">Description<textarea className="input mt-1 min-h-20 w-full" name="description" defaultValue={editing?.description || ''} maxLength={2000} /></label>
      {!editing && <input type="hidden" name="status" value="To Do" />}
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><button className="btn">{editing ? 'Save changes' : 'Create task'}</button><button type="button" className="btn-ghost" onClick={() => { setFormOpen(false); setEditing(null) }}>Cancel</button></div>
    </form>}

    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {Object.entries({ Total: data?.summary.total, Pending: data?.summary.pending, Completed: data?.summary.completed, Blocked: data?.summary.blocked, Overdue: data?.summary.overdue }).map(([label, value]) =>
        <div className="card p-3" key={label}><p className="text-xs text-slate-500">{label}</p><p className={`text-2xl font-bold ${label === 'Overdue' && value ? 'text-bad' : ''}`}>{loading || !data ? '—' : value}</p></div>)}
    </div>

    <div className="card grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <input className="input" placeholder="Search tasks" value={filters.q} onChange={event => setFilters({ ...filters, q: event.target.value })} />
      <select className="input" value={filters.status} onChange={event => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>
      <select className="input" value={filters.priority} onChange={event => setFilters({ ...filters, priority: event.target.value })}><option value="">All priorities</option>{PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}</select>
      {canFilterAssignee ? <select className="input" value={filters.assignee} onChange={event => setFilters({ ...filters, assignee: event.target.value })}><option value="">All assignees</option>{options?.users.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select> : <div />}
      <input aria-label="Filter by due date" className="input" type="date" value={filters.dueOn} onChange={event => setFilters({ ...filters, dueOn: event.target.value })} />
    </div>

    {loading ? <Loading /> : data?.tasks.length ? <div className="space-y-3">{data.tasks.map(task => {
      const mine = String(task.assignedTo?._id) === String(user.id)
      const overdue = isOverdue(task)
      return <article className="card space-y-3" key={task._id}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><h2>{task.title}</h2><p className="mt-1 text-sm text-slate-500">{task.project ? `${task.project.code} · ${task.project.name}` : 'No related project'}</p></div>
          <div className="flex flex-wrap gap-2"><Badge text={task.priority} /><Badge text={task.status} /></div>
        </div>
        {task.description && <p className="whitespace-pre-wrap text-sm">{task.description}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm text-slate-600">
          <div>Assigned to <b>{task.assignedTo?.name || 'Unknown user'}</b> · Created {day(task.createdAt)} · Due <span className={overdue ? 'font-semibold text-bad' : ''}>{day(task.dueDate)}{overdue ? ' · OVERDUE' : ''}</span></div>
          <div className="flex flex-wrap gap-2">
            {(canManage || (mine && ['engineer', 'contractor'].includes(user.role))) && <select aria-label={`Update ${task.title} status`} className="input !w-auto" value={task.status} onChange={event => updateStatus(task, event.target.value)}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>}
            {canManage && <button className="btn-ghost" onClick={() => openEdit(task)}>Edit</button>}
          </div>
        </div>
      </article>
    })}</div> : <div className="card"><Empty>No tasks match these filters. Authorized users can create a task with “New task”.</Empty></div>}
  </div>
}
