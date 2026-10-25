'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { day } from '@/lib/format'
import { Badge, Empty, ErrorText, Loading, Progress, PageHeader } from '@/components/ui'

export default function CustomerDashboard() {
  const { data, error, loading, reload } = useLoad(() => api('/customer/overview'), [])
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  usePolling(reload)

  async function submitRequest(event) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    setFormError(null)
    setSuccess(null)
    setSaving(true)
    try {
      await api('/customer/requests', { method: 'POST', body: payload })
      form.reset()
      setSuccess('Your request was sent to the operations team.')
      await reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) return <Loading />
  if (!data) return <div><ErrorText>{error}</ErrorText><button className="btn" onClick={reload}>Retry</button></div>

  return <div className="space-y-5">
    <PageHeader title="My Solar Projects"><button className="btn-ghost" onClick={reload}>Refresh</button></PageHeader>
    <ErrorText>{error}</ErrorText>
    {data.projects.length ? data.projects.map(project => <section className="space-y-4" key={project._id}>
      <div className="card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-xs text-slate-500">{project.code}</p><h2>{project.name}</h2><p className="mt-1 text-sm text-slate-600">{project.type} · {project.capacityKw} kW</p></div>
          <Badge text={project.status} />
        </div>
        <Progress value={project.progress} />
        <p className="text-sm text-slate-600">Estimated completion: {day(project.endDate)}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card"><h3 className="mb-2">Pending customer actions</h3>
          {project.customerActions?.length ? <ul className="list-inside list-disc space-y-1 text-sm">{project.customerActions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <Empty>No pending actions.</Empty>}
        </div>
        <div className="card"><h3 className="mb-2">Required documents</h3>
          {project.requiredDocuments?.length ? <ul className="list-inside list-disc space-y-1 text-sm">{project.requiredDocuments.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <Empty>No required documents listed.</Empty>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card"><h3 className="mb-2">Permits</h3>{project.permits.length ? project.permits.map(item => <div className="border-t py-2 text-sm first:border-0" key={item._id}><p className="font-medium">{item.title}</p><div className="mt-1 flex items-center justify-between"><Badge text={item.status} /><span className="text-xs text-slate-500">Due {day(item.dueDate)}</span></div></div>) : <Empty>No permit updates yet.</Empty>}</div>
        <div className="card"><h3 className="mb-2">Net metering</h3>{project.netMetering.length ? project.netMetering.map(item => <div className="border-t py-2 text-sm first:border-0" key={item._id}><p className="font-medium">{item.utility}</p><div className="mt-1"><Badge text={item.status} /></div></div>) : <Empty>No net-metering applications yet.</Empty>}</div>
        <div className="card"><h3 className="mb-2">Installation milestones</h3>{project.milestones.length ? project.milestones.map(item => <div className="border-t py-2 text-sm first:border-0" key={item._id}><p className="font-medium">{item.description}</p><div className="mt-1 flex items-center justify-between"><Badge text={item.status} /><span className="text-xs text-slate-500">Due {day(item.dueDate)}</span></div></div>) : <Empty>No milestones listed yet.</Empty>}</div>
      </div>
    </section>) : <div className="card"><h2>No project is linked to your account yet</h2><p className="mt-1 text-sm text-slate-600">The operations team must assign a project to your account before project details are available.</p></div>}

    <div className="grid gap-4 lg:grid-cols-2">
      <form className="card space-y-3" onSubmit={submitRequest}>
        <div><h2>Contact operations</h2><p className="text-sm text-slate-600">Send a support request about one of your linked projects.</p></div>
        <ErrorText>{formError}</ErrorText>
        {success && <p role="status" className="text-sm text-green-700">{success}</p>}
        <label className="block text-sm font-medium">Project<select className="input mt-1 w-full" name="project" required disabled={!data.projects.length}><option value="">Select a project</option>{data.projects.map(project => <option key={project._id} value={project._id}>{project.code} · {project.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Subject<input className="input mt-1 w-full" name="subject" minLength={3} maxLength={160} required /></label>
        <label className="block text-sm font-medium">Message<textarea className="input mt-1 w-full" name="message" minLength={5} maxLength={4000} rows={4} required /></label>
        <button className="btn" disabled={saving || !data.projects.length}>{saving ? 'Sending…' : 'Send request'}</button>
      </form>

      <div className="card"><h2 className="mb-2">My support requests</h2>
        {data.requests.length ? <div className="space-y-3">{data.requests.map(request => <article className="rounded-lg border border-slate-200 p-3" key={request._id}>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3>{request.subject}</h3><Badge text={request.status} /></div>
          <p className="mt-1 text-sm text-slate-600">{request.project?.code} · {request.project?.name}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{request.message}</p>
          {request.response && <p className="mt-2 rounded bg-blue-50 p-2 text-sm"><b>Operations response:</b> {request.response}</p>}
          <p className="mt-2 text-xs text-slate-500">Updated {day(request.updatedAt)}</p>
        </article>)}</div> : <Empty>No support requests yet.</Empty>}
      </div>
    </div>
    {loading && <p role="status" className="text-xs text-slate-500">Refreshing project updates…</p>}
  </div>
}
