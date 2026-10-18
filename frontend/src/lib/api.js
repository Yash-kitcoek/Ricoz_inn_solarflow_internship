// Thin fetch wrapper. Errors carry the server's message so pages can show it as-is.
export async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch('/api' + path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: form ?? (body ? JSON.stringify(body) : undefined) })
  const data = await res.json().catch(() => null)
  if (!res.ok) { const e = new Error(data?.details?.length ? `${data.error}: ${data.details.map(d => d.message).join('; ')}` : data?.error || `Request failed (${res.status})`); e.status = res.status; throw e }
  return data
}
