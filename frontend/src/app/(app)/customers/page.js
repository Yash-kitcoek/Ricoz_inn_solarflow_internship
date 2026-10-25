'use client'
import { useState } from 'react'
import { api } from '@/lib/api'
import { useLoad } from '@/lib/hooks'
import { usePolling } from '@/lib/usePolling'
import { useAuth } from '@/lib/auth'
import { Badge, Empty, ErrorText, Loading, PageHeader } from '@/components/ui'
import { day } from '@/lib/format'

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

export default function Customers() {
  const { user } = useAuth()
  const { data, error, loading, reload } = useLoad(async () => {
    const requestResult = await api('/support-requests')
    if (user.role !== 'admin') return { customers: [], requests: requestResult.requests }
    const customerResult = await api('/users/customers')
    return { customers: customerResult.customers, requests: requestResult.requests }
  }, [user?.role])
  const [formError, setFormError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [requestQuery, setRequestQuery] = useState('')
  usePolling(reload)

  async function createCustomer(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setFormError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const form = Object.fromEntries(new FormData(formElement))
      await api('/users/customers', { method: 'POST', body: form })
      formElement.reset()
      setSuccess('Customer account created.')
      await reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function updateRequest(event, request) {
    event.preventDefault()
    setFormError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const form = Object.fromEntries(new FormData(event.currentTarget))
      await api(`/support-requests/${request._id}`, { method: 'PATCH', body: form })
      setSuccess('Support request updated.')
      await reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }

    async function updateCustomer(event, customer) {
      event.preventDefault()
      setFormError(null)
      setSuccess(null)
      setSaving(true)
      try {
        const form = Object.fromEntries(new FormData(event.currentTarget))
        if (!form.password) delete form.password
        await api(`/users/${customer.id}`, { method: 'PATCH', body: form })
        setSuccess('Customer account updated.')
        await reload()
      } catch (err) {
        setFormError(err.message)
      } finally {
        setSaving(false)
      }
    }
  }

  if (loading && !data) return <Loading />
  if (!data) return <div><ErrorText>{error}</ErrorText><button className="btn" onClick={reload}>Retry</button></div>

  const customers = data.customers.filter(customer => `${customer.name} ${customer.email}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="space-y-5">
    <PageHeader title="Customers & Requests"><button className="btn-ghost" onClick={reload}>Refresh</button></PageHeader>
    <ErrorText>{formError || error}</ErrorText>
    {success && <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p>}

    <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
      {user.role === 'admin' && <form className="card space-y-3" onSubmit={createCustomer}>
        <div><h2>Create customer account</h2><p className="text-sm text-slate-600">The customer can sign in with this email and password.</p></div>
        <label className="block text-sm font-medium">Name<input className="input mt-1 w-full" name="name" minLength={2} maxLength={100} required /></label>
        <label className="block text-sm font-medium">Email<input className="input mt-1 w-full" name="email" type="email" maxLength={200} required /></label>
        <label className="block text-sm font-medium">Temporary password<input className="input mt-1 w-full" name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required /></label>
        <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Create customer'}</button>
      </form>}

      {user.role === 'admin' && <section className="card overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2>Customer accounts</h2><input className="input !w-56" aria-label="Search customers" placeholder="Search name or email" value={query} onChange={event => setQuery(event.target.value)} /></div>
        {customers.length ? <table><thead><tr><th>Customer account</th><th>Linked projects</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id}><td>
          <form className="min-w-56 space-y-2" onSubmit={event => updateCustomer(event, customer)}>
            <input className="input" name="name" aria-label={`Name for ${customer.email}`} defaultValue={customer.name} minLength={2} maxLength={100} required />
            <input className="input" name="email" aria-label={`Email for ${customer.name}`} type="email" defaultValue={customer.email} maxLength={200} required />
            <input className="input" name="password" aria-label={`Reset password for ${customer.name}`} type="password" minLength={8} maxLength={72} placeholder="New password (optional)" autoComplete="new-password" />
            <button className="btn-ghost !px-2 !py-1 text-xs" disabled={saving}>Save customer</button>
          </form>
        </td><td>{customer.projects.length ? customer.projects.map(project => <p className="mb-1 text-sm" key={project.id}>{project.code} · {project.name} · {project.progress}%</p>) : <span className="text-xs text-slate-500">Not assigned</span>}</td></tr>)}</tbody></table> : <Empty>No customer accounts match.</Empty>}
      </section>}
    </div>

    <section className="card"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2>Support requests</h2><div className="flex items-center gap-2"><input className="input !w-56" aria-label="Search support requests" placeholder="Search requests" value={requestQuery} onChange={event => setRequestQuery(event.target.value)} /><span className="text-sm text-slate-500">{data.requests.length} total</span></div></div>
      {data.requests.filter(request => `${request.subject} ${request.message} ${request.customer?.name} ${request.customer?.email} ${request.project?.name} ${request.status}`.toLowerCase().includes(requestQuery.toLowerCase())).length ? <div className="space-y-4">{data.requests.filter(request => `${request.subject} ${request.message} ${request.customer?.name} ${request.customer?.email} ${request.project?.name} ${request.status}`.toLowerCase().includes(requestQuery.toLowerCase())).map(request => <article className="rounded-xl border border-slate-200 p-4" key={`${request._id}:${request.updatedAt}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3>{request.subject}</h3><p className="text-sm text-slate-600">{request.customer?.name} · {request.customer?.email}</p><p className="text-xs text-slate-500">{request.project?.code} · {request.project?.name} · {day(request.createdAt)}</p></div><Badge text={request.status} /></div>
        <p className="mt-3 whitespace-pre-wrap text-sm">{request.message}</p>
        <form className="mt-3 grid gap-2 md:grid-cols-[12rem_1fr_auto]" onSubmit={event => updateRequest(event, request)}>
          <label className="sr-only" htmlFor={`status-${request._id}`}>Request status</label>
          <select className="input" id={`status-${request._id}`} name="status" defaultValue={request.status}>{STATUSES.map(status => <option key={status}>{status}</option>)}</select>
          <textarea className="input" name="response" rows={2} maxLength={2000} defaultValue={request.response} placeholder="Customer-visible response" aria-label="Customer-visible response" />
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Update request'}</button>
        </form>
      </article>)}</div> : <Empty>No customer support requests.</Empty>}
    </section>
    {loading && <p role="status" className="text-xs text-slate-500">Checking for new requests…</p>}
  </div>
}
