const TONE = { ok: 'bg-green-100 text-green-800', warn: 'bg-amber/25 text-amber-900', bad: 'bg-red-100 text-red-800', info: 'bg-blue-100 text-blue-800' }
export function statusTone(s) {
  const k = String(s).toLowerCase()
  if (['completed', 'approved', 'connected to grid', 'paid', 'approved_for_payment'].includes(k)) return 'ok'
  if (['on hold', 'blocked', 'rejected', 'disputed'].includes(k)) return 'bad'
  if (['draft', 'planning', 'permitting', 'submitted', 'under review', 'not started', 'pending_verification', 'pending_approval', 'awaiting_evidence'].includes(k)) return 'warn'
  return 'info'
}
export const Badge = ({ text, tone }) => <span className={`badge ${TONE[tone || statusTone(text)]}`}>{String(text).replace(/_/g, ' ')}</span>
export function Progress({ value }) {
  const v = Math.min(100, Math.max(0, value || 0)), c = v < 40 ? '#F4B942' : v >= 85 ? '#1E9E5A' : '#2878D0'
  return <div className="flex items-center gap-2"><div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200/70"><div className="h-full rounded-full" style={{ width: v + '%', background: c }} /></div><span className="w-10 text-right text-xs text-slate-600">{v}%</span></div>
}
export const PageHeader = ({ title, children }) => <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1>{title}</h1><div className="flex gap-2">{children}</div></div>
export const ErrorText = ({ children }) => (children ? <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p> : null)
export const Empty = ({ children }) => <p className="p-4 text-sm text-slate-500">{children}</p>
export const Loading = () => <p className="p-4 text-sm text-slate-500">Loading…</p>
export const SunLogo = ({ size = 28 }) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6" fill="#F4B942" />{Array.from({ length: 8 }, (_, i) => <line key={i} x1="16" y1="3" x2="16" y2="7" stroke="#F4B942" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 45} 16 16)`} />)}</svg>
