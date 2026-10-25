export async function api(path, { method = 'GET', body, form } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body))
  })
  const contentType = response.headers.get('content-type') || ''
  const result = contentType.includes('application/json') ? await response.json() : null

  if (!response.ok) {
    const error = new Error(result?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return result
}
